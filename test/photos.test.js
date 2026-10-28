const test = require('node:test');
const assert = require('node:assert');
const { createServer } = require('../local/server.js');
const { createFileStore } = require('../lib/storage.js');

// A fake Wikimedia (Wikipedia API, Commons API and image server) in the real response formats.
function fakeWikimedia() {
  const calls = { wp: 0, commons: 0, img: 0, ua: new Set() };
  const json = (obj) => new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json' } });
  const info = (file, width) => ({
    title: 'File:' + file,
    imageinfo: [{
      thumburl: `https://upload.wikimedia.org/thumb/${width}px-${encodeURIComponent(file)}`, thumbwidth: width, thumbheight: width * 1.4,
      mime: 'image/jpeg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:' + file,
      extmetadata: { Artist: { value: '<a href="u">Ada &amp; Co</a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' }, LicenseUrl: { value: 'https://cc/by-sa' } },
    }],
  });
  const fetchImpl = async (url, opts = {}) => {
    calls.ua.add((opts.headers || {})['User-Agent']);
    const u = new URL(url);
    const p = u.searchParams;
    if (u.hostname === 'en.wikipedia.org') {
      calls.wp++;
      const titles = p.get('titles').split('|');
      if (p.get('prop') === 'images') return json({ query: { pages: [{ title: titles[0], images: [{ title: 'File:Article extra.jpg' }, { title: 'File:Logo.svg' }] }] } });
      // Aqua's article has no usable photo, like the real report
      const lead = (t) => ({ 'Civic Opera House': 'Civic_Opera_House_interior.jpg', 'Tribune Tower': 'Tribune_Tower_lobby.jpg' }[t] || t.replace(/ /g, '_') + '.jpg');
      return json({ query: { pages: titles.map((t) => (t.startsWith('Aqua') ? { title: t } : { title: t, pageimage: lead(t) })) } });
    }
    if (u.hostname === 'commons.wikimedia.org') {
      calls.commons++;
      const width = Number(p.get('iiurlwidth'));
      if (p.get('generator') === 'search') {
        // the top search hit is an inside shot, which should be skipped
        const name = (n) => `${p.get('gsrsearch')} ${n === 1 ? 'interior ' : ''}${n}.jpg`;
        return json({ query: { pages: [2, 1, 3].map((n) => Object.assign(info(name(n), width), { index: n })) } });
      }
      const files = p.get('titles').split('|').map((t) => t.replace(/^File:/, ''));
      return json({ query: { pages: files.map((f) => (f.startsWith('Not on commons') ? { title: 'File:' + f, missing: true } : info(f, width))) } });
    }
    if (u.hostname === 'upload.wikimedia.org') {
      calls.img++;
      return new Response(Buffer.from('JPEG:' + url), { headers: { 'content-type': 'image/jpeg' } });
    }
    throw new Error('unexpected fetch ' + url);
  };
  return { fetchImpl, calls };
}

async function boot(t) {
  const fake = fakeWikimedia();
  const server = createServer({ store: createFileStore(null), adminKey: 'k', fetchImpl: fake.fetchImpl });
  await new Promise((r) => server.listen(0, r));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const req = async (method, url, body, admin) => {
    const r = await fetch(base + url, {
      method, body: body && JSON.stringify(body),
      headers: Object.assign({ 'Content-Type': 'application/json' }, admin ? { 'X-Admin-Key': 'k' } : {}),
    });
    const type = r.headers.get('content-type') || '';
    return { status: r.status, headers: r.headers, data: type.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()) };
  };
  return { req, ...fake };
}

test('serves building photos from our own site, with credits', async (t) => {
  const { req, calls } = await boot(t);
  const r = await req('GET', '/api/photos');
  assert.strictEqual(r.status, 200);
  const photos = r.data.photos;
  assert.strictEqual(Object.keys(photos).length, 34, 'every building has a photo');
  // no article photo → Commons search, skipping the inside shot
  assert.strictEqual(photos.aqua.file, 'Aqua Tower Chicago 2.jpg');
  // flagged buildings use the outside-view search instead of the article photo
  assert.strictEqual(photos.opera.file, 'Civic Opera House Chicago river exterior 2.jpg');
  // article photo that is an inside view → search instead
  assert.strictEqual(photos.tribune.file, 'Tribune Tower Chicago 2.jpg');
  assert.match(photos.willis.src, /^api\/photo\/willis\?v=[0-9a-f]{10}$/);
  assert.strictEqual(photos.willis.artist, 'Ada & Co');
  assert.strictEqual(photos.willis.license, 'CC BY-SA 4.0');
  assert.ok([...calls.ua].every((ua) => /SkylineQuest/.test(ua)), 'identifies itself to Wikimedia');

  const img = await req('GET', '/' + photos.willis.src);
  assert.strictEqual(img.status, 200);
  assert.strictEqual(img.headers.get('content-type'), 'image/jpeg');
  assert.match(img.headers.get('cache-control'), /immutable/);
  assert.match(img.data.toString(), /960px-Willis_Tower\.jpg|960px-Willis%20Tower\.jpg/);

  // the photo list is cached, so Wikipedia isn't asked again
  const before = calls.wp;
  await req('GET', '/api/photos');
  assert.strictEqual(calls.wp, before);
  assert.strictEqual((await req('GET', '/api/photo/aqua')).status, 200);
  assert.strictEqual((await req('GET', '/api/photo/nope')).status, 404);
});

test('teachers can search for and pick a better photo', async (t) => {
  const { req } = await boot(t);
  assert.strictEqual((await req('GET', '/api/admin/photos/aqua/candidates')).status, 403);
  const c = await req('GET', '/api/admin/photos/aqua/candidates', null, true);
  // outside views first, the inside shot last
  assert.deepStrictEqual(c.data.candidates.map((x) => x.file), ['Aqua Tower Chicago 2.jpg', 'Aqua Tower Chicago 3.jpg', 'Article extra.jpg', 'Aqua Tower Chicago interior 1.jpg']);
  const custom = await req('GET', '/api/admin/photos/aqua/candidates?q=Aqua%20balconies', null, true);
  assert.strictEqual(custom.data.candidates[0].file, 'Aqua balconies 2.jpg');

  assert.strictEqual((await req('PUT', '/api/admin/photos/aqua', { file: 'Aqua Tower Chicago 2.jpg' }, true)).status, 200);
  assert.strictEqual((await req('PUT', '/api/admin/photos/opera', { file: 'Not on commons.jpg' }, true)).status, 400);
  assert.strictEqual((await req('PUT', '/api/admin/photos/willis', { file: 'none' }, true)).status, 200);

  let photos = (await req('GET', '/api/photos')).data.photos;
  assert.strictEqual(photos.aqua.file, 'Aqua Tower Chicago 2.jpg');
  assert.ok(!photos.willis, 'willis now uses the drawing');
  const admin = await req('GET', '/api/admin/photos', null, true);
  assert.strictEqual(admin.data.photos.aqua.chosenBy, 'teacher');

  await req('PUT', '/api/admin/photos/willis', { file: null }, true);
  photos = (await req('GET', '/api/photos')).data.photos;
  assert.strictEqual(photos.willis.file, 'Willis Tower.jpg', 'back to automatic');
});

test('a crowd of iPads opening at once shares one Wikimedia lookup', async (t) => {
  const { req, calls } = await boot(t);
  await Promise.all(Array.from({ length: 30 }, () => req('GET', '/api/photos')));
  assert.strictEqual(calls.wp, 1, 'one batched Wikipedia request, not 30');
});
