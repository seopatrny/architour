/* Vercel serverless function: every /api/* request is routed here by vercel.json.
 * Players and leaderboards are stored in Upstash Redis (see README → Deploy to Vercel). */
const { createApp } = require('../lib/app.js');
const { storageFromEnv } = require('../lib/storage.js');

const { store, error } = storageFromEnv();
const app = createApp({
  store,
  storageError: error,
  adminKey: process.env.ADMIN_KEY || '',
  timeZone: process.env.TIME_ZONE || 'America/Chicago',
});

module.exports = (req, res) => app.handle(req, res);
