/* Skyline Quest API – shared by the Vercel function (api/index.js)
 * and the stand-alone server (local/server.js).
 *
 * Data layout (Redis-style):
 *   skyq:players                  hash   player key → player JSON
 *   skyq:lb:<mode>:all            zset   player key → best score ever
 *   skyq:lb:<mode>:d:<YYYY-MM-DD> zset   player key → best score that day (expires after 9 days)
 *   skyq:lb:masters               zset   player key → mastered * 1e9 + xp */
const crypto = require('crypto');
const Names = require('../public/js/names.js');

const MODES = ['classic', 'blitz', 'survival'];
const MAX_SCORE = 200000;
const MASTERED = 3;
const AVATARS = /^[\p{Extended_Pictographic}‍️]{1,8}$/u;
const PLAYERS = 'skyq:players';
const MASTERS = 'skyq:lb:masters';
const DAY_TTL = 9 * 86400;

function createApp({ store, storageError, adminKey = '', timeZone = 'America/Chicago' }) {
  const dayKey = (ts) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(ts));
  const lbKey = (mode, day) => (day ? `skyq:lb:${mode}:d:${day}` : `skyq:lb:${mode}:all`);
  const weekDays = () => [...new Set([0, 1, 2, 3, 4, 5, 6].map((i) => dayKey(Date.now() - i * 864e5)))];
  const masteredCount = (p) => Object.values(p.mastery || {}).filter((v) => v >= MASTERED).length;
  const pairs = (flat) => { const out = []; for (let i = 0; i < flat.length; i += 2) out.push([flat[i], Number(flat[i + 1])]); return out; };

  function publicPlayer(p) {
    const { key, name, avatar, xp, games, mastery, achievements, dexViewed, best, created } = p;
    return { key, name, avatar, xp, games, mastery, achievements, dexViewed, best, created };
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

  async function getPlayer(key) {
    const [v] = await store.run([['HGET', PLAYERS, key]]);
    return v ? JSON.parse(v) : null;
  }

  function savePlayerCmds(p) {
    const cmds = [['HSET', PLAYERS, p.key, JSON.stringify(p)]];
    const m = masteredCount(p);
    if (m > 0 || p.xp > 0) cmds.push(['ZADD', MASTERS, m * 1e9 + Math.min(p.xp, 999999999), p.key]);
    return cmds;
  }

  // [[playerKey, score], ...] best first
  async function ranked(mode, range, limit) {
    if (mode === 'masters') return pairs(await store.run([['ZREVRANGE', MASTERS, 0, limit - 1, 'WITHSCORES']]).then((r) => r[0]));
    if (range === 'week') {
      const keys = weekDays().map((d) => lbKey(mode, d));
      const [flat] = await store.run([['ZUNION', keys.length, ...keys, 'AGGREGATE', 'MAX', 'WITHSCORES']]);
      return pairs(flat).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : -1)).slice(0, limit);
    }
    const key = lbKey(mode, range === 'today' ? dayKey(Date.now()) : null);
    return pairs((await store.run([['ZREVRANGE', key, 0, limit - 1, 'WITHSCORES']]))[0]);
  }

  async function leaderboard(mode, range, limit = 20) {
    const rows = await ranked(mode, range, limit);
    if (!rows.length) return [];
    const [players] = await store.run([['HMGET', PLAYERS, ...rows.map(([k]) => k)]]);
    return rows.map(([key, score], i) => {
      if (!players[i]) return null;
      const p = JSON.parse(players[i]);
      return mode === 'masters'
        ? { key, name: p.name, avatar: p.avatar, score: Math.floor(score / 1e9), xp: p.xp }
        : { key, name: p.name, avatar: p.avatar, score };
    }).filter(Boolean);
  }

  async function ranksFor(mode, key) {
    const today = dayKey(Date.now());
    const [t, a] = await store.run([['ZREVRANK', lbKey(mode, today), key], ['ZREVRANK', lbKey(mode), key]]);
    const week = (await ranked(mode, 'week', 100000)).findIndex(([k]) => k === key);
    return { today: t == null ? null : t + 1, week: week < 0 ? null : week + 1, all: a == null ? null : a + 1 };
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

  async function readBody(req) {
    // Vercel parses JSON bodies for us; plain Node does not
    if (req.body !== undefined && req.body !== null) {
      if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {};
      if (Buffer.isBuffer(req.body)) return req.body.length ? JSON.parse(req.body.toString('utf8')) : {};
      return req.body;
    }
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

  async function route(req, res, url) {
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent); // ['api', ...]
    const m = req.method;

    if (parts[1] === 'health' && m === 'GET') {
      if (storageError) return send(res, 200, { ok: false, error: storageError });
      await store.run([['HGET', PLAYERS, '__ping']]);
      return send(res, 200, { ok: true, admin: !!adminKey, storage: store.kind });
    }
    if (storageError) return send(res, 503, { error: storageError });

    if (parts[1] === 'leaderboard' && m === 'GET') {
      const mode = url.searchParams.get('mode') || 'classic';
      const range = url.searchParams.get('range') || 'all';
      if (![...MODES, 'masters'].includes(mode) || !['today', 'week', 'all'].includes(range)) return send(res, 400, { error: 'bad mode or range' });
      return send(res, 200, { mode, range, rows: await leaderboard(mode, range) });
    }

    if (parts[1] === 'players' && parts[2]) {
      const key = Names.keyOf(parts[2]);
      if (m === 'GET') {
        const p = await getPlayer(key);
        return p ? send(res, 200, { player: publicPlayer(p) }) : send(res, 404, { error: 'not found' });
      }
      if (m === 'PUT') {
        const body = await readBody(req);
        let p = await getPlayer(key);
        if (!p) {
          const c = Names.check(body.name || parts[2]);
          if (!c.ok || c.key !== key) return send(res, 400, { error: c.reason || 'bad name' });
          if (typeof body.avatar !== 'string' || !AVATARS.test(body.avatar)) return send(res, 400, { error: 'bad avatar' });
          p = { key, name: c.name, avatar: body.avatar, xp: 0, games: 0, mastery: {}, achievements: [], dexViewed: [], best: {}, created: Date.now() };
        }
        mergeProgress(p, body);
        await store.run(savePlayerCmds(p));
        return send(res, 200, { player: publicPlayer(p) });
      }
    }

    if (parts[1] === 'scores' && m === 'POST') {
      const body = await readBody(req);
      const key = Names.keyOf(body.name);
      const p = await getPlayer(key);
      const score = Math.floor(Number(body.score));
      if (!p) return send(res, 404, { error: 'unknown player' });
      if (!MODES.includes(body.mode)) return send(res, 400, { error: 'bad mode' });
      if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) return send(res, 400, { error: 'bad score' });
      const prevBest = p.best[body.mode] || 0;
      p.xp += score;
      p.games += 1;
      p.best[body.mode] = Math.max(prevBest, score);
      mergeProgress(p, body);
      const day = lbKey(body.mode, dayKey(Date.now()));
      await store.run([
        ...savePlayerCmds(p),
        ['ZADD', lbKey(body.mode), 'GT', score, key],
        ['ZADD', day, 'GT', score, key],
        ['EXPIRE', day, DAY_TTL],
      ]);
      return send(res, 200, { player: publicPlayer(p), newBest: score > prevBest, ranks: await ranksFor(body.mode, key) });
    }

    if (parts[1] === 'admin') {
      if (!isAdmin(req)) return send(res, 403, { error: adminKey ? 'wrong key' : 'admin disabled: set ADMIN_KEY' });
      if (parts[2] === 'players' && !parts[3] && m === 'GET') {
        const [flat] = await store.run([['HGETALL', PLAYERS]]);
        const rows = [];
        for (let i = 0; i < flat.length; i += 2) {
          const p = JSON.parse(flat[i + 1]);
          rows.push({ ...publicPlayer(p), mastered: masteredCount(p), updated: p.updated });
        }
        return send(res, 200, { players: rows.sort((a, b) => b.xp - a.xp) });
      }
      if (parts[2] === 'players' && parts[3] && m === 'DELETE') {
        const key = Names.keyOf(parts[3]);
        const [keys] = await store.run([['KEYS', 'skyq:lb:*']]);
        await store.run([['HDEL', PLAYERS, key], ...keys.map((k) => ['ZREM', k, key])]);
        return send(res, 200, { ok: true });
      }
      if (parts[2] === 'scores' && m === 'DELETE') {
        const mode = url.searchParams.get('mode');
        if (mode && !MODES.includes(mode)) return send(res, 400, { error: 'bad mode' });
        const modes = mode ? [mode] : MODES;
        const found = await store.run(modes.map((md) => ['KEYS', `skyq:lb:${md}:*`]));
        const [flat] = await store.run([['HGETALL', PLAYERS]]);
        const cmds = [];
        const doomed = found.flat();
        if (doomed.length) cmds.push(['DEL', ...doomed]);
        for (let i = 0; i < flat.length; i += 2) {
          const p = JSON.parse(flat[i + 1]);
          for (const md of modes) delete p.best[md];
          cmds.push(['HSET', PLAYERS, p.key, JSON.stringify(p)]);
        }
        if (cmds.length) await store.run(cmds);
        return send(res, 200, { ok: true });
      }
      if (parts[2] === 'everything' && m === 'DELETE') {
        const [keys] = await store.run([['KEYS', 'skyq:*']]);
        if (keys.length) await store.run([['DEL', ...keys]]);
        return send(res, 200, { ok: true });
      }
    }
    send(res, 404, { error: 'not found' });
  }

  return {
    async handle(req, res) {
      const url = new URL(req.url, 'http://x');
      // Vercel's rewrite may hand us /api/index?path=players/maya instead of /api/players/maya
      if (/^\/api(\/index)?\/?$/.test(url.pathname) && url.searchParams.has('path')) {
        url.pathname = '/api/' + url.searchParams.get('path');
        url.searchParams.delete('path');
      }
      try {
        await route(req, res, url);
      } catch (e) {
        if (e instanceof SyntaxError || e.message === 'too big') return send(res, 400, { error: 'bad request' });
        console.error('Skyline Quest API error:', e);
        send(res, 500, { error: 'server error' });
      }
    },
  };
}

module.exports = { createApp };
