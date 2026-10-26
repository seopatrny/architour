/* Stand-alone Skyline Quest server for running on a school computer:
 * serves the game and the shared leaderboard API. No dependencies – just `npm start`.
 * (On Vercel, public/ is served as static files and api/index.js handles the API instead.)
 *
 * Environment variables:
 *   PORT       port to listen on (default 3000)
 *   ADMIN_KEY  password for the teacher page at /admin.html (admin is off if unset)
 *   DATA_DIR   where db.json is stored (default ./data)
 *   TIME_ZONE  used for the "Today" leaderboard (default America/Chicago)
 *   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  use Upstash Redis instead of a file
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createApp } = require('../lib/app.js');
const { createFileStore, storageFromEnv } = require('../lib/storage.js');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
};

function createServer(opts = {}) {
  const fromEnv = opts.dataDir ? { store: createFileStore(path.join(opts.dataDir, 'db.json')) } : storageFromEnv();
  const store = opts.store || fromEnv.store;
  const app = createApp({
    store,
    storageError: opts.store ? undefined : fromEnv.error,
    adminKey: opts.adminKey != null ? opts.adminKey : process.env.ADMIN_KEY || '',
    timeZone: opts.timeZone || process.env.TIME_ZONE || 'America/Chicago',
  });

  function serveStatic(req, res, url) {
    let rel;
    try { rel = decodeURIComponent(url.pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.normalize(path.join(PUBLIC_DIR, rel));
    if (!file.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); return res.end(); }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': ext === '.html' || ext === '.js' || ext === '.css' ? 'no-cache' : 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    });
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) return app.handle(req, res);
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    serveStatic(req, res, url);
  });
  server.flush = () => store && store.flush && store.flush();
  return server;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const server = createServer();
  server.listen(port, () => {
    console.log(`🏙️  Skyline Quest is running at http://localhost:${port}`);
    if (!process.env.ADMIN_KEY) console.log('   (Teacher admin page is off. Set ADMIN_KEY to turn it on.)');
  });
  const stop = () => { server.flush(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

module.exports = { createServer };
