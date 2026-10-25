const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createServer } = require('../server.js');

async function boot(t, adminKey = 'secret') {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyq-'));
  const server = createServer({ dataDir, adminKey });
  await new Promise((r) => server.listen(0, r));
  t.after(() => { server.close(); fs.rmSync(dataDir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const req = async (method, url, body, headers = {}) => {
    const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body && JSON.stringify(body) });
    return { status: r.status, data: await r.json().catch(() => null), headers: r.headers };
  };
  return { req, server, dataDir, base };
}

test('creates a player, records scores and ranks the leaderboard', async (t) => {
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

  const board = await req('GET', '/api/leaderboard?mode=classic&range=today');
  assert.deepStrictEqual(board.data.rows.map((x) => [x.name, x.score]), [['Leo', 3000], ['Maya R', 1200]]);
  const masters = await req('GET', '/api/leaderboard?mode=masters&range=all');
  assert.ok(masters.data.rows.find((x) => x.name === 'Maya R'));
});

test('merges progress instead of overwriting it', async (t) => {
  const { req } = await boot(t);
  await req('PUT', '/api/players/sam', { name: 'Sam', avatar: '🚀', mastery: { willis: 3, aqua: 1 }, achievements: ['first_game'] });
  const r = await req('PUT', '/api/players/sam', { mastery: { willis: 1, aqua: 2, bad_ID: 9 }, achievements: ['streak5'] });
  assert.deepStrictEqual(r.data.player.mastery, { willis: 3, aqua: 2 });
  assert.deepStrictEqual(r.data.player.achievements.sort(), ['first_game', 'streak5']);
});

test('rejects bad names, avatars, modes and scores', async (t) => {
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

test('admin endpoints need the key and can delete players and reset scores', async (t) => {
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

test('admin is disabled without ADMIN_KEY', async (t) => {
  const { req } = await boot(t, '');
  assert.strictEqual((await req('GET', '/api/admin/players', null, { 'X-Admin-Key': '' })).status, 403);
});

test('serves the game and blocks path traversal', async (t) => {
  const { base } = await boot(t);
  const home = await fetch(base + '/');
  assert.strictEqual(home.status, 200);
  assert.match(await home.text(), /Skyline Quest/);
  assert.strictEqual((await fetch(base + '/js/game.js')).status, 200);
  assert.notStrictEqual((await fetch(base + '/..%2Fserver.js')).status, 200);
  assert.notStrictEqual((await fetch(base + '/%2e%2e/package.json')).status, 200);
});

test('saves data to disk and loads it back', async (t) => {
  const { req, server, dataDir } = await boot(t);
  await req('PUT', '/api/players/kai', { name: 'Kai', avatar: '🦈' });
  server.flush();
  const again = createServer({ dataDir, adminKey: '' });
  await new Promise((r) => again.listen(0, r));
  t.after(() => again.close());
  const r = await fetch(`http://127.0.0.1:${again.address().port}/api/players/kai`);
  assert.strictEqual((await r.json()).player.name, 'Kai');
});
