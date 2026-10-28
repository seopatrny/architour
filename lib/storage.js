/* Where Skyline Quest keeps players and leaderboards.
 *
 * The game talks to storage with a few Redis commands, so the same code runs on:
 *   - Upstash Redis (used on Vercel – serverless functions can't keep files), or
 *   - a JSON file on disk (used when you run `npm start` on a school computer).
 * The file store below copies just the Redis commands the game needs. */
const fs = require('fs');
const path = require('path');

/* ---------------- Upstash Redis (REST API, no packages needed) ---------------- */
function createUpstashStore(url, token) {
  return {
    kind: 'upstash',
    async run(cmds) {
      const res = await fetch(url.replace(/\/$/, '') + '/pipeline', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(cmds.map((c) => c.map(String))),
      });
      if (!res.ok) throw new Error(`Upstash returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const out = await res.json();
      return out.map((r) => {
        if (r.error) throw new Error('Upstash: ' + r.error);
        return r.result;
      });
    },
  };
}

/* ---------------- JSON file (or memory when file is null) ---------------- */
function createFileStore(file) {
  let data = { h: {}, z: {}, s: {}, exp: {} };
  if (file) {
    try {
      const loaded = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (loaded && loaded.h && loaded.z) data = Object.assign(data, loaded, { s: loaded.s || {} });
    } catch (e) {
      if (e.code !== 'ENOENT') console.error('Could not read', file, e.message);
    }
  }

  let dirty = false, timer = null;
  function flush() {
    clearTimeout(timer);
    if (!file || !dirty) return;
    dirty = false;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file + '.tmp', JSON.stringify(data));
    fs.renameSync(file + '.tmp', file);
  }

  function alive(k) {
    if (data.exp[k] && data.exp[k] <= Date.now()) {
      delete data.h[k]; delete data.z[k]; delete data.s[k]; delete data.exp[k];
      dirty = true;
    }
  }
  const hash = (k) => { alive(k); return data.h[k] || {}; };
  const zset = (k) => { alive(k); return data.z[k] || {}; };
  const desc = (z) => Object.entries(z).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : -1));
  const flat = (entries) => entries.flatMap(([m, s]) => [m, String(s)]);
  const exists = (k) => data.h[k] || data.z[k] || k in data.s;
  const allKeys = () => [...new Set([...Object.keys(data.h), ...Object.keys(data.z), ...Object.keys(data.s)])].filter((k) => (alive(k), exists(k)));

  const ops = {
    GET: (k) => { alive(k); return k in data.s ? data.s[k] : null; },
    SET(k, v, ...opts) {
      data.s[k] = String(v);
      delete data.exp[k];
      const ex = opts.findIndex((o) => String(o).toUpperCase() === 'EX');
      if (ex >= 0) data.exp[k] = Date.now() + Number(opts[ex + 1]) * 1000;
      dirty = true;
      return 'OK';
    },
    HGET: (k, f) => (f in hash(k) ? hash(k)[f] : null),
    HMGET: (k, ...fs) => fs.map((f) => (f in hash(k) ? hash(k)[f] : null)),
    HGETALL: (k) => flat(Object.entries(hash(k))),
    HSET(k, ...fv) {
      const h = (data.h[k] = hash(k));
      let added = 0;
      for (let i = 0; i < fv.length; i += 2) { if (!(fv[i] in h)) added++; h[fv[i]] = String(fv[i + 1]); }
      dirty = true;
      return added;
    },
    HDEL(k, ...fs) {
      const h = hash(k);
      let n = 0;
      for (const f of fs) if (f in h) { delete h[f]; n++; }
      dirty = dirty || n > 0;
      return n;
    },
    ZADD(k, ...args) {
      let gt = false;
      while (args[0] === 'GT') { gt = true; args.shift(); }
      const z = (data.z[k] = zset(k));
      let added = 0;
      for (let i = 0; i < args.length; i += 2) {
        const s = Number(args[i]), m = args[i + 1];
        if (!(m in z)) added++;
        if (!gt || !(m in z) || s > z[m]) z[m] = s;
      }
      dirty = true;
      return added;
    },
    ZREVRANGE(k, start, stop, withScores) {
      const e = desc(zset(k));
      const end = Number(stop) < 0 ? e.length + Number(stop) : Number(stop);
      const part = e.slice(Number(start), end + 1);
      return withScores ? flat(part) : part.map(([m]) => m);
    },
    ZREVRANK(k, m) {
      const i = desc(zset(k)).findIndex(([x]) => x === m);
      return i < 0 ? null : i;
    },
    ZSCORE: (k, m) => (m in zset(k) ? String(zset(k)[m]) : null),
    ZREM(k, ...ms) {
      const z = zset(k);
      let n = 0;
      for (const m of ms) if (m in z) { delete z[m]; n++; }
      dirty = dirty || n > 0;
      return n;
    },
    ZUNION(n, ...rest) {
      const keys = rest.slice(0, Number(n));
      const ai = rest.findIndex((a) => String(a).toUpperCase() === 'AGGREGATE');
      const agg = ai >= 0 ? String(rest[ai + 1]).toUpperCase() : 'SUM'; // Redis defaults to SUM
      const combine = { SUM: (a, b) => a + b, MAX: Math.max, MIN: Math.min }[agg];
      const out = {};
      for (const k of keys) for (const [m, s] of Object.entries(zset(k))) out[m] = m in out ? combine(out[m], s) : s;
      const asc = desc(out).reverse();
      return rest.includes('WITHSCORES') ? flat(asc) : asc.map(([m]) => m);
    },
    DEL(...ks) {
      let n = 0;
      for (const k of ks) if (exists(k)) { delete data.h[k]; delete data.z[k]; delete data.s[k]; delete data.exp[k]; n++; }
      dirty = dirty || n > 0;
      return n;
    },
    EXPIRE(k, secs) {
      if (!exists(k)) return 0;
      data.exp[k] = Date.now() + Number(secs) * 1000;
      dirty = true;
      return 1;
    },
    // only "prefix*" patterns are needed
    KEYS: (pattern) => allKeys().filter((k) => (pattern.endsWith('*') ? k.startsWith(pattern.slice(0, -1)) : k === pattern)),
  };

  return {
    kind: file ? 'file' : 'memory',
    async run(cmds) {
      const out = cmds.map(([c, ...args]) => {
        const op = ops[String(c).toUpperCase()];
        if (!op) throw new Error('Unsupported command ' + c);
        return op(...args.map(String));
      });
      if (dirty && file) { clearTimeout(timer); timer = setTimeout(flush, 250); }
      return out;
    },
    flush,
  };
}

/* Pick storage from environment variables.
 * Returns { store } or { error } when nothing usable is configured. */
function storageFromEnv(env = process.env) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (url && token) return { store: createUpstashStore(url, token) };
  if (env.VERCEL) {
    return {
      error: 'No database connected. In Vercel, open Storage → add Upstash Redis (free) and connect it to this project, then redeploy.',
    };
  }
  const dir = env.DATA_DIR || path.join(__dirname, '..', 'data');
  return { store: createFileStore(path.join(dir, 'db.json')) };
}

module.exports = { createUpstashStore, createFileStore, storageFromEnv };
