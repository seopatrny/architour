/* Real photos of every building, loaded live from Wikipedia / Wikimedia Commons.
 *
 * For each building we look up its Wikipedia article and use the article's main photo,
 * but only if that photo lives on Wikimedia Commons (so it is freely licensed and we can
 * credit the photographer). Anything that can't load falls back to the drawing.
 *
 * To pick a different photo for a building, put its Commons file name in FILE_OVERRIDES,
 * e.g.  willis: 'Willis Tower From Lake.jpg'
 * To use your own photo instead, save it as public/img/buildings/<id>.jpg and set
 * photo: true on that building in buildings.js. */
(function (root) {
  // Wikipedia article titles to try, in order (redirects are followed)
  const WIKI = {
    lakepoint: ['Lake Point Tower'],
    aqua: ['Aqua (skyscraper)', 'Aqua Tower'],
    stregis: ['St. Regis Chicago', 'Vista Tower'],
    nbc: ['NBC Tower'],
    crain: ['Crain Communications Building', 'Smurfit-Stone Building'],
    aon: ['Aon Center (Chicago)'],
    twopru: ['Two Prudential Plaza'],
    hancock: ['875 North Michigan Avenue', 'John Hancock Center'],
    tribune: ['Tribune Tower'],
    wrigley: ['Wrigley Building'],
    london: ['London Guarantee Building'],
    carbide: ['Carbide & Carbon Building'],
    jewelers: ['35 East Wacker', 'Jewelers Building'],
    mather: ['Mather Tower'],
    trump: ['Trump International Hotel and Tower (Chicago)'],
    amaplaza: ['AMA Plaza', '330 North Wabash'],
    marina: ['Marina City'],
    reidmurdoch: ['Reid, Murdoch & Co. Building', 'Reid Murdoch Building'],
    leoburnett: ['Leo Burnett Building'],
    wacker333: ['333 Wacker Drive'],
    mart: ['Merchandise Mart'],
    salesforce: ['Salesforce Tower Chicago', 'Wolf Point (Chicago)'],
    riverpoint: ['River Point'],
    riverside150: ['150 North Riverside'],
    bofa110: ['110 North Wacker'],
    boeing: ['100 North Riverside', 'Boeing International Headquarters'],
    opera: ['Civic Opera House'],
    dailynews: ['Chicago Daily News Building', 'Riverside Plaza (Chicago)'],
    boardoftrade: ['Chicago Board of Trade Building'],
    willis: ['Willis Tower'],
    unionstation: ['Chicago Union Station'],
    franklin: ['Franklin Center (Chicago)'],
    wacker311: ['311 South Wacker Drive'],
    postoffice: ['Old Chicago Main Post Office', 'Old Post Office (Chicago)'],
  };

  // Commons file names that replace the article's main photo
  const FILE_OVERRIDES = {};

  const CACHE_KEY = 'skyq_photos_v1';
  const CACHE_DAYS = 7;
  const WIDTH = 960; // a standard Wikimedia thumbnail size, sharp on iPad screens
  const WP = 'https://en.wikipedia.org/w/api.php';
  const COMMONS = 'https://commons.wikimedia.org/w/api.php';

  const Photos = { map: {}, ready: null };

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

  Photos.load = function () {
    const cached = readCache();
    if (cached) Photos.map = cached;
    Photos.ready = (cached ? Promise.resolve(cached) : fetchAll().then((map) => {
      Photos.map = map;
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), map })); } catch (e) { /* storage full */ }
      return map;
    })).then((map) => {
      // warm the browser cache so questions don't flash while photos download
      Object.values(map).forEach((p) => { const img = new Image(); img.src = p.src; });
      return map;
    }).catch((e) => {
      console.warn('Skyline Quest: could not load building photos, using drawings instead.', e);
      return {};
    });
    return Photos.ready;
  };

  Photos.get = (id) => Photos.map[id] || null;
  Photos.WIKI = WIKI;

  root.Photos = Photos;
})(window);
