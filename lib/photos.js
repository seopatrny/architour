/* Building photos, fetched by the server from Wikipedia / Wikimedia Commons.
 *
 * The iPads never talk to Wikimedia directly: they load /api/photo/<id> from our own
 * site, and Vercel's CDN caches each image, so Wikimedia is asked once instead of
 * once per iPad (which got photos rate-limited) and school web filters don't matter.
 *
 *   skyq:photos:auto      string  JSON map chosen automatically (cached 7 days)
 *   skyq:photos:override  hash    building id → JSON { file, info } picked by a teacher,
 *                                 or { file: 'none' } to use the drawing */
const crypto = require('crypto');
const { BUILDINGS, BY_ID } = require('../public/js/buildings.js');
const { WIKI } = require('../public/js/photo-sources.js');

const WP = 'https://en.wikipedia.org/w/api.php';
const COMMONS = 'https://commons.wikimedia.org/w/api.php';
// Wikimedia asks API clients to identify themselves
const UA = 'SkylineQuest/1.0 (Chicago River architecture learning game for schools; https://github.com/seopatrny/architour)';
const WIDTH = 960; // a standard Wikimedia thumbnail size, sharp on iPad screens
const THUMB = 330; // picker thumbnails
const AUTO_KEY = 'skyq:photos:auto';
const OVERRIDE_KEY = 'skyq:photos:override';
const AUTO_TTL = 7 * 86400;
const IMAGE_RE = /\.(jpe?g|png|webp)$/i;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };
const stripHtml = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e) => ENTITIES[e]).replace(/\s+/g, ' ').trim();
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const spaces = (f) => String(f).replace(/^File:/i, '').replace(/_/g, ' ');
const version = (file) => crypto.createHash('sha1').update(file).digest('hex').slice(0, 10);

function createPhotoService({ store, fetchImpl = globalThis.fetch }) {
  async function api(base, params) {
    const qs = new URLSearchParams(Object.assign({ format: 'json', formatversion: '2' }, params));
    const res = await fetchImpl(`${base}?${qs}`, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
    if (!res.ok) throw new Error(`Wikimedia API returned ${res.status}`);
    return res.json();
  }

  // article title → { file, page }
  async function pageImages(titles) {
    const out = {};
    for (const part of chunks(titles, 45)) {
      const data = await api(WP, { action: 'query', redirects: '1', prop: 'pageimages', piprop: 'name', titles: part.join('|') });
      const q = data.query || {};
      const follow = {};
      for (const n of q.normalized || []) follow[n.from] = n.to;
      for (const r of q.redirects || []) follow[r.from] = r.to;
      const byTitle = {};
      for (const p of q.pages || []) if (p.pageimage) byTitle[p.title] = p.pageimage;
      for (const t of part) {
        let final = t;
        for (let i = 0; i < 3 && follow[final]; i++) final = follow[final];
        if (byTitle[final]) out[t] = { file: spaces(byTitle[final]), page: final };
      }
    }
    return out;
  }

  function infoFromPage(p, width) {
    const info = p.imageinfo && p.imageinfo[0];
    if (!info || p.missing) return null;
    const meta = info.extmetadata || {};
    return {
      file: spaces(p.title),
      thumb: info.thumburl || info.url,
      width: info.thumbwidth || info.width,
      height: info.thumbheight || info.height,
      mime: info.mime || '',
      artist: stripHtml(meta.Artist && meta.Artist.value) || 'Unknown photographer',
      license: stripHtml(meta.LicenseShortName && meta.LicenseShortName.value) || 'see Wikimedia Commons',
      licenseUrl: (meta.LicenseUrl && meta.LicenseUrl.value) || '',
      filePage: info.descriptionurl || '',
      _w: width,
    };
  }

  const infoParams = (width) => ({
    prop: 'imageinfo', iiprop: 'url|extmetadata|mime|size', iiurlwidth: String(width),
    iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl',
  });

  // Commons file names → info (files not hosted on Commons are left out)
  async function commonsInfo(files, width = WIDTH) {
    const out = {};
    for (const part of chunks([...new Set(files.map(spaces))], 45)) {
      const data = await api(COMMONS, Object.assign({ action: 'query', titles: part.map((f) => 'File:' + f).join('|') }, infoParams(width)));
      for (const p of (data.query && data.query.pages) || []) {
        const i = infoFromPage(p, width);
        if (i) out[i.file] = i;
      }
    }
    return out;
  }

  async function buildAuto() {
    const titles = [...new Set(Object.values(WIKI).flat())];
    const images = await pageImages(titles);
    const chosen = {};
    for (const [id, list] of Object.entries(WIKI)) {
      const hit = list.map((t) => images[t]).find(Boolean);
      if (hit) chosen[id] = hit;
    }
    const info = await commonsInfo(Object.values(chosen).map((c) => c.file));
    const map = {};
    for (const [id, c] of Object.entries(chosen)) if (info[c.file]) map[id] = Object.assign({ page: c.page }, info[c.file]);
    return map;
  }

  async function autoMap() {
    const [cached] = await store.run([['GET', AUTO_KEY]]);
    if (cached) return JSON.parse(cached);
    const map = await buildAuto();
    if (Object.keys(map).length) await store.run([['SET', AUTO_KEY, JSON.stringify(map), 'EX', AUTO_TTL]]);
    return map;
  }

  async function overrides() {
    const [flat] = await store.run([['HGETALL', OVERRIDE_KEY]]);
    const out = {};
    for (let i = 0; i < flat.length; i += 2) out[flat[i]] = JSON.parse(flat[i + 1]);
    return out;
  }

  // id → { file, thumb, artist, ... , chosenBy: 'auto' | 'teacher' }
  async function resolved() {
    const [ov, auto] = await Promise.all([overrides(), autoMap().catch((e) => { console.error('Photo lookup failed:', e.message); return {}; })]);
    const map = {};
    for (const b of BUILDINGS) {
      const o = ov[b.id];
      if (o && o.file === 'none') continue;
      if (o && o.info) map[b.id] = Object.assign({}, o.info, { chosenBy: 'teacher' });
      else if (auto[b.id]) map[b.id] = Object.assign({}, auto[b.id], { chosenBy: 'auto' });
    }
    return { map, overrides: ov };
  }

  // what the game gets: same-origin image URLs plus credits
  async function publicMap() {
    const { map } = await resolved();
    const out = {};
    for (const [id, p] of Object.entries(map)) {
      out[id] = {
        src: `api/photo/${id}?v=${version(p.file)}`, file: p.file, page: p.page || '', artist: p.artist, license: p.license,
        licenseUrl: p.licenseUrl, filePage: p.filePage, width: p.width, height: p.height,
      };
    }
    return out;
  }

  // the image bytes for one building
  async function image(id) {
    const { map } = await resolved();
    const p = map[id];
    if (!p) return null;
    const res = await fetchImpl(p.thumb, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`Wikimedia image returned ${res.status}`);
    return { type: res.headers.get('content-type') || 'image/jpeg', body: Buffer.from(await res.arrayBuffer()), version: version(p.file) };
  }

  // photo choices for the teacher picker: Commons search + every photo in the article
  async function candidates(id, query) {
    const b = BY_ID[id];
    const files = new Map();
    const add = (i) => { if (i && IMAGE_RE.test(i.file) && /^image\//.test(i.mime || 'image/')) files.set(i.file, i); };
    const search = await api(COMMONS, Object.assign({
      action: 'query', generator: 'search', gsrsearch: query || `${b.name} Chicago`, gsrnamespace: '6', gsrlimit: '24',
    }, infoParams(THUMB)));
    const pages = ((search.query && search.query.pages) || []).sort((x, y) => (x.index || 0) - (y.index || 0));
    for (const p of pages) add(infoFromPage(p, THUMB));
    if (!query) {
      const art = await api(WP, { action: 'query', redirects: '1', prop: 'images', imlimit: '50', titles: WIKI[id][0] });
      const names = ((art.query && art.query.pages) || []).flatMap((p) => (p.images || []).map((i) => i.title)).filter((t) => IMAGE_RE.test(t));
      if (names.length) Object.values(await commonsInfo(names, THUMB)).forEach(add);
    }
    return [...files.values()].slice(0, 40).map(({ file, thumb, artist, license, width, height }) => ({ file, thumb, artist, license, width, height }));
  }

  async function setChoice(id, file) {
    if (!file) return store.run([['HDEL', OVERRIDE_KEY, id]]);
    if (file === 'none') return store.run([['HSET', OVERRIDE_KEY, id, JSON.stringify({ file: 'none' })]]);
    const info = (await commonsInfo([file]))[spaces(file)];
    if (!info) { const e = new Error('That file is not on Wikimedia Commons.'); e.status = 400; throw e; }
    return store.run([['HSET', OVERRIDE_KEY, id, JSON.stringify({ file: info.file, info })]]);
  }

  async function refresh() {
    await store.run([['DEL', AUTO_KEY]]);
  }

  return { publicMap, resolved, image, candidates, setChoice, refresh };
}

module.exports = { createPhotoService, version };
