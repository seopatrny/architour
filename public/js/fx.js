/* Arcade sound effects (synthesized – no audio files) and confetti. */
(function (root) {
  /* ---------------- sound ---------------- */
  let ac = null;
  const Sfx = {
    muted: false,
    unlock() {
      try {
        if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
        if (ac.state === 'suspended') ac.resume();
      } catch (e) { /* no audio available */ }
    },
    tone(freq, dur, { type = 'square', vol = 0.06, at = 0, to = null } = {}) {
      if (this.muted || !ac) return;
      const t = ac.currentTime + at;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    },
    seq(notes, step, opts) { notes.forEach((f, i) => f && this.tone(f, step * 1.4, Object.assign({}, opts, { at: i * step }))); },
    play(name) {
      switch (name) {
        case 'click': return this.tone(880, 0.05, { vol: 0.03 });
        case 'correct': return this.seq([659, 880, 1319], 0.07, { type: 'triangle', vol: 0.1 });
        case 'coin': return this.seq([988, 1319], 0.08, { type: 'square', vol: 0.05 });
        case 'wrong': return this.tone(220, 0.35, { type: 'sawtooth', vol: 0.06, to: 90 });
        case 'tick': return this.tone(1400, 0.03, { vol: 0.025 });
        case 'combo': return this.seq([523, 659, 784, 1047, 1319], 0.05, { type: 'square', vol: 0.05 });
        case 'start': return this.seq([392, 0, 392, 0, 784], 0.12, { type: 'square', vol: 0.06 });
        case 'levelup': return this.seq([523, 659, 784, 1047, 784, 1047, 1319], 0.09, { type: 'triangle', vol: 0.1 });
        case 'badge': return this.seq([1568, 1976, 2349, 3136], 0.06, { type: 'sine', vol: 0.08 });
        case 'gameover': return this.seq([523, 392, 330, 262], 0.16, { type: 'triangle', vol: 0.09 });
        case 'win': return this.seq([523, 659, 784, 1047, 0, 784, 1047, 1319, 1568], 0.09, { type: 'square', vol: 0.05 });
      }
    },
  };

  /* ---------------- confetti ---------------- */
  const COLORS = ['#ffd23f', '#ff5e8a', '#38d9ff', '#3ddc84', '#a17bff', '#ff9f43'];
  let cv, cx, parts = [], running = false;

  function setup() {
    cv = document.getElementById('fx');
    cx = cv.getContext('2d');
    const fit = () => { const r = window.devicePixelRatio || 1; cv.width = innerWidth * r; cv.height = innerHeight * r; cx.setTransform(r, 0, 0, r, 0, 0); };
    fit();
    addEventListener('resize', fit);
  }

  function loop() {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter((p) => p.life > 0);
    for (const p of parts) {
      p.vy += 0.25; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1;
      cx.save();
      cx.globalAlpha = Math.min(1, p.life / 30);
      cx.translate(p.x, p.y); cx.rotate(p.rot);
      cx.fillStyle = p.c;
      if (p.star) { cx.font = `${p.s * 2}px sans-serif`; cx.fillText('★', -p.s, p.s); } else cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      cx.restore();
    }
    if (parts.length) requestAnimationFrame(loop); else { running = false; cx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  const Fx = {
    burst(x, y, n = 40, spread = 9) {
      if (!cv) setup();
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = Math.random() * spread + 3;
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
          s: 6 + Math.random() * 8, c: COLORS[i % COLORS.length], life: 60 + Math.random() * 40, star: Math.random() < 0.2 });
      }
      if (!running) { running = true; requestAnimationFrame(loop); }
    },
    rain(n = 150) {
      if (!cv) setup();
      for (let i = 0; i < n; i++) {
        parts.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.6, vx: (Math.random() - 0.5) * 3, vy: Math.random() * 3,
          rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, s: 7 + Math.random() * 9, c: COLORS[i % COLORS.length], life: 160 + Math.random() * 60, star: Math.random() < 0.25 });
      }
      if (!running) { running = true; requestAnimationFrame(loop); }
    },
    // "+250" style text that floats up from a point
    float(text, x, y, cls = '') {
      const el = document.createElement('div');
      el.className = 'floater ' + cls;
      el.textContent = text;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1300);
    },
  };

  root.Sfx = Sfx;
  root.Fx = Fx;
})(window);
