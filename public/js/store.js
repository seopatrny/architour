/* Talks to the school's Skyline Quest server so every iPad shares one leaderboard.
 * If the server can't be reached (or the game is hosted as plain static files),
 * it falls back to saving on this device only. */
(function (root) {
  const LOCAL_DB = 'skyq_local_db';
  const RECENT = 'skyq_recent';
  const MODES = ['classic', 'blitz', 'survival'];

  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } },
  };

  async function call(method, url, body) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    try {
      const res = await fetch(url, {
        method, signal: ctl.signal,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data };
    } finally {
      clearTimeout(t);
    }
  }

  /* ---------- device-only fallback (mirrors server.js) ---------- */
  const Local = {
    db() { return ls.get(LOCAL_DB, { players: {}, scores: [] }); },
    write(db) { ls.set(LOCAL_DB, db); },
    getPlayer(key) { return this.db().players[key] || null; },
    merge(p, body) {
      if (body.avatar) p.avatar = body.avatar;
      for (const [id, v] of Object.entries(body.mastery || {})) p.mastery[id] = Math.max(p.mastery[id] || 0, Math.min(5, v | 0));
      p.achievements = [...new Set([...(p.achievements || []), ...(body.achievements || [])])];
      p.dexViewed = [...new Set([...(p.dexViewed || []), ...(body.dexViewed || [])])];
    },
    savePlayer(key, body) {
      const db = this.db();
      let p = db.players[key];
      if (!p) p = db.players[key] = { key, name: body.name, avatar: body.avatar, xp: 0, games: 0, mastery: {}, achievements: [], dexViewed: [], best: {}, created: Date.now() };
      this.merge(p, body);
      this.write(db);
      return p;
    },
    submitScore(key, body) {
      const db = this.db();
      const p = db.players[key];
      const prev = p.best[body.mode] || 0;
      db.scores.push({ key, mode: body.mode, score: body.score, ts: Date.now() });
      if (db.scores.length > 3000) db.scores.splice(0, db.scores.length - 3000);
      p.xp += body.score; p.games += 1; p.best[body.mode] = Math.max(prev, body.score);
      this.merge(p, body);
      this.write(db);
      const rank = (range) => { const i = this.leaderboard(body.mode, range, 1000).findIndex((r) => r.key === key); return i < 0 ? null : i + 1; };
      return { player: p, newBest: body.score > prev, ranks: { today: rank('today'), week: rank('week'), all: rank('all') } };
    },
    leaderboard(mode, range, limit = 20) {
      const db = this.db();
      if (mode === 'masters') {
        return Object.values(db.players)
          .map((p) => ({ key: p.key, name: p.name, avatar: p.avatar, score: Object.values(p.mastery).filter((v) => v >= 3).length, xp: p.xp }))
          .filter((r) => r.score > 0 || r.xp > 0).sort((a, b) => b.score - a.score || b.xp - a.xp).slice(0, limit);
      }
      if (mode === 'combined') {
        const total = new Map();
        for (const m of MODES) for (const r of this.leaderboard(m, range, 100000)) total.set(r.key, Object.assign({}, r, { score: (total.has(r.key) ? total.get(r.key).score : 0) + r.score }));
        return [...total.values()].sort((a, b) => b.score - a.score).slice(0, limit);
      }
      const now = Date.now(), today = new Date().toDateString(), best = new Map();
      for (const s of db.scores) {
        if (s.mode !== mode) continue;
        if (range === 'today' && new Date(s.ts).toDateString() !== today) continue;
        if (range === 'week' && now - s.ts > 7 * 864e5) continue;
        const c = best.get(s.key);
        if (!c || s.score > c.score) best.set(s.key, s);
      }
      return [...best.values()].filter((s) => db.players[s.key]).sort((a, b) => b.score - a.score || a.ts - b.ts).slice(0, limit)
        .map((s) => ({ key: s.key, name: db.players[s.key].name, avatar: db.players[s.key].avatar, score: s.score, ts: s.ts }));
    },
  };

  const Store = {
    online: true,
    onStatus: null,

    ready: null,

    init() {
      this.ready = this.check();
      // if the server drops out, keep checking so the iPad reconnects by itself
      setInterval(() => { if (!this.online) this.check(); }, 30000);
      return this.ready;
    },
    async check() {
      try {
        const r = await call('GET', 'api/health');
        this.setOnline(r.status === 200 && !!r.data.ok);
        if (r.data && r.data.error) console.warn('Skyline Quest server:', r.data.error);
      } catch (e) {
        this.setOnline(false);
      }
      return this.online;
    },
    setOnline(v) {
      if (this.online !== v) { this.online = v; if (this.onStatus) this.onStatus(v); }
    },

    // try the server; on a network failure switch to device-only mode
    async withFallback(serverFn, localFn) {
      if (this.ready) await this.ready;
      if (this.online) {
        try { return await serverFn(); } catch (e) {
          if (e && e.userError) throw e;
          this.setOnline(false);
        }
      }
      return localFn();
    },

    getPlayer(name) {
      const key = Names.keyOf(name);
      return this.withFallback(async () => {
        const r = await call('GET', 'api/players/' + encodeURIComponent(key));
        if (r.status === 404) return null;
        if (r.status !== 200) throw new Error('server');
        return r.data.player;
      }, () => Local.getPlayer(key));
    },

    savePlayer(name, body) {
      const key = Names.keyOf(name);
      return this.withFallback(async () => {
        const r = await call('PUT', 'api/players/' + encodeURIComponent(key), Object.assign({ name }, body));
        if (r.status === 400) throw Object.assign(new Error(r.data.error), { userError: true });
        if (r.status !== 200) throw new Error('server');
        return r.data.player;
      }, () => Local.savePlayer(key, Object.assign({ name }, body)));
    },

    submitScore(name, body) {
      const key = Names.keyOf(name);
      return this.withFallback(async () => {
        const r = await call('POST', 'api/scores', Object.assign({ name }, body));
        if (r.status === 404) {
          // player only exists on this device so far – create them on the server, then retry
          const p = Local.getPlayer(key);
          await call('PUT', 'api/players/' + encodeURIComponent(key), Object.assign({ name }, p || body));
          const again = await call('POST', 'api/scores', Object.assign({ name }, body));
          if (again.status !== 200) throw new Error('server');
          return again.data;
        }
        if (r.status !== 200) throw new Error('server');
        return r.data;
      }, () => {
        if (!Local.getPlayer(key)) Local.savePlayer(key, Object.assign({ name }, body));
        return Local.submitScore(key, body);
      });
    },

    leaderboard(mode, range, limit = 20) {
      return this.withFallback(async () => {
        const r = await call('GET', `api/leaderboard?mode=${mode}&range=${range}&limit=${limit}`);
        if (r.status !== 200) throw new Error('server');
        return r.data.rows;
      }, () => Local.leaderboard(mode, range, limit));
    },

    recent() { return ls.get(RECENT, []); },
    remember(p) {
      const list = this.recent().filter((r) => Names.keyOf(r.name) !== Names.keyOf(p.name));
      list.unshift({ name: p.name, avatar: p.avatar });
      ls.set(RECENT, list.slice(0, 12));
    },
    forget(name) {
      ls.set(RECENT, this.recent().filter((r) => Names.keyOf(r.name) !== Names.keyOf(name)));
    },
    pref(k, v) {
      const prefs = ls.get('skyq_prefs', {});
      if (v === undefined) return prefs[k];
      prefs[k] = v;
      ls.set('skyq_prefs', prefs);
    },
    MODES,
  };

  root.Store = Store;
})(window);
