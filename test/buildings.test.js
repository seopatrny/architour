const test = require('node:test');
const assert = require('node:assert');
const { BUILDINGS } = require('../public/js/buildings.js');
const Art = require('../public/js/art.js');

test('every building has complete, unique data', () => {
  const ids = new Set();
  assert.ok(BUILDINGS.length >= 30);
  for (const b of BUILDINGS) {
    assert.match(b.id, /^[a-z0-9]{2,20}$/, b.id);
    assert.ok(!ids.has(b.id), 'duplicate id ' + b.id);
    ids.add(b.id);
    for (const k of ['name', 'architect', 'spot']) assert.ok(typeof b[k] === 'string' && b[k].length > 2, `${b.id}.${k}`);
    for (const k of ['year', 'height', 'floors']) assert.ok(Number.isFinite(b[k]) && b[k] > 0, `${b.id}.${k}`);
    assert.ok([1, 2, 3].includes(b.tier), `${b.id}.tier`);
    assert.ok(b.facts.length >= 2 && b.clues.length >= 2, `${b.id} facts/clues`);
  }
  for (const t of [1, 2, 3]) assert.ok(BUILDINGS.filter((b) => b.tier === t).length >= 4, 'tier ' + t);
});

test('clues never give away the answer', () => {
  for (const b of BUILDINGS) {
    const words = [b.name, b.aka].filter(Boolean).flatMap((n) => n.toLowerCase().split(/[^a-z0-9]+/))
      .filter((w) => w.length > 3 && !['tower', 'building', 'plaza', 'north', 'south', 'east', 'west', 'chicago', 'center', 'international', 'hotel', 'river'].includes(w));
    for (const c of b.clues) for (const w of words) assert.ok(!c.toLowerCase().includes(w), `${b.id} clue mentions "${w}": ${c}`);
  }
});

test('every illustration renders as clean SVG', () => {
  for (const b of BUILDINGS) {
    for (const shadow of [false, true]) {
      const svg = Art.renderBuilding(b, { shadow });
      assert.match(svg, /^<svg[\s\S]*<\/svg>$/);
      assert.doesNotMatch(svg, /NaN|undefined|Infinity/, b.id);
    }
  }
});

test('every building has Wikipedia articles to pull a real photo from', () => {
  const { WIKI } = require('../public/js/photo-sources.js');
  assert.deepStrictEqual(Object.keys(WIKI).sort(), BUILDINGS.map((b) => b.id).sort());
  for (const [id, titles] of Object.entries(WIKI)) assert.ok(titles.length && titles.every((t) => typeof t === 'string' && t.length > 2), id);
});
