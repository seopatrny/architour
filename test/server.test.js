const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { createServer } = require('../local/server.js');
const { createFileStore, createUpstashStore } = require('../lib/storage.js');

// A stand-in for Upstash's REST API (pipeline endpoint), backed by the in-memory store.
async function fakeUpstash(t) {
  const backing = createFileStore(null);
  const srv = http.createServer((req, res) => {
    if (req.headers.authorization !== 'Bearer tok' || req.url !== '/pipeline') { res.writeHead(401); return res.end('{}'); }
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      const cmds = JSON.parse(body);
      assert.ok(cmds.every((c) => c.every((a) => typeof a === 'string')), 'Upstash args must be strings');
      const out = await backing.run(cmds);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(out.map((result) => ({ result }))));
    });
  });
  await new Promise((r) => srv.listen(0, r));
  t.after(() => srv.close());
  return `http://127.0.0.1:${srv.address().port}`;
}

const BACKENDS = {
  file: async () => ({}),
  upstash: async (t) => ({ store: createUpstashStore(await fakeUpstash(t), 'tok') }),
};
let backendName = 'file';

async function boot(t, adminKey = 'secret') {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyq-'));
  const extra = await BACKENDS[backendName](t);
  const server = createServer({ dataDir, adminKey, ...extra });
  await new Promise((r) => server.listen(0, r));
  t.after(() => { server.close(); fs.rmSync(dataDir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const req = async (method, url, body, headers = {}) => {
    const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body && JSON.stringify(body) });
    return { status: r.status, data: await r.json().catch(() => null), headers: r.headers };
  };
  return { req, server, dataDir, base };
}

for (const name of Object.keys(BACKENDS)) {
  const it = (title, fn) => test(`[${name}] ${title}`, (t) => { backendName = name; return fn(t); });
  it('creates a player, records scores and ranks the leaderboard', async (t) => {
    const { req } = await boot(t);
    assert.strictEqual((await req('GET', '/api/players/maya%20r')).status, 404);
    const made = await req('PUT', '/api/players/maya%20r', { name: 'Maya R', avatar: '🦊' });
    assert.strictEqual(made.status, 200);
    assert.strictEqual(made.data.player.name, 'Maya R');
    await req('PUT', '/api/players/leo', { name: 'Leo', avatar: '🐼' });

    let r = await req('POST', '/api/scores', { name: 'Maya R', mode: 'classic', score: 1200, mastery: { willis: 2 } });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.data.newBest, true);
    assert.strictEqual(r.data.ranks.today, 1);
    r = await req('POST', '/api/scores', { name: 'leo', mode: 'classic', score: 3000 });
    assert.strictEqual(r.data.ranks.today, 1);
    r = await req('POST', '/api/scores', { name: 'maya r', mode: 'classic', score: 500 });
    assert.strictEqual(r.data.newBest, false);
    assert.strictEqual(r.data.player.xp, 1700);
    assert.strictEqual(r.data.player.games, 2);

    for (const range of ['today', 'week', 'all']) {
      const board = await req('GET', `/api/leaderboard?mode=classic&range=${range}`);
      assert.deepStrictEqual(board.data.rows.map((x) => [x.name, x.score]), [['Leo', 3000], ['Maya R', 1200]], range);
    }
    assert.strictEqual(r.data.ranks.week, 2);
    assert.strictEqual(r.data.ranks.all, 2);
    const masters = await req('GET', '/api/leaderboard?mode=masters&range=all');
    assert.ok(masters.data.rows.find((x) => x.name === 'Maya R'));
  });

  it('merges progress instead of overwriting it', async (t) => {
    const { req } = await boot(t);
    await req('PUT', '/api/players/sam', { name: 'Sam', avatar: '🚀', mastery: { willis: 3, aqua: 1 }, achievements: ['first_game'] });
    const r = await req('PUT', '/api/players/sam', { mastery: { willis: 1, aqua: 2, bad_ID: 9 }, achievements: ['streak5'] });
    assert.deepStrictEqual(r.data.player.mastery, { willis: 3, aqua: 2 });
    assert.deepStrictEqual(r.data.player.achievements.sort(), ['first_game', 'streak5']);
  });

  it('rejects bad names, avatars, modes and scores', async (t) => {
    const { req } = await boot(t);
    assert.strictEqual((await req('PUT', '/api/players/shit', { name: 'shit', avatar: '🦊' })).status, 400);
    assert.strictEqual((await req('PUT', '/api/players/ok%20kid', { name: 'ok kid', avatar: '<b>' })).status, 400);
    assert.strictEqual((await req('PUT', '/api/players/abc', { name: 'xyz', avatar: '🦊' })).status, 400);
    await req('PUT', '/api/players/ok%20kid', { name: 'ok kid', avatar: '🦊' });
    assert.strictEqual((await req('POST', '/api/scores', { name: 'ok kid', mode: 'cheat', score: 5 })).status, 400);
    assert.strictEqual((await req('POST', '/api/scores', { name: 'ok kid', mode: 'blitz', score: 1e9 })).status, 400);
    assert.strictEqual((await req('POST', '/api/scores', { name: 'nobody', mode: 'blitz', score: 5 })).status, 404);
    assert.strictEqual((await req('GET', '/api/leaderboard?mode=nope')).status, 400);
  });

  it('admin endpoints need the key and can delete players and reset scores', async (t) => {
    const { req } = await boot(t);
    await req('PUT', '/api/players/zed', { name: 'Zed', avatar: '🐸' });
    await req('POST', '/api/scores', { name: 'Zed', mode: 'blitz', score: 900 });
    assert.strictEqual((await req('GET', '/api/admin/players')).status, 403);
    assert.strictEqual((await req('GET', '/api/admin/players', null, { 'X-Admin-Key': 'nope' })).status, 403);
    const list = await req('GET', '/api/admin/players', null, { 'X-Admin-Key': 'secret' });
    assert.strictEqual(list.data.players.length, 1);
    await req('DELETE', '/api/admin/scores?mode=blitz', null, { 'X-Admin-Key': 'secret' });
    assert.strictEqual((await req('GET', '/api/leaderboard?mode=blitz&range=all')).data.rows.length, 0);
    await req('DELETE', '/api/admin/players/zed', null, { 'X-Admin-Key': 'secret' });
    assert.strictEqual((await req('GET', '/api/players/zed')).status, 404);
  });

  it('admin is disabled without ADMIN_KEY', async (t) => {
    const { req } = await boot(t, '');
    assert.strictEqual((await req('GET', '/api/admin/players', null, { 'X-Admin-Key': '' })).status, 403);
  });
}

test('serves the game and blocks path traversal', async (t) => {
  backendName = 'file';
  const { base } = await boot(t);
  const home = await fetch(base + '/');
  assert.strictEqual(home.status, 200);
  assert.match(await home.text(), /Skyline Quest/);
  assert.strictEqual((await fetch(base + '/js/game.js')).status, 200);
  assert.notStrictEqual((await fetch(base + '/..%2Fserver.js')).status, 200);
  assert.notStrictEqual((await fetch(base + '/%2e%2e/package.json')).status, 200);
});

test('saves data to disk and loads it back', async (t) => {
  backendName = 'file';
  const { req, server, dataDir } = await boot(t);
  await req('PUT', '/api/players/kai', { name: 'Kai', avatar: '🦈' });
  server.flush();
  const again = createServer({ dataDir, adminKey: '' });
  await new Promise((r) => again.listen(0, r));
  t.after(() => again.close());
  const r = await fetch(`http://127.0.0.1:${again.address().port}/api/players/kai`);
  assert.strictEqual((await r.json()).player.name, 'Kai');
});

// Calls api/index.js the way Vercel does: a Node req/res, with the JSON body already parsed.
async function callVercel(env, method, url, body) {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  delete require.cache[require.resolve('../api/index.js')];
  const fn = require('../api/index.js');
  Object.keys(process.env).forEach((k) => { if (!(k in saved)) delete process.env[k]; });
  Object.assign(process.env, saved);
  const { Readable } = require('stream');
  const req = Object.assign(Readable.from([]), { method, url, headers: {}, body });
  return new Promise((resolve) => {
    const res = {
      status: 0,
      writeHead(s) { this.status = s; },
      end(txt) { resolve({ status: this.status, data: JSON.parse(txt) }); },
    };
    fn(req, res);
  });
}

test('Vercel function explains a missing database instead of crashing', async () => {
  const r = await callVercel({ VERCEL: '1', UPSTASH_REDIS_REST_URL: '', KV_REST_API_URL: '' }, 'GET', '/api/health');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.data.ok, false);
  assert.match(r.data.error, /Upstash/);
  assert.strictEqual((await callVercel({ VERCEL: '1' }, 'GET', '/api/leaderboard')).status, 503);
});

test('Vercel function works with Upstash and pre-parsed bodies', async (t) => {
  const env = { VERCEL: '1', KV_REST_API_URL: await fakeUpstash(t), KV_REST_API_TOKEN: 'tok' };
  assert.strictEqual((await callVercel(env, 'GET', '/api/health')).data.ok, true);
  const made = await callVercel(env, 'PUT', '/api/players/ana', { name: 'Ana', avatar: '🐙' });
  assert.strictEqual(made.status, 200);
  const r = await callVercel(env, 'POST', '/api/scores', { name: 'Ana', mode: 'blitz', score: 4200 });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.data.ranks.today, 1);
  // the URL form Vercel's rewrite produces
  const p = await callVercel(env, 'GET', '/api/index?path=players/ana');
  assert.strictEqual(p.data.player.name, 'Ana');
  const lb = await callVercel(env, 'GET', '/api/index?path=leaderboard&mode=blitz&range=today');
  assert.strictEqual(lb.data.rows[0].score, 4200);
});
