/* Keeps the game working if the school Wi-Fi blips: network first, cached copy as backup.
 * Leaderboard calls (/api/) are never cached. */
const CACHE = 'skyline-quest-v3';
const CORE = ['./', 'index.html', 'css/style.css', 'js/names.js', 'js/art.js', 'js/buildings.js', 'js/store.js', 'js/fx.js', 'js/photos.js', 'js/game.js', 'img/icon.svg', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.includes('/api/')) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const sameOrFonts = url.origin === location.origin || url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com');
        // building photos from Wikimedia arrive as opaque (no-cors) image responses
        const photo = url.hostname === 'upload.wikimedia.org' && (res.ok || res.type === 'opaque');
        if ((res.ok && sameOrFonts) || photo) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
