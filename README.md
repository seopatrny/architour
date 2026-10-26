# 🏙️ Skyline Quest: Chicago River Edition

An arcade-style learning game for the iPads around school. Students learn to recognize **all 34 buildings** on the Chicago River architecture tour skyline, from Willis Tower to the Reid Murdoch clock tower, and compete for the top of a **school-wide leaderboard**.

Built for 2–5 minute sessions during breaks and passing periods: tap to play, type a name, go.

## What's in the game

| | |
|---|---|
| 🚤 **Classic Tour** | 12 buildings, 3 hearts, a timer and a speed bonus. Gets harder as you go (Rookie → Pro → Legend buildings). |
| ⚡ **Speed Blitz** | 60 seconds. Answer as many as you can. Wrong answers cost 3 seconds. |
| 💀 **Survival** | One miss and you're out. The timer gets shorter every level. |
| 📚 **Skyline Dex** | A collectible card for every building: year, height, architect, "how to spot it" and fun facts. Cards turn **gold** when mastered. |
| 🏆 **Leaderboards** | Today, This Week and All-Time for each mode, plus a **Masters** board for the most buildings mastered. |
| 🎖️ **16 badges**, **10 ranks** | From *Tourist* to *Chicago Hall of Fame*, earned with XP from every game. |

**Question types:** *Which building is this?* · *Find it!* (pick the right picture) · 🔎 *Clue Detective* (read a riddle, pick the picture) · 🕵️ *Mystery Shadow* (name a building from its silhouette).

**What makes it a game:** combo multipliers (x2, x3, x4 for streaks), confetti, a score that counts up at the end, a rank-up screen, sound effects (made in the browser, with a mute button), and a podium with a crown for #1.

**How it teaches:**
- Every wrong answer stops and shows the right building, a *"How to spot it"* tip and a fun fact.
- Questions favor the buildings a student hasn't mastered yet.
- A building is **mastered** after you get it right in **3 different games**. That spreads practice out over time, which helps it stick, and keeps a fast Speed Blitz from "mastering" everything in one minute.

**Made for shared iPads:**
- Recent players show up as one-tap buttons.
- After **90 seconds** with no taps, the game logs out and goes back to the title screen, so the next student never plays as someone else.
- Names are limited to 14 characters and checked by a school-appropriate word filter, on the iPad and on the server.
- A teacher page can delete names and reset leaderboards.
- No accounts, emails or passwords. A first name and last initial (like *Maya R*) is all it stores.

## Deploy to Vercel (recommended)

1. Import this repo in Vercel. Keep the defaults: there's no build step, and `vercel.json` already tells Vercel to serve `public/` and run the API from `api/index.js`.
2. **Connect a database.** Vercel can't save files, so the leaderboard lives in Upstash Redis. The free plan is plenty for a school. In your Vercel project, open **Storage → Create Database → Upstash (Redis)** and connect it to the project. This adds the `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_*`) variables automatically.
3. **Set a teacher password:** in **Settings → Environment Variables**, add `ADMIN_KEY` with a password of your choice.
4. **Redeploy** so the new variables take effect (Deployments → ⋯ → Redeploy).

To check it worked, open `https://<your-site>/api/health`. It should say `"ok":true` and `"storage":"upstash"`. If it says `"ok":false`, the message explains what's missing, and the game shows an orange **"Offline mode"** banner until it's fixed.

## Or run it on a school computer

You need [Node.js](https://nodejs.org) 18 or newer. There are no packages to install. Players and scores are saved to a file.

```bash
ADMIN_KEY=pick-a-teacher-password npm start
# → http://localhost:3000  (iPads use http://<this-computer>:3000)
```

| Setting | Default | What it does |
|---|---|---|
| `ADMIN_KEY` | *(off)* | Password for the teacher page at `/admin.html`. The admin page is off until you set this. |
| `TIME_ZONE` | `America/Chicago` | Decides when the "Today" leaderboard resets |
| `PORT` | `3000` | Port to listen on (school-computer mode) |
| `DATA_DIR` | `./data` | Where `db.json` is saved (school-computer mode). Back this file up. |
| `UPSTASH_REDIS_REST_URL` + `_TOKEN` | — | Use Upstash Redis instead of a file (set automatically on Vercel) |

Run the tests with `npm test`.

If the iPads can't reach the server, the game still works and an orange banner says **"Offline mode"**. Scores are then saved on that iPad only. The game reconnects by itself when the server is back.

## iPad setup (recommended)

1. Open the game in Safari, tap **Share → Add to Home Screen**. It then opens full-screen like an app.
2. Turn on **Guided Access** (Settings → Accessibility → Guided Access) to lock the iPad to the game.
3. Set **Auto-Lock** to *Never* (or a long time) if the iPads stay plugged in.
4. Turn the volume to a hallway-friendly level, or tap 🔊 in the game to mute it.

## Teacher page

Go to `/admin.html` and enter your `ADMIN_KEY`. From there you can:
- see every player's XP, games played, buildings mastered and best scores
- **delete** a player and all of their scores (for example, a name that got past the filter)
- **reset** the leaderboard for one mode or all modes (players keep their XP, badges and mastered cards). This is handy for starting a new contest.

## Customize it

All building data lives in [`public/js/buildings.js`](public/js/buildings.js): names, years, heights, architects, facts, clues and the drawings.

- **Facts:** written for kids and checked against common sources. Please review them before a big contest and fix anything your class learns differently on the actual tour.
- **Photos:** the game shows a real photo of each building. It loads them live from each building's Wikipedia article and uses the article's main photo, but only if that photo is freely licensed on Wikimedia Commons. Photos are saved on each iPad for a week. The photographer and license appear on each building card and on the **📷 Photo credits** screen (bottom-right of the title screen), as the free licenses require.
  - **Different photo:** to swap in another Commons photo for a building, add its file name to `FILE_OVERRIDES` in [`public/js/photos.js`](public/js/photos.js), for example `willis: 'Some Photo Of Willis Tower.jpg'`. Do this if an article's main photo is an interior or a poor angle.
  - **Your own photo:** save it as `public/img/buildings/<id>.jpg` (for example `willis.jpg`) and add `photo: true` to that building in `buildings.js`.
  - **Fallbacks:** if a photo can't load (no internet, or the article has no free photo), that building uses its cartoon drawing instead. Mystery Shadow questions always use the drawings, because a silhouette needs a clean outline.
- **Difficulty:** each building has a `tier` (1 = Rookie, 2 = Pro, 3 = Legend). Classic Tour and Survival start with tier 1 and add harder buildings as the game goes on.
- **Clues** must not contain the building's name. `npm test` checks this for you.

## Project layout

```
api/index.js           Vercel serverless function (the leaderboard API)
lib/app.js             leaderboard API logic (shared by Vercel and local server)
lib/storage.js         Upstash Redis or a local JSON file
local/server.js        stand-alone server for a school computer (npm start)
vercel.json            Vercel settings
public/index.html      the game
public/js/game.js      screens, modes, scoring, badges, ranks
public/js/buildings.js the 34 buildings: facts, clues, drawings
public/js/art.js       small SVG drawing kit used by the drawings
public/js/store.js     talks to the server (falls back to this-iPad-only)
public/js/names.js     name rules + word filter (shared with the server)
public/js/fx.js        sound effects and confetti
public/admin.html      teacher page
test/                  tests (npm test)
```
