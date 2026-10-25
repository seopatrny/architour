/* Tiny SVG drawing kit used to illustrate every building.
 * Each building draws itself into a 200 x 300 box (ground line at y = 285). */
(function (root) {
  let UID = 0;

  function makeCtx(uid) {
    const defs = [];
    let n = 0;
    const nid = () => `a${uid}_${n++}`;
    const ex = (a) => (a ? ' ' + a : '');
    const d = {
      defs,
      R: (x, y, w, h, f, a) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"${ex(a)}/>`,
      P: (pts, f, a) => `<polygon points="${pts}" fill="${f}"${ex(a)}/>`,
      D: (path, f, a) => `<path d="${path}" fill="${f}"${ex(a)}/>`,
      C: (cx, cy, r, f, a) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}"${ex(a)}/>`,
      E: (cx, cy, rx, ry, f, a) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}"${ex(a)}/>`,
      L: (x1, y1, x2, y2, s, w = 1, a) =>
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${s}" stroke-width="${w}"${ex(a)}/>`,
      // linear gradient; default is left-to-right (good for curved glass)
      lg(stops, x1 = 0, y1 = 0, x2 = 1, y2 = 0) {
        const i = nid();
        defs.push(
          `<linearGradient id="${i}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
            stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('') +
            `</linearGradient>`
        );
        return `url(#${i})`;
      },
      // repeating tile with one centered rectangle (windows, mullions, stripes)
      pat(cw, rh, ww, wh, col, ox = 0, oy = 0) {
        const i = nid();
        defs.push(
          `<pattern id="${i}" x="${ox}" y="${oy}" width="${cw}" height="${rh}" patternUnits="userSpaceOnUse">` +
            `<rect x="${(cw - ww) / 2}" y="${(rh - wh) / 2}" width="${ww}" height="${wh}" fill="${col}"/></pattern>`
        );
        return `url(#${i})`;
      },
      // a rectangle of facade with a grid of windows
      W(x, y, w, h, base, o = {}) {
        const cw = o.cw || 8, rh = o.rh || 8;
        const ww = o.ww != null ? o.ww : cw * 0.55;
        const wh = o.wh != null ? o.wh : rh * 0.6;
        return d.R(x, y, w, h, base, o.a) + d.R(x, y, w, h, d.pat(cw, rh, ww, wh, o.c || '#cfe8f7', x, y), o.a);
      },
      // vertical stripes (mullions / piers) over an area
      V(x, y, w, h, step, th, col, a) {
        return d.R(x, y, w, h, d.pat(step, 10, th, 10, col, x, 0), a);
      },
      // horizontal stripes (floor lines) over an area
      H(x, y, w, h, step, th, col, a) {
        return d.R(x, y, w, h, d.pat(10, step, 10, th, col, 0, y), a);
      },
    };
    return d;
  }

  const SKY = [[0, '#6fc3f7'], [1, '#dcf3ff']];

  function backdrop(d) {
    const sky = d.lg(SKY, 0, 0, 0, 1);
    return (
      d.R(0, 0, 200, 300, sky) +
      `<g fill="#fff" opacity=".75">` +
      d.E(38, 46, 18, 7, '#fff') + d.E(52, 41, 13, 8, '#fff') +
      d.E(160, 78, 16, 6, '#fff') + d.E(172, 74, 10, 6, '#fff') +
      `</g>`
    );
  }

  function river(d) {
    return (
      d.R(0, 285, 200, 15, '#2a78ad') +
      d.D('M0 291 q10 -3 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0', 'none', 'stroke="#8fd0f5" stroke-width="1.4" opacity=".8"') +
      d.R(0, 283, 200, 2.5, '#5d6b75')
    );
  }

  /* Render one building card picture.
   * opts.shadow  – draw as a mystery silhouette
   * opts.bare    – no sky or river (for skyline composites) */
  function renderBuilding(b, opts = {}) {
    const uid = ++UID;
    const d = makeCtx(uid);
    const body = b.draw(d);
    const bg = opts.bare ? '' : backdrop(d);
    const water = opts.bare ? '' : river(d);
    const fid = `s${uid}`;
    const filter =
      `<filter id="${fid}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" ` +
      `values="0 0 0 0 0.09  0 0 0 0 0.11  0 0 0 0 0.24  0 0 0 1 0"/></filter>`;
    const label = opts.title ? `<title>${opts.title}</title>` : '';
    return (
      `<svg class="bsvg${opts.cls ? ' ' + opts.cls : ''}" viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" ` +
      `preserveAspectRatio="xMidYMax meet" role="img"${opts.title ? '' : ' aria-hidden="true"'}>${label}` +
      `<defs>${d.defs.join('')}${filter}</defs>${bg}` +
      `<g${opts.shadow ? ` filter="url(#${fid})"` : ''}>${body}</g>${water}</svg>`
    );
  }

  /* A wide skyline made of several buildings, used on the title screen. */
  function renderSkyline(list, opts = {}) {
    const step = opts.step || 92;
    const width = step * (list.length - 1) + 200;
    let back = '', front = '';
    list.forEach((b, i) => {
      const uid = ++UID;
      const d = makeCtx(uid);
      const body = b.draw(d);
      const x = i * step;
      const g = `<g transform="translate(${x},0)"><defs>${d.defs.join('')}</defs>${body}</g>`;
      if (i % 2) back += g; else front += g;
    });
    return (
      `<svg class="skyline" viewBox="0 0 ${width} 300" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<g opacity=".82">${back}</g>${front}<rect x="0" y="284" width="${width}" height="16" fill="#1d5c8f"/></svg>`
    );
  }

  const api = { renderBuilding, renderSkyline, makeCtx };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Art = api;
})(typeof window !== 'undefined' ? window : globalThis);
