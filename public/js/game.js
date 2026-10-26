/* Skyline Quest – the game. */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const rand = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const IDLE_LIMIT = 90 * 1000; // shared iPads: log out after 90 s with no taps
  const MASTERED = 3;           // correct answers needed to master a building
  const AVATARS = ['🦊', '🐻', '🐼', '🦁', '🐯', '🐸', '🐵', '🦄', '🐙', '🦖', '🐧', '🦉', '🐬', '🦈', '🐝', '🐢',
    '🚀', '⚡', '🌟', '🔥', '🏀', '⚽', '🎮', '🎨', '🎸', '🍕', '🌮', '🍩', '👾', '🤖', '🛸', '🌈'];

  const MODES = {
    classic: { name: 'Classic Tour', icon: '🚤', color: 'pink', blurb: '12 buildings · 3 hearts · speed bonus!' },
    blitz: { name: 'Speed Blitz', icon: '⚡', color: 'yellow', blurb: '60 seconds · as many as you can!' },
    survival: { name: 'Survival', icon: '💀', color: 'purple', blurb: 'One miss and you\'re out. How far can you go?' },
  };

  const RANKS = [
    [0, 'Tourist', '🧳'], [2500, 'Deckhand', '⚓'], [7500, 'First Mate', '🧭'], [15000, 'Tour Guide', '🎙️'],
    [30000, 'Junior Architect', '📐'], [50000, 'Architect', '🏗️'], [80000, 'Senior Architect', '🏢'],
    [120000, 'Master Builder', '🏛️'], [175000, 'Skyline Legend', '🌆'], [250000, 'Chicago Hall of Fame', '👑'],
  ];

  const BADGES = [
    { id: 'first_game', icon: '🚤', name: 'First Voyage', desc: 'Finish your first game' },
    { id: 'streak5', icon: '🔥', name: 'On Fire', desc: 'Get 5 right in a row' },
    { id: 'streak10', icon: '☄️', name: 'Unstoppable', desc: 'Get 10 right in a row' },
    { id: 'speedy', icon: '⚡', name: 'Lightning Eyes', desc: 'Answer right in under 2 seconds' },
    { id: 'perfect', icon: '💎', name: 'Perfect Tour', desc: 'Finish a Classic Tour with no mistakes' },
    { id: 'blitz20', icon: '🏎️', name: 'Blitz Master', desc: 'Get 20 right in one Speed Blitz' },
    { id: 'survive15', icon: '🛡️', name: 'Survivor', desc: 'Reach 15 in Survival' },
    { id: 'shadow3', icon: '🕵️', name: 'Shadow Spotter', desc: 'Name 3 mystery shadows in one game' },
    { id: 'clue3', icon: '🔎', name: 'Clue Detective', desc: 'Solve 3 clues in one game' },
    { id: 'score5k', icon: '💰', name: 'High Roller', desc: 'Score 5,000 in one game' },
    { id: 'score10k', icon: '👑', name: 'Skyline Royalty', desc: 'Score 10,000 in one game' },
    { id: 'master5', icon: '🏗️', name: 'Rising Architect', desc: 'Master 5 buildings' },
    { id: 'master15', icon: '🏙️', name: 'Skyline Expert', desc: 'Master 15 buildings' },
    { id: 'masterall', icon: '🏆', name: 'Skyline Legend', desc: 'Master EVERY building' },
    { id: 'explorer', icon: '📚', name: 'Curious Explorer', desc: 'Open 10 cards in the Skyline Dex' },
    { id: 'games10', icon: '⚓', name: 'Crew Member', desc: 'Play 10 games' },
  ];
  const BADGE = Object.fromEntries(BADGES.map((b) => [b.id, b]));

  const App = { player: null, screen: null, game: null, idleAt: Date.now() };

  /* ---------------- helpers ---------------- */
  function rankFor(xp) {
    let i = 0;
    while (i + 1 < RANKS.length && xp >= RANKS[i + 1][0]) i++;
    const [min, title, icon] = RANKS[i];
    const next = RANKS[i + 1] ? RANKS[i + 1][0] : null;
    return { level: i + 1, title, icon, min, next, pct: next ? (xp - min) / (next - min) : 1 };
  }
  const mastery = (id) => (App.player && App.player.mastery[id]) || 0;
  const masteredCount = () => BUILDINGS.filter((b) => mastery(b.id) >= MASTERED).length;
  const stars = (n) => [0, 1, 2].map((i) => `<span class="star ${i < n ? 'on' : ''}">★</span>`).join('');

  // Real photo when we have one, shown whole (no cropping) over a blurred copy of itself.
  // The drawing sits underneath as a backup if the photo can't load.
  // Mystery shadows always use the drawing, since they need a clean outline.
  function pic(b, opts = {}) {
    const drawing = Art.renderBuilding(b, opts);
    if (opts.shadow) return drawing;
    const ph = Photos.get(b.id);
    const src = b.photo ? `img/buildings/${b.id}.jpg` : ph && ph.src;
    if (!src) {
      // photo list still on its way: show the drawing for now and swap it when it arrives
      return Photos.settled ? drawing : `<div class="photo-pending" data-id="${b.id}" data-title="${esc(opts.title || '')}">${drawing}</div>`;
    }
    return `<div class="photo-wrap"><img class="bphoto-bg" src="${esc(src)}" alt="" aria-hidden="true" draggable="false">` +
      `<img class="bphoto" src="${esc(src)}" alt="${esc(opts.title || '')}" draggable="false" onerror="Photos.retry(this)">${drawing}</div>`;
  }

  Photos.onReady(() => {
    $$('.photo-pending').forEach((el) => {
      const b = BY_ID[el.dataset.id];
      if (b) el.outerHTML = pic(b, { title: el.dataset.title });
    });
  });

  function credit(b) {
    const ph = !b.photo && Photos.get(b.id);
    if (!ph) return '';
    return `<div class="credit">📷 ${esc(ph.artist)} · ${esc(ph.license)} · Wikimedia Commons</div>`;
  }

  function showCredits() {
    const rows = BUILDINGS.map((b) => [b, !b.photo && Photos.get(b.id)]).filter(([, ph]) => ph);
    modal(`<button class="x" data-close>✖</button><h3>📷 Photo credits</h3>
      <p class="credits-intro">Building photos come from Wikimedia Commons and are used under their free licenses. Thank you, photographers!</p>
      ${rows.length ? `<ul class="credits">${rows.map(([b, ph]) => `<li><b>${esc(b.name)}</b> – ${esc(ph.artist)}, <i>${esc(ph.license)}</i>
        <small>${esc(ph.filePage || ph.file)}${ph.licenseUrl ? ` · ${esc(ph.licenseUrl)}` : ''}</small></li>`).join('')}</ul>`
        : '<p>Photos haven\'t loaded yet, so the game is showing drawings.</p>'}`, 'card-modal');
  }

  function show(id, html) {
    const el = $('#s-' + id);
    if (html != null) el.innerHTML = html;
    $$('.screen').forEach((s) => s.classList.toggle('active', s === el));
    App.screen = id;
    el.scrollTop = 0;
    return el;
  }

  function toast(html, cls = '') {
    const t = document.createElement('div');
    t.className = 'toast ' + cls;
    t.innerHTML = html;
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3100);
  }

  function modal(html, cls = '') {
    const m = $('#modal');
    m.className = 'modal ' + cls;
    m.innerHTML = `<div class="modal-card">${html}</div>`;
    m.onclick = (e) => { if (e.target === m || e.target.closest('[data-close]')) closeModal(); };
    return m;
  }
  function closeModal() { $('#modal').className = 'modal hidden'; $('#modal').innerHTML = ''; }

  function center(el) {
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }

  function header(title, back = 'menu') {
    return `<header class="bar"><button class="btn small ghost" data-go="${back}">◀ Back</button><h2>${title}</h2><span class="bar-spacer"></span></header>`;
  }

  /* ---------------- title / attract screen ---------------- */
  const SKYLINE_IDS = ['mart', 'wacker333', 'marina', 'amaplaza', 'trump', 'wrigley', 'tribune', 'carbide', 'aon', 'twopru', 'stregis', 'aqua', 'lakepoint'];
  let tickerTimer = null;

  function showTitle() {
    App.player = null;
    App.game = null;
    closeModal();
    const sky = Art.renderSkyline(SKYLINE_IDS.map((id) => BY_ID[id]).concat([BY_ID.willis, BY_ID.hancock]), { step: 88 });
    show('title', `
      <div class="stars"></div>
      <div class="title-wrap">
        <div class="logo">
          <div class="logo-top">CHICAGO RIVER</div>
          <h1>SKYLINE<br><span>QUEST</span></h1>
          <div class="logo-sub">Name every building. Beat the leaderboard!</div>
        </div>
        <button class="btn huge yellow pulse" id="startBtn">▶ TAP TO PLAY</button>
        <div class="ticker" id="ticker"></div>
      </div>
      <button class="credits-btn" id="creditsBtn">📷 Photo credits</button>
      <div class="title-sky">${sky}<div class="boat">🚤</div><div class="water"></div></div>`);
    $('#s-title').onclick = () => { Sfx.unlock(); Sfx.play('start'); showLogin(); };
    $('#creditsBtn').onclick = (e) => { e.stopPropagation(); showCredits(); };
    loadTicker();
  }

  async function loadTicker() {
    clearInterval(tickerTimer);
    const el = $('#ticker');
    let rows = [];
    try { rows = await Store.leaderboard('classic', 'today'); } catch (e) { /* ignore */ }
    if (!rows.length) try { rows = await Store.leaderboard('classic', 'all'); } catch (e) { /* ignore */ }
    if (!el) return;
    if (!rows.length) { el.innerHTML = '🏆 No champions yet – <b>be the first!</b>'; return; }
    const medal = ['🥇', '🥈', '🥉', '4th', '5th'];
    const lines = rows.slice(0, 5).map((r, i) => `${medal[i]} <b>${esc(r.avatar)} ${esc(r.name)}</b> · ${fmt(r.score)} pts`);
    let i = 0;
    const tick = () => { if (App.screen !== 'title') return clearInterval(tickerTimer); el.innerHTML = `<span class="tick-in">${lines[i++ % lines.length]}</span>`; };
    tick();
    tickerTimer = setInterval(tick, 2500);
  }

  /* ---------------- login ---------------- */
  function showLogin() {
    const recent = Store.recent();
    show('login', `
      <header class="bar"><button class="btn small ghost" id="toTitle">◀</button><h2>Who's playing?</h2><span class="bar-spacer"></span></header>
      <div class="login">
        ${recent.length ? `<div class="recent">${recent.map((r, i) => `
          <button class="player-chip" data-i="${i}"><span class="av">${esc(r.avatar)}</span><span>${esc(r.name)}</span></button>`).join('')}
        </div><div class="or">— or type your name —</div>` : ''}
        <form id="nameForm" class="name-form" autocomplete="off">
          <input id="nameIn" maxlength="14" placeholder="Your name" autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="go">
          <button class="btn green big" type="submit">GO ▶</button>
        </form>
        <p class="hint">Use your first name and last initial, like <b>Maya R</b>. Use the same name every time to keep your progress!</p>
        <p class="err" id="nameErr"></p>
      </div>`);
    $('#toTitle').onclick = showTitle;
    $$('.player-chip').forEach((b) => (b.onclick = () => login(recent[b.dataset.i].name)));
    $('#nameForm').onsubmit = (e) => { e.preventDefault(); login($('#nameIn').value); };
  }

  async function login(raw) {
    const c = Names.check(raw);
    const err = $('#nameErr');
    if (!c.ok) { if (err) err.textContent = c.reason; Sfx.play('wrong'); return; }
    Sfx.play('click');
    let p = null;
    try { p = await Store.getPlayer(c.name); } catch (e) { /* treat as new */ }
    if (p) return enter(p, true);
    pickAvatar(c.name);
  }

  function pickAvatar(name) {
    show('login', `
      <header class="bar"><button class="btn small ghost" id="back">◀</button><h2>Hi ${esc(name)}! Pick your avatar</h2><span class="bar-spacer"></span></header>
      <div class="avatars">${AVATARS.map((a) => `<button class="avatar" data-a="${a}">${a}</button>`).join('')}</div>
      <p class="err" id="nameErr"></p>`);
    $('#back').onclick = showLogin;
    $$('.avatar').forEach((b) => (b.onclick = async () => {
      Sfx.play('coin');
      b.classList.add('chosen');
      try {
        const p = await Store.savePlayer(name, { avatar: b.dataset.a });
        enter(p, false);
      } catch (e) {
        $('#nameErr').textContent = e.userError ? e.message : 'Hmm, something went wrong. Try again!';
      }
    }));
  }

  function enter(p, returning) {
    App.player = p;
    Store.remember(p);
    showMenu();
    toast(returning ? `Welcome back, <b>${esc(p.name)}</b>! ${esc(p.avatar)}` : `Welcome aboard, <b>${esc(p.name)}</b>! ${esc(p.avatar)}`);
  }

  /* ---------------- main menu ---------------- */
  function showMenu() {
    const p = App.player;
    const r = rankFor(p.xp);
    const m = masteredCount();
    show('menu', `
      <header class="player-bar">
        <div class="me"><span class="av big">${esc(p.avatar)}</span>
          <div><div class="me-name">${esc(p.name)}</div>
          <div class="me-rank">${r.icon} Lv ${r.level} · ${r.title}</div>
          <div class="xpbar"><div style="width:${Math.round(r.pct * 100)}%"></div></div>
          <div class="xp-txt">${fmt(p.xp)} XP${r.next ? ` · ${fmt(r.next - p.xp)} to next rank` : ' · MAX RANK!'}</div></div>
        </div>
        <div class="bar-btns">
          <button class="btn small ghost" id="mute">${Sfx.muted ? '🔇' : '🔊'}</button>
          <button class="btn small ghost" id="logout">Done 👋</button>
        </div>
      </header>
      <div class="modes">
        ${Object.entries(MODES).map(([k, v]) => `
          <button class="mode-card ${v.color}" data-mode="${k}">
            <span class="mode-icon">${v.icon}</span>
            <span class="mode-name">${v.name}</span>
            <span class="mode-blurb">${v.blurb}</span>
            <span class="mode-best">Best: ${fmt((p.best && p.best[k]) || 0)}</span>
          </button>`).join('')}
      </div>
      <div class="menu-row">
        <button class="tile cyan" data-go="dex"><span class="tile-icon">📚</span><span>Skyline Dex</span><small>${m}/${BUILDINGS.length} mastered</small>
          <span class="mini-bar"><span style="width:${(m / BUILDINGS.length) * 100}%"></span></span></button>
        <button class="tile orange" data-go="board"><span class="tile-icon">🏆</span><span>Leaderboard</span><small>Who's on top?</small></button>
        <button class="tile green" data-go="badges"><span class="tile-icon">🎖️</span><span>Badges</span><small>${p.achievements.length}/${BADGES.length} earned</small></button>
      </div>`);
    $$('[data-mode]').forEach((b) => (b.onclick = () => startGame(b.dataset.mode)));
    $('#logout').onclick = showTitle;
    $('#mute').onclick = (e) => { Sfx.muted = !Sfx.muted; Store.pref('muted', Sfx.muted); e.target.textContent = Sfx.muted ? '🔇' : '🔊'; };
  }

  /* ---------------- question builder ---------------- */
  function maxTierFor(mode, n) {
    if (mode === 'classic') return n < 4 ? 1 : n < 8 ? 2 : 3;
    if (mode === 'survival') return n < 5 ? 1 : n < 12 ? 2 : 3;
    return n < 6 ? 2 : 3;
  }

  function weightedPick(pool, weight) {
    const ws = pool.map(weight);
    let r = Math.random() * ws.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }

  function pickType(mode, n) {
    const r = Math.random();
    if (mode === 'blitz') return r < 0.7 ? 'pic2name' : 'name2pic';
    if (mode === 'survival' && n < 4) return 'pic2name';
    if (mode === 'classic' && n < 3) return r < 0.7 ? 'pic2name' : 'name2pic';
    if (r < 0.42) return 'pic2name';
    if (r < 0.62) return 'name2pic';
    if (r < 0.82) return 'clue2pic';
    return 'shadow2name';
  }

  function makeQuestion(g) {
    const n = g.asked;
    const maxTier = maxTierFor(g.mode, n);
    let type = pickType(g.mode, n);
    let pool = BUILDINGS.filter((b) => b.tier <= maxTier && !g.recent.includes(b.id));
    if (type === 'shadow2name') pool = pool.filter((b) => !b.noShadow);
    if (!pool.length) pool = BUILDINGS.filter((b) => !g.recent.includes(b.id));
    // favour buildings this player hasn't mastered yet, and the newest tier
    const answer = weightedPick(pool, (b) => (b.tier === maxTier ? 1.5 : 1) * (1 + 2 * Math.max(0, MASTERED - mastery(b.id))));
    if (type === 'shadow2name' && answer.noShadow) type = 'pic2name';
    g.recent.push(answer.id);
    if (g.recent.length > 10) g.recent.shift();
    const others = shuffle(BUILDINGS.filter((b) => b.id !== answer.id));
    const near = others.filter((b) => Math.abs(b.tier - answer.tier) <= 1);
    const choices = shuffle([answer, ...(near.length >= 3 ? near : others).slice(0, 3)]);
    let limit = g.mode === 'classic' ? 15 : g.mode === 'survival' ? Math.max(6, 13 - n * 0.3) : 0;
    if (type === 'clue2pic' && limit) limit += 5;
    return { type, answer, choices, tier: answer.tier, limit, clue: rand(answer.clues) };
  }

  /* ---------------- game ---------------- */
  function startGame(mode) {
    const g = App.game = {
      mode, score: 0, streak: 0, bestStreak: 0, lives: mode === 'classic' ? 3 : 1, asked: 0, correct: 0,
      total: mode === 'classic' ? 12 : Infinity, recent: [], gains: {}, newBadges: [], shadowRight: 0, clueRight: 0,
      timeLeft: 60, over: false, q: null, raf: 0, locked: true,
    };
    show('game', `
      <div class="hud">
        <div class="hud-l" id="hudL"></div>
        <div class="hud-m" id="hudM"></div>
        <div class="hud-r"><div class="score-lbl">SCORE</div><div class="score" id="score">0</div></div>
        <button class="quit" id="quit" aria-label="Quit">✖</button>
      </div>
      <div class="timer"><div id="timerFill"></div></div>
      <div class="combo" id="combo"></div>
      <div class="stage" id="stage"></div>`);
    $('#quit').onclick = () => {
      const was = g.locked;
      g.locked = true;
      g.paused = performance.now();
      modal(`<h3>Quit this game?</h3><p>Your score won't be saved.</p>
        <div class="row"><button class="btn green" data-close id="keep">Keep playing</button><button class="btn red" id="reallyQuit">Quit</button></div>`);
      $('#keep').onclick = () => { closeModal(); resume(g, was); };
      $('#modal').onclick = (e) => { if (e.target.id === 'modal') { closeModal(); resume(g, was); } };
      $('#reallyQuit').onclick = () => { closeModal(); endTimers(g); g.over = true; showMenu(); };
    };
    updateHud();
    countdown().then(() => { if (App.game === g) { g.startedAt = performance.now(); nextQuestion(); } });
  }

  function resume(g, wasLocked) {
    const pausedFor = performance.now() - g.paused;
    if (g.qStart) g.qStart += pausedFor;
    if (g.blitzEnd) g.blitzEnd += pausedFor;
    g.paused = 0;
    g.locked = wasLocked;
  }

  async function countdown() {
    const stage = $('#stage');
    for (const t of ['3', '2', '1', 'GO!']) {
      stage.innerHTML = `<div class="countdown">${t}</div>`;
      Sfx.play(t === 'GO!' ? 'coin' : 'tick');
      await sleep(t === 'GO!' ? 500 : 650);
    }
  }

  function endTimers(g) { cancelAnimationFrame(g.raf); }

  function updateHud() {
    const g = App.game;
    if (!g) return;
    $('#score').textContent = fmt(g.score);
    if (g.mode === 'blitz') {
      $('#hudL').innerHTML = `<div class="clock ${g.timeLeft < 10 ? 'low' : ''}">⏱ ${Math.ceil(Math.max(0, g.timeLeft))}</div>`;
      $('#hudM').innerHTML = `<div class="qcount">✅ ${g.correct}</div>`;
    } else if (g.mode === 'classic') {
      $('#hudL').innerHTML = [0, 1, 2].map((i) => `<span class="heart ${i < g.lives ? '' : 'lost'}">❤️</span>`).join('');
      $('#hudM').innerHTML = `<div class="qcount">${Math.min(g.asked, g.total)} / ${g.total}</div>`;
    } else {
      $('#hudL').innerHTML = `<span class="heart">💀</span>`;
      $('#hudM').innerHTML = `<div class="qcount">Level ${g.asked}</div>`;
    }
    const mult = multiplier(g.streak);
    $('#combo').innerHTML = g.streak >= 2
      ? `<span class="streak ${mult > 1 ? 'hot' : ''}">🔥 ${g.streak} streak${mult > 1 ? ` · <b>x${mult}</b>` : ''}</span>` : '';
  }

  const multiplier = (streak) => (streak >= 10 ? 4 : streak >= 6 ? 3 : streak >= 3 ? 2 : 1);

  function nextQuestion() {
    const g = App.game;
    if (!g || g.over) return;
    if (g.asked >= g.total || g.lives <= 0) return finish();
    const q = g.q = makeQuestion(g);
    g.asked++;
    updateHud();
    renderQuestion(q);
    g.locked = false;
    g.qStart = performance.now();
    if (g.mode === 'blitz' && !g.blitzEnd) g.blitzEnd = performance.now() + 60000;
    runTimer(g);
  }

  function runTimer(g) {
    cancelAnimationFrame(g.raf);
    const fill = $('#timerFill');
    let lastSec = null;
    const frame = () => {
      if (App.game !== g || g.over) return;
      if (!g.paused) {
        const now = performance.now();
        if (g.mode === 'blitz') {
          g.timeLeft = (g.blitzEnd - now) / 1000;
          fill.style.width = Math.max(0, (g.timeLeft / 60) * 100) + '%';
          fill.className = g.timeLeft < 10 ? 'low' : '';
          const s = Math.ceil(g.timeLeft);
          if (s !== lastSec) { lastSec = s; updateHud(); if (s <= 5 && s > 0) Sfx.play('tick'); }
          if (g.timeLeft <= 0) { g.over = true; g.locked = true; return finish(); }
        } else if (!g.locked && g.q.limit) {
          const left = g.q.limit - (now - g.qStart) / 1000;
          fill.style.width = Math.max(0, (left / g.q.limit) * 100) + '%';
          fill.className = left < 4 ? 'low' : '';
          const s = Math.ceil(left);
          if (s !== lastSec) { lastSec = s; if (s <= 3 && s > 0) Sfx.play('tick'); }
          if (left <= 0) return answer(null);
        }
      }
      g.raf = requestAnimationFrame(frame);
    };
    g.raf = requestAnimationFrame(frame);
  }

  const LETTERS = ['▲', '◆', '●', '■'];

  function renderQuestion(q) {
    const stage = $('#stage');
    const shapes = (i) => `<span class="shape">${LETTERS[i]}</span>`;
    if (q.type === 'pic2name' || q.type === 'shadow2name') {
      const shadow = q.type === 'shadow2name';
      stage.innerHTML = `
        <div class="q q-pic ${shadow ? 'is-shadow' : ''}">
          <div class="q-picture">
            ${shadow ? '<div class="tag purple">🕵️ MYSTERY SHADOW</div>' : ''}
            <div class="card-frame" id="qpic">${pic(q.answer, { shadow, title: shadow ? 'Mystery building' : 'Which building?' })}</div>
          </div>
          <div class="q-side">
            <div class="prompt">${shadow ? 'Whose shadow is this?' : 'Which building is this?'}</div>
            <div class="answers">${q.choices.map((b, i) => `<button class="ans a${i}" data-id="${b.id}">${shapes(i)}<span>${esc(b.name)}</span></button>`).join('')}</div>
          </div>
        </div>`;
    } else {
      const prompt = q.type === 'clue2pic'
        ? `<div class="tag cyan">🔎 CLUE</div><div class="prompt clue">“${esc(q.clue)}”</div>`
        : `<div class="tag yellow">🎯 FIND IT</div><div class="prompt find">${esc(q.answer.name)}</div>`;
      stage.innerHTML = `
        <div class="q q-find">
          <div class="q-prompt">${prompt}</div>
          <div class="pic-answers">${q.choices.map((b, i) => `<button class="pans a${i}" data-id="${b.id}">${shapes(i)}${pic(b)}</button>`).join('')}</div>
        </div>`;
    }
    $$('[data-id]', stage).forEach((btn) => (btn.onclick = () => answer(btn.dataset.id, btn)));
  }

  // at most one star per building per game, so mastering takes practice across several games
  function bumpMastery(g, b) {
    if (g.gains[b.id]) return;
    const before = mastery(b.id);
    const after = Math.min(5, before + 1);
    App.player.mastery[b.id] = after;
    g.gains[b.id] = { from: before, to: after };
  }

  function earn(g, id) {
    if (App.player.achievements.includes(id) || g.newBadges.includes(id)) return;
    g.newBadges.push(id);
    const b = BADGE[id];
    Sfx.play('badge');
    toast(`<span class="toast-icon">${b.icon}</span><div><small>BADGE UNLOCKED!</small><b>${b.name}</b></div>`, 'badge');
  }

  async function answer(id, btn) {
    const g = App.game;
    if (!g || g.locked || g.over) return;
    g.locked = true;
    const q = g.q;
    const took = (performance.now() - g.qStart) / 1000;
    const right = id === q.answer.id;
    const stage = $('#stage');
    $$('[data-id]', stage).forEach((b) => {
      b.disabled = true;
      if (b.dataset.id === q.answer.id) b.classList.add('correct');
      else if (b.dataset.id === id) b.classList.add('wrong');
      else b.classList.add('dim');
    });
    if (q.type === 'shadow2name') $('#qpic').innerHTML = pic(q.answer);

    if (right) {
      g.streak++;
      g.correct++;
      g.bestStreak = Math.max(g.bestStreak, g.streak);
      const mult = multiplier(g.streak);
      const base = { 1: 100, 2: 150, 3: 200 }[q.tier];
      const speed = q.limit ? Math.round(100 * Math.max(0, 1 - took / q.limit)) : 0;
      const pts = (base + speed) * mult;
      g.score += pts;
      bumpMastery(g, q.answer);
      if (q.type === 'shadow2name') g.shadowRight++;
      if (q.type === 'clue2pic') g.clueRight++;
      Sfx.play('correct');
      const [x, y] = center(btn || $('.correct', stage));
      Fx.burst(x, y, 28);
      Fx.float(`+${fmt(pts)}`, x, y - 20, mult > 1 ? 'hot' : '');
      if ([3, 6, 10].includes(g.streak)) {
        setTimeout(() => Sfx.play('combo'), 150);
        const c = document.createElement('div');
        c.className = 'combo-pop';
        c.textContent = `COMBO x${mult}!`;
        $('#s-game').appendChild(c);
        setTimeout(() => c.remove(), 1200);
      }
      if (g.streak >= 5) earn(g, 'streak5');
      if (g.streak >= 10) earn(g, 'streak10');
      if (took < 2) earn(g, 'speedy');
      if (g.mode === 'survival' && g.correct >= 15) earn(g, 'survive15');
      updateHud();
      await sleep(g.mode === 'blitz' ? 450 : 1000);
      if (App.game === g && !g.over) nextQuestion();
      return;
    }

    // wrong or time's up
    g.streak = 0;
    Sfx.play('wrong');
    $('#s-game').classList.add('shake');
    setTimeout(() => $('#s-game').classList.remove('shake'), 400);
    if (!id) Fx.float("TIME'S UP!", innerWidth / 2, innerHeight / 3, 'bad');
    if (g.mode === 'blitz') {
      g.blitzEnd -= 3000;
      Fx.float('-3 sec', innerWidth / 2, 90, 'bad');
      updateHud();
      await sleep(900);
      if (App.game === g && !g.over) nextQuestion();
      return;
    }
    g.lives--;
    updateHud();
    if (g.mode === 'classic' && g.lives >= 0) {
      const h = $$('.heart')[g.lives];
      if (h) h.classList.add('pop');
    }
    await sleep(500);
    if (App.game !== g) return;
    const last = g.lives <= 0 || g.asked >= g.total;
    learnPanel(q.answer, id ? BY_ID[id] : null, last ? (g.mode === 'survival' ? 'See my score ▶' : 'Finish ▶') : 'Next ▶', () => {
      if (App.game === g) nextQuestion();
    });
  }

  function learnPanel(b, picked, next, cb) {
    modal(`
      <div class="learn">
        <div class="learn-pic">${pic(b)}</div>
        <div class="learn-txt">
          <div class="oops">${picked ? `Oops! That was not the ${esc(picked.name)}.` : "Time's up!"}</div>
          <h3>This is the <span>${esc(b.name)}</span></h3>
          <div class="spot"><b>👀 How to spot it:</b> ${esc(b.spot)}</div>
          <div class="fact">💡 ${esc(rand(b.facts))}</div>
          <button class="btn yellow big" id="learnNext">${next}</button>
        </div>
      </div>`, 'learn-modal');
    $('#modal').onclick = null;
    $('#learnNext').onclick = () => { Sfx.play('click'); closeModal(); cb(); };
  }

  /* ---------------- results ---------------- */
  async function finish() {
    const g = App.game;
    if (!g || g.done) return;
    g.done = true;
    g.over = true;
    endTimers(g);
    const p = App.player;
    if (g.mode === 'classic' && g.correct === g.total) { g.perfect = true; g.score += 1000; }

    // badges that depend on the whole game
    const mastered = masteredCount();
    const wanted = ['first_game'];
    if (g.perfect) wanted.push('perfect');
    if (g.mode === 'blitz' && g.correct >= 20) wanted.push('blitz20');
    if (g.shadowRight >= 3) wanted.push('shadow3');
    if (g.clueRight >= 3) wanted.push('clue3');
    if (g.score >= 5000) wanted.push('score5k');
    if (g.score >= 10000) wanted.push('score10k');
    if (mastered >= 5) wanted.push('master5');
    if (mastered >= 15) wanted.push('master15');
    if (mastered >= BUILDINGS.length) wanted.push('masterall');
    if (p.games + 1 >= 10) wanted.push('games10');
    for (const id of wanted) if (!p.achievements.includes(id) && !g.newBadges.includes(id)) g.newBadges.push(id);

    const ended = g.mode === 'classic' && g.lives > 0 ? 'TOUR COMPLETE!' : g.mode === 'blitz' ? "TIME'S UP!" : 'GAME OVER';
    show('results', `<div class="results"><h1 class="res-title">${ended}</h1><div class="saving">Saving your score…</div></div>`);
    Sfx.play(g.correct > 0 ? 'win' : 'gameover');

    const oldRank = rankFor(p.xp);
    const body = {
      mode: g.mode, score: g.score, avatar: p.avatar, mastery: p.mastery,
      achievements: [...p.achievements, ...g.newBadges], dexViewed: p.dexViewed,
    };
    let res;
    try {
      res = await Store.submitScore(p.name, body);
      App.player = Object.assign(res.player, { mastery: Object.assign({}, res.player.mastery, p.mastery) });
    } catch (e) {
      res = { newBest: false, ranks: {} };
      p.xp += g.score;
      p.achievements = body.achievements;
    }
    if (App.game !== g) return;
    showResults(g, res, oldRank);
  }

  function showResults(g, res, oldRank) {
    const p = App.player;
    const newRank = rankFor(p.xp);
    const acc = g.asked ? Math.round((g.correct / g.asked) * 100) : 0;
    const gains = Object.entries(g.gains);
    const newlyMastered = gains.filter(([, v]) => v.from < MASTERED && v.to >= MASTERED).map(([id]) => BY_ID[id]);
    const r = res.ranks || {};
    const place = r.today ? `#${r.today} today` : '';
    const ended = g.mode === 'classic' && g.lives > 0 ? 'TOUR COMPLETE!' : g.mode === 'blitz' ? "TIME'S UP!" : 'GAME OVER';
    show('results', `
      <div class="results">
        <h1 class="res-title">${ended}</h1>
        <div class="res-mode">${MODES[g.mode].icon} ${MODES[g.mode].name}</div>
        ${res.newBest ? '<div class="new-best">⭐ NEW PERSONAL BEST! ⭐</div>' : ''}
        <div class="big-score" id="bigScore">0</div>
        ${g.perfect ? '<div class="perfect">💎 PERFECT TOUR BONUS +1,000</div>' : ''}
        <div class="res-stats">
          <div><b>${g.correct}/${g.asked}</b><small>correct</small></div>
          <div><b>${acc}%</b><small>accuracy</small></div>
          <div><b>🔥 ${g.bestStreak}</b><small>best streak</small></div>
          ${place ? `<div class="rank-chip"><b>🏆 ${place}</b><small>${r.all ? `#${r.all} all-time` : ''}</small></div>` : ''}
        </div>
        <div class="xp-gain">
          <div class="me-rank">${newRank.icon} Lv ${newRank.level} · ${newRank.title}</div>
          <div class="xpbar big"><div id="xpFill" style="width:${Math.round(oldRank.pct * 100)}%"></div></div>
          <div class="xp-txt">+${fmt(g.score)} XP</div>
        </div>
        ${newlyMastered.length ? `<div class="res-section"><h3>🏅 Newly mastered!</h3><div class="mini-cards">${newlyMastered.map((b) => `<div class="mini-card gold">${pic(b)}<span>${esc(b.name)}</span></div>`).join('')}</div></div>` : ''}
        ${g.newBadges.length ? `<div class="res-section"><h3>🎖️ New badges</h3><div class="badge-row">${g.newBadges.map((id) => `<div class="badge-pill">${BADGE[id].icon} ${BADGE[id].name}</div>`).join('')}</div></div>` : ''}
        ${gains.length && !newlyMastered.length ? `<div class="res-section"><h3>⭐ Cards upgraded</h3><div class="badge-row">${gains.slice(0, 8).map(([id, v]) => `<div class="badge-pill">${esc(BY_ID[id].name)} ${stars(Math.min(MASTERED, v.to))}</div>`).join('')}</div></div>` : ''}
        <div class="res-btns">
          <button class="btn huge pink" id="again">↻ Play again</button>
          <button class="btn big cyan" data-go="board">🏆 Leaderboard</button>
          <button class="btn big ghost" data-go="menu">Menu</button>
          <button class="btn big ghost" id="done">Done 👋</button>
        </div>
      </div>`);
    $('#again').onclick = () => startGame(g.mode);
    $('#done').onclick = showTitle;
    App.boardMode = g.mode;

    // count the score up
    const el = $('#bigScore');
    const t0 = performance.now(), dur = 1200;
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      el.textContent = fmt(g.score * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
      else {
        if (g.score > 0) Fx.rain(res.newBest ? 220 : 90);
        const fill = $('#xpFill');
        if (fill) fill.style.width = (newRank.level > oldRank.level ? 100 : Math.round(newRank.pct * 100)) + '%';
        if (newRank.level > oldRank.level) setTimeout(() => levelUp(newRank), 700);
      }
    };
    requestAnimationFrame(step);
  }

  function levelUp(rank) {
    Sfx.play('levelup');
    Fx.rain(200);
    modal(`<div class="levelup"><div class="lv-icon">${rank.icon}</div><h3>RANK UP!</h3>
      <p>You are now a</p><div class="lv-title">${rank.title}</div><p>Level ${rank.level}</p>
      <button class="btn yellow big" data-close>Awesome!</button></div>`);
  }

  /* ---------------- Skyline Dex ---------------- */
  function showDex(filter = App.dexFilter || 0) {
    App.dexFilter = filter;
    const list = BUILDINGS.filter((b) => !filter || b.tier === filter);
    const seen = (b) => mastery(b.id) > 0 || App.player.dexViewed.includes(b.id);
    show('dex', `
      ${header(`📚 Skyline Dex <small>${masteredCount()}/${BUILDINGS.length} mastered</small>`)}
      <div class="tabs">${[[0, 'All'], [1, '⭐ Rookie'], [2, '⭐⭐ Pro'], [3, '⭐⭐⭐ Legend']].map(([t, l]) => `<button class="tab ${t === filter ? 'on' : ''}" data-tier="${t}">${l}</button>`).join('')}</div>
      <p class="dex-hint">Get a building right in ${MASTERED} different games to <b>master</b> it and turn its card gold! Tap any card to study it.</p>
      <div class="dex">${list.map((b) => {
        const m = mastery(b.id), s = seen(b);
        return `<button class="dex-card ${m >= MASTERED ? 'gold' : m ? 'silver' : ''}" data-b="${b.id}">
          <span class="dex-num">#${b.stop}</span>
          ${pic(b, { shadow: !s })}
          <span class="dex-name">${s ? esc(b.name) : '???'}</span>
          <span class="dex-stars">${stars(Math.min(MASTERED, m))}</span>
          ${m >= MASTERED ? '<span class="ribbon">MASTERED</span>' : ''}
        </button>`;
      }).join('')}</div>`);
    $$('[data-tier]').forEach((t) => (t.onclick = () => { Sfx.play('click'); showDex(+t.dataset.tier); }));
    $$('[data-b]').forEach((c) => (c.onclick = () => openCard(BY_ID[c.dataset.b])));
  }

  function openCard(b) {
    Sfx.play('coin');
    const p = App.player;
    if (!p.dexViewed.includes(b.id)) {
      p.dexViewed.push(b.id);
      if (p.dexViewed.length >= 10 && !p.achievements.includes('explorer')) {
        p.achievements.push('explorer');
        Sfx.play('badge');
        toast(`<span class="toast-icon">📚</span><div><small>BADGE UNLOCKED!</small><b>Curious Explorer</b></div>`, 'badge');
      }
      Store.savePlayer(p.name, { dexViewed: p.dexViewed, achievements: p.achievements }).catch(() => {});
    }
    const m = mastery(b.id);
    modal(`
      <button class="x" data-close>✖</button>
      <div class="bcard ${m >= MASTERED ? 'gold' : ''}">
        <div class="bcard-pic">${pic(b, { title: b.name })}</div>
        <div class="bcard-info">
          <div class="bcard-tier">${'⭐'.repeat(b.tier)} ${TIERS[b.tier]} · Tour stop #${b.stop}</div>
          <h3>${esc(b.name)}</h3>
          ${b.aka ? `<div class="aka">also called <b>${esc(b.aka)}</b></div>` : ''}
          ${b.nickname ? `<div class="aka">nickname: <b>${esc(b.nickname)}</b></div>` : ''}
          <div class="chips">
            <span class="chip">📅 ${b.year}</span>
            <span class="chip">📏 ${fmt(b.height)} ft</span>
            <span class="chip">🏢 ${b.floors} floors</span>
          </div>
          <div class="chip wide">✏️ ${esc(b.architect)}</div>
          <div class="spot"><b>👀 How to spot it:</b> ${esc(b.spot)}</div>
          <ul class="facts">${b.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
          <div class="mastery">Mastery: ${stars(Math.min(MASTERED, m))} ${m >= MASTERED ? '<b class="gold-txt">MASTERED!</b>' : `<small>${MASTERED - m} more to master</small>`}</div>
          ${credit(b)}
        </div>
      </div>`, 'card-modal');
    // refresh "???" names once a card has been viewed
    if (App.screen === 'dex') { const prev = $('#modal').onclick; $('#modal').onclick = (e) => { prev(e); if ($('#modal').classList.contains('hidden')) showDex(); }; }
  }

  /* ---------------- leaderboard ---------------- */
  async function showBoard(mode = App.boardMode || 'classic', range = App.boardRange || 'today') {
    App.boardMode = mode;
    App.boardRange = range;
    const tabs = [...Object.entries(MODES).map(([k, v]) => [k, `${v.icon} ${v.name}`]), ['masters', '🏅 Masters']];
    show('board', `
      ${header('🏆 Leaderboard', App.player ? 'menu' : 'title')}
      <div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${k === mode ? 'on' : ''}" data-m="${k}">${l}</button>`).join('')}</div>
      ${mode === 'masters' ? '<p class="dex-hint">Most buildings mastered</p>' : `<div class="tabs small">${[['today', 'Today'], ['week', 'This Week'], ['all', 'All-Time']].map(([k, l]) => `<button class="tab ${k === range ? 'on' : ''}" data-r="${k}">${l}</button>`).join('')}</div>`}
      <div id="boardBody" class="board"><div class="saving">Loading…</div></div>`);
    $$('[data-m]').forEach((t) => (t.onclick = () => { Sfx.play('click'); showBoard(t.dataset.m, range); }));
    $$('[data-r]').forEach((t) => (t.onclick = () => { Sfx.play('click'); showBoard(mode, t.dataset.r); }));
    let rows = [];
    try { rows = await Store.leaderboard(mode, range); } catch (e) { /* show empty */ }
    if (App.screen !== 'board' || App.boardMode !== mode || App.boardRange !== range) return;
    const me = App.player && Names.keyOf(App.player.name);
    const unit = mode === 'masters' ? (r) => `${r.score} 🏅` : (r) => fmt(r.score);
    const body = $('#boardBody');
    if (!rows.length) { body.innerHTML = '<div class="empty">No scores yet. Be the first one on the board! 🚀</div>'; return; }
    const podium = [rows[1], rows[0], rows[2]].map((r, i) => r ? `
      <div class="pod p${[2, 1, 3][i]} ${r.key === me ? 'me' : ''}">
        <div class="pod-av">${esc(r.avatar)}</div>${i === 1 ? '<div class="crown">👑</div>' : ''}
        <div class="pod-name">${esc(r.name)}</div><div class="pod-score">${unit(r)}</div>
        <div class="pod-block">${[2, 1, 3][i]}</div></div>` : '<div class="pod empty-pod"></div>').join('');
    body.innerHTML = `<div class="podium">${podium}</div>
      <ol class="ranks" start="4">${rows.slice(3).map((r) => `<li class="${r.key === me ? 'me' : ''}"><span class="av">${esc(r.avatar)}</span><span class="rn">${esc(r.name)}</span><span class="rs">${unit(r)}</span></li>`).join('')}</ol>`;
  }

  /* ---------------- badges ---------------- */
  function showBadges() {
    const have = App.player.achievements;
    show('badges', `
      ${header(`🎖️ Badges <small>${have.length}/${BADGES.length}</small>`)}
      <div class="badges">${BADGES.map((b) => `
        <div class="badge ${have.includes(b.id) ? 'got' : ''}"><div class="b-icon">${have.includes(b.id) ? b.icon : '🔒'}</div>
        <b>${b.name}</b><small>${b.desc}</small></div>`).join('')}</div>`);
  }

  /* ---------------- wiring ---------------- */
  document.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (!go) return;
    Sfx.play('click');
    const where = go.dataset.go;
    if (where === 'title') return showTitle();
    if (!App.player) return showTitle();
    ({ menu: showMenu, dex: () => showDex(), board: () => showBoard(), badges: showBadges })[where]();
  });

  // shared iPads: return to the title screen when nobody has touched it for a while
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => (App.idleAt = Date.now()), true));
  setInterval(() => {
    if (App.screen !== 'title' && Date.now() - App.idleAt > IDLE_LIMIT) {
      if (App.game && !App.game.over) { App.game.over = true; endTimers(App.game); }
      showTitle();
    }
  }, 5000);

  // block pinch-zoom on iPad Safari (double-tap zoom is off via CSS touch-action)
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  Store.onStatus = (online) => $('#offline').classList.toggle('hidden', online);
  Sfx.muted = !!Store.pref('muted');
  Store.init();
  Photos.load();
  showTitle();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});

  window.SkylineQuest = { App, BADGES, RANKS, rankFor, makeQuestion };
})();
