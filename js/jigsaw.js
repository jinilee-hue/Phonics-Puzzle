/* Phonics Puzzle — jigsaw cutting and drawing, in picture px (1200 x 1000).
 * cut(cols, rows, seed) makes the shared edges once: every inner edge is ONE curve (a round knob on a neck, jittered a
 * little along the edge, bulging to either side), so neighbouring pieces fit exactly — a piece walks its top and right
 * edges forward and its bottom and left edges backward. Knob size is a share of the SHORTER cell side (k), so the knobs
 * look the same on 2x2 and 3x3 cuts; m = the margin a piece canvas needs round its cell for the knobs.
 */
(function () {
  'use strict';
  // one knob, u along the edge (0.5 = middle, in units of k) and v out of the edge (in units of k)
  const KNOB = [
    ['L', 0.34, 0],
    ['C', 0.40, 0.00, 0.43, 0.035, 0.405, 0.08],
    ['C', 0.375, 0.135, 0.355, 0.235, 0.50, 0.235],
    ['C', 0.645, 0.235, 0.625, 0.135, 0.595, 0.08],
    ['C', 0.57, 0.035, 0.60, 0.00, 0.66, 0],
  ];
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }

  /** an edge from a to b (absolute px) with a knob (sign +-1 bulges to the left-hand normal (d.y, -d.x)) or straight */
  function edge(ax, ay, bx, by, sign, jit, k) {
    const L = Math.hypot(bx - ax, by - ay), dx = (bx - ax) / L, dy = (by - ay) / L, nx = dy, ny = -dx;
    if (!sign) return { start: [ax, ay], ops: [['L', bx, by]] };
    const P = (u, v) => {
      const along = L / 2 + (u - 0.5 + jit.j) * k, out = sign * v * k * jit.s;
      return [ax + dx * along + nx * out, ay + dy * along + ny * out];
    };
    const ops = KNOB.map(op => {
      if (op[0] === 'L') return ['L', ...P(op[1], op[2])];
      return ['C', ...P(op[1], op[2]), ...P(op[3], op[4]), ...P(op[5], op[6])];
    });
    ops.push(['L', bx, by]);
    return { start: [ax, ay], ops };
  }
  function reverse(e) {
    const pts = [e.start];
    e.ops.forEach(op => pts.push(op[0] === 'L' ? [op[1], op[2]] : [op[5], op[6]]));
    const ops = [];
    for (let i = e.ops.length - 1; i >= 0; i--) {
      const op = e.ops[i], to = pts[i];
      ops.push(op[0] === 'L' ? ['L', to[0], to[1]] : ['C', op[3], op[4], op[1], op[2], to[0], to[1]]);
    }
    return { start: pts[pts.length - 1], ops };
  }

  function cut(cols, rows, seed, W = 1200, H = 1000) {
    const R = rng(seed), cw = W / cols, ch = H / rows, k = Math.min(cw, ch);
    const jit = () => ({ j: (R() - 0.5) * 0.12, s: 0.92 + R() * 0.16 });
    const sgn = () => (R() < 0.5 ? -1 : 1);
    // horizontal edges h[r][c] at y = r*ch (r = 0..rows), vertical v[r][c] at x = c*cw (c = 0..cols)
    const h = [], v = [];
    for (let r = 0; r <= rows; r++) {
      h[r] = [];
      for (let c = 0; c < cols; c++) h[r][c] = edge(c * cw, r * ch, (c + 1) * cw, r * ch, r === 0 || r === rows ? 0 : sgn(), jit(), k);
    }
    for (let r = 0; r < rows; r++) {
      v[r] = [];
      for (let c = 0; c <= cols; c++) v[r][c] = edge(c * cw, r * ch, c * cw, (r + 1) * ch, c === 0 || c === cols ? 0 : sgn(), jit(), k);
    }
    return { cols, rows, W, H, cw, ch, k, m: Math.ceil(k * 0.27), h, v };
  }

  function trace(ctx, e) { e.ops.forEach(op => (op[0] === 'L' ? ctx.lineTo(op[1], op[2]) : ctx.bezierCurveTo(op[1], op[2], op[3], op[4], op[5], op[6]))); }
  /** the piece outline in picture px (as a Path2D) */
  function path(cu, r, c) {
    const p = new Path2D();
    p.moveTo(c * cu.cw, r * cu.ch);
    trace(p, cu.h[r][c]);
    trace(p, cu.v[r][c + 1]);
    trace(p, reverse(cu.h[r + 1][c]));
    trace(p, reverse(cu.v[r][c]));
    p.closePath();
    return p;
  }

  /** one piece -> canvas of (cw + 2m) x (ch + 2m) picture px times rs: the picture inside the outline, a soft bevel
   *  (light on the top-left inner edge, shade on the bottom-right) and a thin line, like a printed cardboard piece */
  function renderPiece(img, cu, r, c, rs) {
    const { cw, ch, m, k } = cu;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil((cw + 2 * m) * rs); cv.height = Math.ceil((ch + 2 * m) * rs);
    const g = cv.getContext('2d');
    g.scale(rs, rs);
    g.translate(m - c * cw, m - r * ch);
    const p = path(cu, r, c);
    g.save();
    g.clip(p);
    g.drawImage(img, 0, 0, cu.W, cu.H);
    const d = k * 0.014;
    g.lineWidth = d * 2; g.lineJoin = 'round';
    g.save(); g.translate(d, d); g.strokeStyle = 'rgba(255,255,255,0.75)'; g.stroke(p); g.restore();
    g.save(); g.translate(-d, -d); g.strokeStyle = 'rgba(70,40,20,0.32)'; g.stroke(p); g.restore();
    g.restore();
    g.lineWidth = Math.max(1, 1.6 / rs); g.strokeStyle = 'rgba(90,60,40,0.35)'; g.stroke(p);
    return cv;
  }

  /** the board under the pieces: the picture faint on cream + every piece's outline dashed (the mockup's guide) */
  function renderGhost(cv, img, cu, rs) {
    cv.width = Math.ceil(cu.W * rs); cv.height = Math.ceil(cu.H * rs);
    const g = cv.getContext('2d');
    g.scale(rs, rs);
    g.fillStyle = '#fbf4e2'; g.fillRect(0, 0, cu.W, cu.H);
    g.globalAlpha = 0.34; g.drawImage(img, 0, 0, cu.W, cu.H); g.globalAlpha = 1;
    g.fillStyle = 'rgba(255,250,235,0.25)'; g.fillRect(0, 0, cu.W, cu.H);
    g.setLineDash([12, 9]); g.lineWidth = 3.2; g.strokeStyle = 'rgba(120,84,52,0.5)'; g.lineCap = 'round';
    for (let r = 0; r < cu.rows; r++) for (let c = 0; c < cu.cols; c++) g.stroke(path(cu, r, c));
  }
  function renderFull(cv, img, cu, rs) {
    cv.width = Math.ceil(cu.W * rs); cv.height = Math.ceil(cu.H * rs);
    const g = cv.getContext('2d'); g.scale(rs, rs); g.drawImage(img, 0, 0, cu.W, cu.H);
  }
  /** a glowing outline where piece (r, c) goes (the hint) */
  function renderHint(cv, cu, r, c, rs) {
    cv.width = Math.ceil(cu.W * rs); cv.height = Math.ceil(cu.H * rs);
    const g = cv.getContext('2d');
    g.scale(rs, rs);
    const p = path(cu, r, c);
    g.fillStyle = 'rgba(255,246,200,0.45)'; g.fill(p);
    g.shadowColor = 'rgba(255,214,90,1)'; g.shadowBlur = 26;
    g.lineWidth = 9; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineJoin = 'round'; g.stroke(p);
    g.shadowBlur = 0; g.lineWidth = 4; g.strokeStyle = 'rgba(255,190,40,1)'; g.stroke(p);
  }
  function clearCanvas(cv) { cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); }

  window.Jigsaw = { cut, path, renderPiece, renderGhost, renderFull, renderHint, clearCanvas };
})();
