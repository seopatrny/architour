/* Real photos of every building.
 *
 * Normally the game asks its own server (/api/photos). The server picks each building's
 * photo from Wikimedia Commons (or the one a teacher chose on /admin.html) and serves the
 * image from our own site, cached by the CDN.
 * If there's no server (plain static hosting), the game asks Wikipedia directly instead.
 * Anything that can't load falls back to the drawing.
 *
 * To use your own photo instead, save it as public/img/buildings/<id>.jpg and set
 * photo: true on that building in buildings.js. */
(function (root) {
  const WIKI = (root.PhotoSources || {}).WIKI || {};

  // Commons file names that replace the article's main photo (direct-from-Wikipedia mode only;
  // with a server, teachers pick photos on /admin.html instead)
  const FILE_OVERRIDES = {};

  const CACHE_KEY = 'skyq_photos_v1';
  const SERVER_CACHE_KEY = 'skyq_photos_srv';
  const CACHE_DAYS = 7;
  const WIDTH = 960; // a standard Wikimedia thumbnail size, sharp on iPad screens
  const WP = 'https://en.wikipedia.org/w/api.php';
  const COMMONS = 'https://commons.wikimedia.org/w/api.php';

  const Photos = { map: {}, ready: null, settled: false };
  const waiting = [];

  const stripHtml = (s) => {
    const d = document.createElement('div');
    d.innerHTML = String(s || '');
    return d.textContent.replace(/\s+/g, ' ').trim();
  };

  async function api(base, params) {
    const qs = new URLSearchParams(Object.assign({ format: 'json', formatversion: '2', origin: '*' }, params));
    const res = await fetch(`${base}?${qs}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

  // article title → main image file name
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
        if (byTitle[final]) out[t] = { file: byTitle[final], page: final };
      }
    }
    return out;
  }

  // file names → { src, artist, license, licenseUrl } (only files hosted on Commons)
  async function commonsInfo(files) {
    const out = {};
    for (const part of chunks(files, 45)) {
      const data = await api(COMMONS, {
        action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: String(WIDTH),
        iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl', titles: part.map((f) => 'File:' + f).join('|'),
      });
      const q = data.query || {};
      const back = {};
      for (const n of q.normalized || []) back[n.to] = n.from;
      for (const p of q.pages || []) {
        const info = p.imageinfo && p.imageinfo[0];
        if (!info || p.missing) continue;
        const meta = info.extmetadata || {};
        const asked = (back[p.title] || p.title).replace(/^File:/, '');
        out[asked] = {
          src: info.thumburl || info.url,
          artist: stripHtml(meta.Artist && meta.Artist.value) || 'Unknown photographer',
          license: stripHtml(meta.LicenseShortName && meta.LicenseShortName.value) || 'see Wikimedia Commons',
          licenseUrl: (meta.LicenseUrl && meta.LicenseUrl.value) || '',
          filePage: info.descriptionurl || '',
        };
      }
    }
    return out;
  }

  async function fetchAll() {
    const ids = Object.keys(WIKI).filter((id) => !FILE_OVERRIDES[id]);
    const titles = [...new Set(ids.flatMap((id) => WIKI[id]))];
    const images = await pageImages(titles);
    const chosen = {};
    for (const id of ids) {
      const hit = WIKI[id].map((t) => images[t]).find(Boolean);
      if (hit) chosen[id] = hit;
    }
    for (const [id, file] of Object.entries(FILE_OVERRIDES)) chosen[id] = { file: file.replace(/ /g, '_'), page: (WIKI[id] || [''])[0] };
    const info = await commonsInfo([...new Set(Object.values(chosen).map((c) => c.file))]);
    const map = {};
    for (const [id, c] of Object.entries(chosen)) {
      const i = info[c.file] || info[c.file.replace(/_/g, ' ')];
      if (i) map[id] = Object.assign({ file: c.file.replace(/_/g, ' '), page: c.page }, i);
    }
    return map;
  }

  function readCache() {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (c && Date.now() - c.ts < CACHE_DAYS * 864e5 && c.map) return c.map;
    } catch (e) { /* ignore */ }
    return null;
  }

  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full */ } };

  async function fromServer() {
    const res = await fetch('api/photos', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data || typeof data.photos !== 'object') throw new Error('no photos');
    lsSet(SERVER_CACHE_KEY, data.photos);
    return data.photos;
  }

  async function fromWikipedia() {
    const cached = readCache();
    if (cached) return cached;
    const map = await fetchAll();
    lsSet(CACHE_KEY, { ts: Date.now(), map });
    return map;
  }

  // download photos one at a time so we never fire dozens of requests at once
  async function preload(map) {
    for (const p of Object.values(map)) {
      await new Promise((done) => { const img = new Image(); img.onload = img.onerror = done; img.src = p.src; });
    }
  }

  Photos.load = function () {
    const lastServer = lsGet(SERVER_CACHE_KEY);
    if (lastServer) Photos.map = lastServer;
    Photos.ready = fromServer()
      .catch(() => lastServer || fromWikipedia())
      .catch((e) => {
        console.warn('Skyline Quest: could not load building photos, using drawings instead.', e);
        return {};
      })
      .then((map) => {
        Photos.map = map;
        Photos.settled = true;
        waiting.splice(0).forEach((fn) => fn(map));
        preload(map);
        return map;
      });
    return Photos.ready;
  };

  // run fn once the photo list has arrived (immediately if it already has)
  Photos.onReady = (fn) => (Photos.settled ? fn(Photos.map) : waiting.push(fn));

  // an <img> failed: try once more a moment later, otherwise show the drawing
  Photos.retry = (img) => {
    const wrap = img.closest('.photo-wrap');
    if (img.dataset.retried) { if (wrap) wrap.classList.add('nophoto'); return; }
    img.dataset.retried = '1';
    setTimeout(() => { img.src = img.src + (img.src.includes('?') ? '&' : '?') + 'retry=1'; }, 1500);
  };

  Photos.get = (id) => Photos.map[id] || null;
  Photos.WIKI = WIKI;

  root.Photos = Photos;
})(window);
