/* The Skyline Leaderboard: the top players become the skyline.
 * #1 gets the tallest tower (Willis Tower), #2 the next tallest, and so on, each drawn
 * to its real height, arranged as a pyramid with the champion in the middle.
 * Used by the game's Leaderboard screen and the classroom display (skyline.html). */
(function (root) {
  const GROUND = 285; // ground line inside every building drawing
  const TALLEST = BUILDINGS.slice().sort((a, b) => b.height - a.height);
  const bboxCache = {};
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Math.round(n).toLocaleString('en-US');

  // the drawn part of a building, in its own 200 x 300 coordinates
  function measure(b) {
    if (bboxCache[b.id]) return bboxCache[b.id];
    const holder = document.createElement('div');
    holder.style.cssText = 'position:absolute;left:-9999px;top:0;width:200px;height:300px;visibility:hidden';
    holder.innerHTML = Art.renderBuilding(b, { bare: true });
    document.body.appendChild(holder);
    const bb = holder.querySelector('svg > g').getBBox();
    holder.remove();
    return (bboxCache[b.id] = { x: bb.x, y: bb.y, w: bb.width, h: GROUND - bb.y });
  }

  // slot position → rank index, champion in the middle, then alternating right/left
  function pyramid(n) {
    const slots = new Array(n);
    const c = Math.floor((n - 1) / 2);
    let l = c - 1, r = c + 1;
    slots[c] = 0;
    for (let i = 1; i < n; i++) {
      if ((i % 2 === 1 && r < n) || l < 0) slots[r++] = i;
      else slots[l--] = i;
    }
    return slots;
  }

  function buildingSvg(b, box, wPx, hPx) {
    const holder = document.createElement('div');
    holder.innerHTML = Art.renderBuilding(b, { bare: true });
    const svg = holder.firstElementChild;
    svg.setAttribute('viewBox', `${box.x - 1} ${box.y} ${box.w + 2} ${box.h}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
    svg.style.width = wPx + 'px';
    svg.style.height = hPx + 'px';
    return svg;
  }

  /* render(container, rows, opts)
   *   rows        leaderboard rows, best first: { key, name, avatar, score }
   *   opts.count  how many towers (default 10)
   *   opts.me     player key to highlight
   *   opts.prev   keys from the previous render, to spot climbers and a new champion
   *   opts.animate  towers rise out of the ground (default true)
   *   opts.topPad   pixels kept free at the top (for a page header)
   *   opts.unit     text after the score (default 'pts')
   * Returns { newLeader } so callers can celebrate. */
  function render(container, rows, opts = {}) {
    const n = Math.min(opts.count || 10, TALLEST.length);
    const towers = TALLEST.slice(0, n);
    const W = container.clientWidth, H = container.clientHeight;
    const riverH = Math.max(46, Math.round(H * 0.12));
    const groundY = H - riverH;
    const evenW = (W * 0.98) / n;
    const fontPx = Math.max(11, Math.min(24, evenW / 7.2));
    const labelH = fontPx * 5.4;
    const topPad = opts.topPad != null ? opts.topPad : H * 0.04;
    const availH = Math.max(60, groundY - topPad - labelH - 14);

    // One scale for every tower so heights stay true to life. Each slot is as wide as its tower
    // (but never narrower than a name sign); shrink the scale only if the row is too wide.
    const minSlot = evenW * 0.82;
    const towerW = (b, k) => { const box = measure(b); return b.height * k * (box.w / box.h); };
    const rowW = (k) => towers.reduce((sum, b) => sum + Math.max(towerW(b, k) * 1.12, minSlot), 0);
    let pxPerFt = availH / towers[0].height;
    if (rowW(pxPerFt) > W * 0.98) {
      let lo = 0, hi = pxPerFt;
      for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (rowW(mid) > W * 0.98) hi = mid; else lo = mid; }
      pxPerFt = lo;
    }

    const order = pyramid(n);
    const slotWidths = order.map((rank) => Math.max(towerW(towers[rank], pxPerFt) * 1.12, minSlot));
    const spare = (W * 0.98 - slotWidths.reduce((a, b) => a + b, 0)) / n;
    for (let i = 0; i < n; i++) slotWidths[i] += Math.max(0, spare);
    const prevPos = new Map((opts.prev || []).map((k, i) => [k, i]));
    const animate = opts.animate !== false;

    container.classList.add('skyboard');
    container.innerHTML = `
      <div class="sb-stars"></div><div class="sb-moon"></div>
      <div class="sb-beams"></div>
      <div class="sb-city"></div>
      <div class="sb-river" style="height:${riverH}px"><div class="sb-names"></div><div class="sb-boat">🚤</div></div>`;
    const city = container.querySelector('.sb-city');
    const names = container.querySelector('.sb-names');
    let left = (W - slotWidths.reduce((a, b) => a + b, 0)) / 2;
    let champTop = null, champX = null;

    order.forEach((rank, pos) => {
      const b = towers[rank];
      const row = rows[rank];
      const box = measure(b);
      const hPx = b.height * pxPerFt;
      const wPx = hPx * (box.w / box.h);
      const slotW = slotWidths[pos];
      const cx = left + slotW / 2;
      left += slotW;
      const delay = animate ? (n - 1 - rank) * 140 : 0;
      const place = rank + 1;
      const moved = row && prevPos.has(row.key) ? prevPos.get(row.key) - rank : 0;

      const slot = document.createElement('div');
      slot.className = `sb-slot r${place}${row ? '' : ' empty'}${row && row.key === opts.me ? ' me' : ''}`;
      slot.style.cssText = `left:${cx - slotW / 2}px;width:${slotW}px;bottom:${riverH}px;font-size:${fontPx}px`;

      const tower = document.createElement('div');
      tower.className = 'sb-tower' + (animate ? ' rise' : '');
      tower.style.cssText = `height:${hPx}px;animation-delay:${delay}ms`;
      tower.appendChild(buildingSvg(b, box, wPx, hPx));

      const label = document.createElement('div');
      label.className = 'sb-label' + (animate ? ' pop' : '') + (moved > 0 ? ' up' : '');
      label.style.cssText = `bottom:${hPx + 8}px;animation-delay:${delay + 500}ms`;
      label.innerHTML = row
        ? `<div class="sb-rank">${place === 1 ? '👑 ' : ''}#${place}${moved > 0 ? ' <span class="sb-up">▲' + moved + '</span>' : ''}</div>
           <div class="sb-av">${esc(row.avatar)}</div>
           <div class="sb-name">${esc(row.name)}</div>
           <div class="sb-score">${fmt(row.score)}${opts.unit === '' ? '' : ' ' + esc(opts.unit || 'pts')}</div>`
        : `<div class="sb-rank">#${place}</div><div class="sb-claim">Claim this tower!</div>`;

      slot.appendChild(label);
      slot.appendChild(tower);
      city.appendChild(slot);

      const cap = document.createElement('div');
      cap.className = 'sb-cap';
      cap.style.cssText = `left:${cx - slotW / 2}px;width:${slotW}px;font-size:${Math.max(9, fontPx * 0.62)}px`;
      cap.textContent = b.name;
      names.appendChild(cap);

      if (rank === 0) { champTop = groundY - hPx; champX = cx; }
    });

    // searchlights sweeping from the champion's roof
    if (rows.length && champTop != null) {
      const beams = container.querySelector('.sb-beams');
      beams.style.cssText = `left:${champX}px;top:${champTop}px`;
      beams.innerHTML = '<div class="sb-beam a"></div><div class="sb-beam b"></div>';
      if (animate) beams.style.animationDelay = (n * 140 + 300) + 'ms';
    }

    const newLeader = !!(rows[0] && opts.prev && opts.prev.length && opts.prev[0] !== rows[0].key);
    return { newLeader, finishMs: animate ? n * 140 + 900 : 0 };
  }

  root.SkylineBoard = { render, TALLEST };
})(window);
