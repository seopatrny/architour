/* Keeps the game working if the school Wi-Fi blips: network first, cached copy as backup.
 * Leaderboard calls (/api/) are never cached. */
const CACHE = 'skyline-quest-v5';
const CORE = ['./', 'index.html', 'css/style.css', 'css/skyline.css', 'js/names.js', 'js/art.js', 'js/buildings.js', 'js/store.js', 'js/fx.js', 'js/photo-sources.js', 'js/photos.js', 'js/skyline-board.js', 'js/game.js', 'img/icon.svg', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const fonts = url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com');
  // leave the API (scores, photos) and other sites to the browser's normal handling
  if (e.request.method !== 'GET' || url.pathname.includes('/api/') || (url.origin !== location.origin && !fonts)) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
