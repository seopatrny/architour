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

## Run it

You need [Node.js](https://nodejs.org) 18 or newer. There are no packages to install.

```bash
ADMIN_KEY=pick-a-teacher-password npm start
# → http://localhost:3000
```

| Setting | Default | What it does |
|---|---|---|
| `PORT` | `3000` | Port to listen on |
| `ADMIN_KEY` | *(off)* | Password for the teacher page at `/admin.html`. The admin page is off until you set this. |
| `DATA_DIR` | `./data` | Where `db.json` (players and scores) is saved. Back this file up. |
| `TIME_ZONE` | `America/Chicago` | Decides when the "Today" leaderboard resets |

Run the tests with `npm test`.

## Put it online for the school

Every iPad has to talk to **the same server** to share one leaderboard. Pick one:

- **A school computer or server:** `npm start` on any machine the iPads can reach, then open `http://<that-computer>:3000`.
- **A hosting service** (Render, Railway, Fly.io, etc.): start command `npm start`, set `ADMIN_KEY`, and **attach a persistent disk/volume** with `DATA_DIR` pointed at it. Without a persistent disk, the free tiers of these services erase files when they restart, and the leaderboard is lost.

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
- **Real photos:** every building is drawn as a cartoon illustration, so the game works with no internet and no image licensing. To show a real photo instead, save it as `public/img/buildings/<id>.jpg` (for example `willis.jpg`) and add `photo: true` to that building. Silhouette questions still use the drawing.
- **Difficulty:** each building has a `tier` (1 = Rookie, 2 = Pro, 3 = Legend). Classic Tour and Survival start with tier 1 and add harder buildings as the game goes on.
- **Clues** must not contain the building's name. `npm test` checks this for you.

## Project layout

```
server.js              no-dependency Node server + leaderboard API
public/index.html      the game
public/js/game.js      screens, modes, scoring, badges, ranks
public/js/buildings.js the 34 buildings: facts, clues, drawings
public/js/art.js       small SVG drawing kit used by the drawings
public/js/store.js     talks to the server (falls back to this-iPad-only)
public/js/names.js     name rules + word filter (shared with the server)
public/js/fx.js        sound effects and confetti
public/admin.html      teacher page
test/                  server and data tests (npm test)
```
