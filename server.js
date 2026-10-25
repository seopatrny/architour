/* Skyline Quest server: serves the game and keeps one shared leaderboard
 * for every iPad in the school. No dependencies – just `node server.js`.
 *
 * Environment variables:
 *   PORT       port to listen on (default 3000)
 *   ADMIN_KEY  password for the teacher page at /admin.html (admin is off if unset)
 *   DATA_DIR   where db.json is stored (default ./data)
 *   TIME_ZONE  used for the "Today" leaderboard (default America/Chicago)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Names = require('./public/js/names.js');

const PUBLIC_DIR = path.join(__dirname, 'public');
const MODES = ['classic', 'blitz', 'survival'];
const MAX_SCORE = 200000;
const MAX_SCORES_KEPT = 50000;
const AVATARS = /^[\p{Extended_Pictographic}‍️]{1,8}$/u;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
};

function createServer(opts = {}) {
  const adminKey = opts.adminKey != null ? opts.adminKey : process.env.ADMIN_KEY || '';
  const dataDir = opts.dataDir || process.env.DATA_DIR || path.join(__dirname, 'data');
  const timeZone = opts.timeZone || process.env.TIME_ZONE || 'America/Chicago';
  const dbFile = path.join(dataDir, 'db.json');

  let db = { players: {}, scores: [] };
  try {
    db = Object.assign(db, JSON.parse(fs.readFileSync(dbFile, 'utf8')));
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('Could not read', dbFile, e.message);
  }

  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 250);
  }
  function flush() {
    clearTimeout(saveTimer);
    fs.mkdirSync(dataDir, { recursive: true });
    const tmp = dbFile + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, dbFile);
  }

  const dayKey = (ts) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(ts));

  function publicPlayer(p) {
    if (!p) return null;
    const { key, name, avatar, xp, games, mastery, achievements, dexViewed, best, created } = p;
    return { key, name, avatar, xp, games, mastery, achievements, dexViewed, best, created };
  }

  function newPlayer(name, avatar) {
    return {
      key: Names.keyOf(name), name, avatar, xp: 0, games: 0, mastery: {}, achievements: [], dexViewed: [],
      best: {}, created: Date.now(), updated: Date.now(),
    };
  }

  function mergeProgress(p, body) {
    if (typeof body.avatar === 'string' && AVATARS.test(body.avatar)) p.avatar = body.avatar;
    if (body.mastery && typeof body.mastery === 'object') {
      for (const [id, v] of Object.entries(body.mastery).slice(0, 100)) {
        if (!/^[a-z0-9]{2,20}$/.test(id)) continue;
        const n = Math.max(0, Math.min(5, Math.floor(Number(v) || 0)));
        p.mastery[id] = Math.max(p.mastery[id] || 0, n);
      }
    }
    const union = (a, b) => [...new Set([...(a || []), ...(Array.isArray(b) ? b : [])])]
      .filter((s) => typeof s === 'string' && /^[a-z0-9_]{1,24}$/.test(s)).slice(0, 100);
    p.achievements = union(p.achievements, body.achievements);
    p.dexViewed = union(p.dexViewed, body.dexViewed);
    p.updated = Date.now();
  }

  function leaderboard(mode, range, limit = 20) {
    const now = Date.now();
    if (mode === 'masters') {
      return Object.values(db.players)
        .map((p) => ({ key: p.key, name: p.name, avatar: p.avatar, score: Object.values(p.mastery).filter((v) => v >= 3).length, xp: p.xp }))
        .filter((r) => r.score > 0 || r.xp > 0)
        .sort((a, b) => b.score - a.score || b.xp - a.xp)
        .slice(0, limit);
    }
    const today = dayKey(now);
    const best = new Map();
    for (const s of db.scores) {
      if (s.mode !== mode) continue;
      if (range === 'today' && dayKey(s.ts) !== today) continue;
      if (range === 'week' && now - s.ts > 7 * 864e5) continue;
      const cur = best.get(s.key);
      if (!cur || s.score > cur.score) best.set(s.key, s);
    }
    return [...best.values()]
      .filter((s) => db.players[s.key])
      .sort((a, b) => b.score - a.score || a.ts - b.ts)
      .slice(0, limit)
      .map((s) => ({ key: s.key, name: db.players[s.key].name, avatar: db.players[s.key].avatar, score: s.score, ts: s.ts }));
  }

  function rankOf(mode, range, key) {
    const i = leaderboard(mode, range, 1000).findIndex((r) => r.key === key);
    return i < 0 ? null : i + 1;
  }

  function isAdmin(req) {
    const got = String(req.headers['x-admin-key'] || '');
    if (!adminKey || !got) return false;
    const a = Buffer.from(got), b = Buffer.from(adminKey);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  function send(res, status, obj) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(obj));
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > 32 * 1024) { reject(new Error('too big')); req.destroy(); } else chunks.push(c);
      });
      req.on('end', () => {
        try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(e); }
      });
      req.on('error', reject);
    });
  }

  async function api(req, res, url) {
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent); // ['api', ...]
    const m = req.method;

    if (parts[1] === 'health' && m === 'GET') return send(res, 200, { ok: true, admin: !!adminKey });

    if (parts[1] === 'leaderboard' && m === 'GET') {
      const mode = url.searchParams.get('mode') || 'classic';
      const range = url.searchParams.get('range') || 'all';
      if (![...MODES, 'masters'].includes(mode) || !['today', 'week', 'all'].includes(range)) return send(res, 400, { error: 'bad mode or range' });
      return send(res, 200, { mode, range, rows: leaderboard(mode, range) });
    }

    if (parts[1] === 'players' && parts[2]) {
      const key = Names.keyOf(parts[2]);
      if (m === 'GET') {
        const p = db.players[key];
        return p ? send(res, 200, { player: publicPlayer(p) }) : send(res, 404, { error: 'not found' });
      }
      if (m === 'PUT') {
        const body = await readBody(req);
        let p = db.players[key];
        if (!p) {
          const c = Names.check(body.name || parts[2]);
          if (!c.ok || c.key !== key) return send(res, 400, { error: c.reason || 'bad name' });
          if (typeof body.avatar !== 'string' || !AVATARS.test(body.avatar)) return send(res, 400, { error: 'bad avatar' });
          p = db.players[key] = newPlayer(c.name, body.avatar);
        }
        mergeProgress(p, body);
        save();
        return send(res, 200, { player: publicPlayer(p) });
      }
    }

    if (parts[1] === 'scores' && m === 'POST') {
      const body = await readBody(req);
      const key = Names.keyOf(body.name);
      const p = db.players[key];
      const score = Math.floor(Number(body.score));
      if (!p) return send(res, 404, { error: 'unknown player' });
      if (!MODES.includes(body.mode)) return send(res, 400, { error: 'bad mode' });
      if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) return send(res, 400, { error: 'bad score' });
      const prevBest = p.best[body.mode] || 0;
      db.scores.push({ key, mode: body.mode, score, ts: Date.now() });
      if (db.scores.length > MAX_SCORES_KEPT) db.scores.splice(0, db.scores.length - MAX_SCORES_KEPT);
      p.xp += score;
      p.games += 1;
      p.best[body.mode] = Math.max(prevBest, score);
      mergeProgress(p, body);
      save();
      return send(res, 200, {
        player: publicPlayer(p),
        newBest: score > prevBest,
        ranks: { today: rankOf(body.mode, 'today', key), week: rankOf(body.mode, 'week', key), all: rankOf(body.mode, 'all', key) },
      });
    }

    if (parts[1] === 'admin') {
      if (!isAdmin(req)) return send(res, 403, { error: adminKey ? 'wrong key' : 'admin disabled: set ADMIN_KEY' });
      if (parts[2] === 'players' && !parts[3] && m === 'GET') {
        const rows = Object.values(db.players).map((p) => ({
          ...publicPlayer(p), mastered: Object.values(p.mastery).filter((v) => v >= 3).length, updated: p.updated,
        }));
        return send(res, 200, { players: rows.sort((a, b) => b.xp - a.xp) });
      }
      if (parts[2] === 'players' && parts[3] && m === 'DELETE') {
        const key = Names.keyOf(parts[3]);
        delete db.players[key];
        db.scores = db.scores.filter((s) => s.key !== key);
        save();
        return send(res, 200, { ok: true });
      }
      if (parts[2] === 'scores' && m === 'DELETE') {
        const mode = url.searchParams.get('mode');
        db.scores = mode ? db.scores.filter((s) => s.mode !== mode) : [];
        if (!mode) for (const p of Object.values(db.players)) p.best = {};
        else for (const p of Object.values(db.players)) delete p.best[mode];
        save();
        return send(res, 200, { ok: true });
      }
      if (parts[2] === 'everything' && m === 'DELETE') {
        db = { players: {}, scores: [] };
        save();
        return send(res, 200, { ok: true });
      }
    }
    send(res, 404, { error: 'not found' });
  }

  function serveStatic(req, res, url) {
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.normalize(path.join(PUBLIC_DIR, rel));
    if (!file.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); return res.end(); }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': ext === '.html' || ext === '.js' || ext === '.css' ? 'no-cache' : 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    });
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    try {
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
      serveStatic(req, res, url);
    } catch (e) {
      send(res, 400, { error: 'bad request' });
    }
  });
  server.flush = flush;
  return server;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const server = createServer();
  server.listen(port, () => {
    console.log(`🏙️  Skyline Quest is running at http://localhost:${port}`);
    if (!process.env.ADMIN_KEY) console.log('   (Teacher admin page is off. Set ADMIN_KEY to turn it on.)');
  });
  const stop = () => { server.flush(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

module.exports = { createServer };
