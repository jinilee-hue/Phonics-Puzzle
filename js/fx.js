/* Phonics Puzzle — particles on one full-window canvas (#fx): sparkles, little stars, music notes, confetti, glow dots.
 * Sprites are drawn once into small canvases and stamped with drawImage (cheap enough for a few hundred at once).
 * The motions follow the reference video: the sparkle trail behind a dragged piece, the burst of stars and notes when
 * a piece snaps, the sparkle comets running round the frame, the spiral of the START transition.
 */
(function () {
  'use strict';
  const cv = document.getElementById('fx');
  const g = cv.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const tok = n => css.getPropertyValue(n).trim();
  const COLORS = ['--fx-pink', '--fx-yellow', '--fx-cyan', '--fx-green', '--fx-orange', '--fx-purple'].map(tok);
  const WARM = [tok('--fx-gold'), tok('--fx-white'), tok('--fx-yellow')];
  let W = 0, H = 0, dpr = 1;
  const parts = [];
  const sprites = {};

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  addEventListener('resize', resize);
  resize();

  function sprite(key, size, draw) {
    if (sprites[key]) return sprites[key];
    const s = document.createElement('canvas'); s.width = s.height = size;
    draw(s.getContext('2d'), size);
    return (sprites[key] = s);
  }
  // 4-point sparkle with a glow
  const spark = col => sprite('spark' + col, 64, (c, n) => {
    const m = n / 2;
    const rg = c.createRadialGradient(m, m, 0, m, m, m);
    rg.addColorStop(0, col); rg.addColorStop(0.25, col + '88'); rg.addColorStop(1, col + '00');
    c.fillStyle = rg; c.globalAlpha = 0.55; c.beginPath(); c.arc(m, m, m, 0, 7); c.fill(); c.globalAlpha = 1;
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(m, 4); c.quadraticCurveTo(m + 3, m - 3, n - 4, m); c.quadraticCurveTo(m + 3, m + 3, m, n - 4);
    c.quadraticCurveTo(m - 3, m + 3, 4, m); c.quadraticCurveTo(m - 3, m - 3, m, 4); c.fill();
  });
  // 5-point candy star
  const star = col => sprite('star' + col, 64, (c, n) => {
    const m = n / 2, R = n * 0.46, r = R * 0.48;
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; c.lineTo(m + Math.cos(a) * rr, m + Math.sin(a) * rr); }
    c.closePath(); c.lineJoin = 'round';
    c.fillStyle = col; c.fill();
    c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.85)'; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(m - 6, m - 8, 6, 3.5, -0.6, 0, 7); c.fill();
  });
  const note = (col, ch) => sprite('note' + col + ch, 64, (c, n) => {
    c.font = `900 ${n * 0.8}px 'Baloo 2', sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 6; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.strokeText(ch, n / 2, n / 2 + 2);
    c.fillStyle = col; c.fillText(ch, n / 2, n / 2 + 2);
  });
  const dot = col => sprite('dot' + col, 32, (c, n) => {
    const m = n / 2, rg = c.createRadialGradient(m, m, 0, m, m, m);
    rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.3, col); rg.addColorStop(1, col + '00');
    c.fillStyle = rg; c.fillRect(0, 0, n, n);
  });
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];

  /** p: {x, y, vx, vy, life (s), size (px), img, rot, vr, g (gravity px/s2), drag, fade, grow, conf (confetti)} */
  function add(p) {
    parts.push(Object.assign({ t: 0, rot: 0, vr: 0, g: 0, drag: 0.9, alpha: 1, grow: 0, spin: 0 }, p));
    wake();
  }
  let running = false, last = 0;
  const effects = [];                                  // drawn every frame until their end time (spiral ribbons)
  function wake() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); } }
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    for (let i = effects.length - 1; i >= 0; i--) { if (now >= effects[i].end) effects.splice(i, 1); else effects[i].draw(g, now); }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      if (p.orbit) {                                   // spiral arms (START transition)
        const o = p.orbit;
        o.a += o.w * dt * (1 + p.t * o.acc);
        o.r = Math.max(0, o.r + o.vr * dt);
        p.x = o.cx + Math.cos(o.a) * o.r; p.y = o.cy + Math.sin(o.a) * o.r * o.flat;
      } else {
        const k = Math.pow(p.drag, dt * 60);
        p.vx *= k; p.vy = p.vy * k + p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      p.rot += p.vr * dt;
      const f = p.t / p.life;
      const a = p.alpha * (f < 0.12 ? f / 0.12 : 1 - Math.pow((f - 0.12) / 0.88, 2));
      const s = p.size * (1 + p.grow * f) * (p.twinkle ? 0.75 + 0.25 * Math.sin(p.t * 18 + p.ph) : 1);
      g.globalAlpha = Math.max(0, a);
      if (p.conf) {                                    // confetti: a flipping paper strip
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.scale(1, Math.cos(p.t * p.spin));
        g.fillStyle = p.col; g.fillRect(-s / 2, -s / 4, s, s / 2); g.restore();
      } else {
        g.save(); g.translate(p.x, p.y); if (p.rot) g.rotate(p.rot);
        g.drawImage(p.img, -s / 2, -s / 2, s, s); g.restore();
      }
    }
    g.globalAlpha = 1;
    if (parts.length || effects.length) requestAnimationFrame(tick); else { running = false; g.clearRect(0, 0, W, H); }
  }

  const FX = {
    /** a few sparkles drifting off a point (the drag trail) */
    trail(x, y, n = 2, scale = 1) {
      for (let i = 0; i < n; i++) add({ x: x + rnd(-14, 14) * scale, y: y + rnd(-14, 14) * scale, vx: rnd(-30, 30), vy: rnd(-40, 10), life: rnd(0.45, 0.9), size: rnd(10, 22) * scale, img: Math.random() < 0.7 ? spark(pick(WARM)) : dot(pick(COLORS)), twinkle: true, ph: rnd(0, 6) });
    },
    /** sparkles in a ring round a point */
    sparkles(x, y, n = 14, r = 120, scale = 1) {
      for (let i = 0; i < n; i++) {
        const a = rnd(0, Math.PI * 2), sp = rnd(r * 0.8, r * 2);
        add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 0.92, life: rnd(0.6, 1.1), size: rnd(14, 30) * scale, img: spark(pick(WARM)), twinkle: true, ph: rnd(0, 6) });
      }
    },
    /** the snap burst: candy stars, music notes, sparkles and confetti flying out (mockup frame "snap") */
    burst(x, y, scale = 1) {
      const n = 26;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd(-0.12, 0.12), sp = rnd(260, 620) * scale, ty = Math.random();
        const img = ty < 0.38 ? star(pick(COLORS)) : ty < 0.6 ? note(pick(COLORS), pick(['♪', '♫'])) : spark(pick(WARM));
        add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 0.9, g: 260, life: rnd(0.7, 1.2), size: rnd(26, 46) * scale, img, rot: rnd(-0.6, 0.6), vr: rnd(-4, 4) });
      }
      for (let i = 0; i < 18; i++) {
        const a = rnd(0, Math.PI * 2), sp = rnd(200, 480) * scale;
        add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, drag: 0.92, g: 520, life: rnd(0.9, 1.5), size: rnd(12, 20) * scale, conf: true, col: pick(COLORS), rot: rnd(0, 6), vr: rnd(-8, 8), spin: rnd(6, 14) });
      }
    },
    /** confetti rain from the top of the window (puzzle done) */
    confetti(n = 90) {
      for (let i = 0; i < n; i++) add({ x: rnd(0, W), y: rnd(-H * 0.3, -10), vx: rnd(-40, 40), vy: rnd(120, 260), drag: 0.99, g: 60, life: rnd(2.2, 3.6), size: rnd(12, 22), conf: true, col: pick(COLORS), rot: rnd(0, 6), vr: rnd(-6, 6), spin: rnd(5, 12) });
    },
    /** two sparkle comets running round a rounded rect (the frame appearing) — resolves when done */
    frameComets(rect, ms = 1100) {
      const { left: x, top: y, width: w, height: h } = rect, per = 2 * (w + h);
      const at = d => {
        d = ((d % per) + per) % per;
        if (d < w) return [x + d, y];
        if (d < w + h) return [x + w, y + d - w];
        if (d < 2 * w + h) return [x + w - (d - w - h), y + h];
        return [x, y + h - (d - 2 * w - h)];
      };
      return new Promise(res => {
        const t0 = performance.now();
        const step = () => {
          const f = Math.min(1, (performance.now() - t0) / ms), e = 1 - Math.pow(1 - f, 2);
          [0, per / 2].forEach(off => {
            const [px, py] = at(off + e * per * 1.02);
            for (let i = 0; i < 4; i++) add({ x: px + rnd(-10, 10), y: py + rnd(-10, 10), vx: rnd(-60, 60), vy: rnd(-60, 60), drag: 0.9, life: rnd(0.5, 1.0), size: rnd(12, 30), img: Math.random() < 0.75 ? spark(pick(WARM)) : dot(pick(COLORS)), twinkle: true, ph: rnd(0, 6) });
          });
          if (f < 1) requestAnimationFrame(step); else res();
        };
        step();
      });
    },
    /** the START transition: sparkles on spiral arms round the middle, turning faster and opening out */
    spiral(cx, cy, ms = 1700) {
      const R = Math.hypot(W, H) * 0.5, ARMS = 3;
      // glowing ribbons on three trailing spiral arms (pink, cyan, gold), turning faster and opening out
      const t0 = performance.now(), ARM_COL = [tok('--fx-pink'), tok('--fx-cyan'), tok('--fx-gold')];
      effects.push({ end: t0 + ms, draw(c, now) {
        const f = Math.min(1, (now - t0) / ms), al = f < 0.18 ? f / 0.18 : f > 0.68 ? Math.max(0, (1 - f) / 0.32) : 1;
        const rot = f * 3 + f * f * 8, sc = 0.22 + f * 1.5, RR = R * sc;
        c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
        ARM_COL.forEach((col, k) => {
          c.beginPath();
          for (let i = 0; i <= 64; i++) {
            const q = i / 64, a = k * Math.PI * 2 / 3 + rot - q * 4.6, r = RR * (0.03 + 0.97 * Math.pow(q, 1.5));
            const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.8;
            i ? c.lineTo(x, y) : c.moveTo(x, y);
          }
          const gr = c.createRadialGradient(cx, cy, 0, cx, cy, RR);
          gr.addColorStop(0, col + '00'); gr.addColorStop(0.15, col + 'cc'); gr.addColorStop(0.7, col + '66'); gr.addColorStop(1, col + '00');
          c.globalAlpha = al * 0.35; c.lineWidth = RR * 0.16; c.strokeStyle = gr; c.stroke();
          c.globalAlpha = al * 0.6; c.lineWidth = RR * 0.06; c.stroke();
          c.globalAlpha = al * 0.5; c.lineWidth = Math.max(2, RR * 0.012); c.strokeStyle = '#ffffff'; c.stroke();
        });
        c.restore();
      } });
      wake();
      for (let i = 0; i < 420; i++) {
        const arm = i % ARMS, f = Math.pow(Math.random(), 0.8), a0 = arm * (Math.PI * 2 / ARMS) + f * 5.2 + rnd(-0.12, 0.12);
        add({ x: cx, y: cy, life: ms / 1000 * rnd(0.8, 1), size: rnd(8, 26) * (0.6 + f * 0.8), img: Math.random() < 0.72 ? spark(pick(WARM)) : dot(pick(COLORS)), twinkle: true, ph: rnd(0, 6),
          orbit: { cx, cy, a: a0, r: 12 + f * R * 0.85, vr: 40 + f * 160, w: 3.2 - f * 1.4, acc: 1.2, flat: 0.8 } });
      }
    },
    clear() { parts.length = 0; effects.length = 0; },
    count: () => parts.length,
  };
  window.FX = FX;
})();
