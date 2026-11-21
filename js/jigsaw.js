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
    // R = the board's corner radius in picture px (css .board: 2.4u round on an 82u-wide board): the four corner pieces
    // get the same rounded outer corner, so a piece matches the board's shape (user: "보드판에 맞춰서 퍼즐 모양도 수정해")
    return { cols, rows, W, H, cw, ch, k, m: Math.ceil(k * 0.27), h, v, R: W * 2.4 / 82 };
  }

  function trace(ctx, e) { e.ops.forEach(op => (op[0] === 'L' ? ctx.lineTo(op[1], op[2]) : ctx.bezierCurveTo(op[1], op[2], op[3], op[4], op[5], op[6]))); }
  /** the piece outline in picture px (as a Path2D); an outer corner of the picture is rounded by cu.R */
  function path(cu, r, c) {
    const p = new Path2D(), R = cu.R || 0;
    const x0 = c * cu.cw, y0 = r * cu.ch, x1 = x0 + cu.cw, y1 = y0 + cu.ch;
    const top = r === 0, bot = r === cu.rows - 1, left = c === 0, right = c === cu.cols - 1;
    const tl = top && left ? R : 0, tr = top && right ? R : 0, br = bot && right ? R : 0, bl = bot && left ? R : 0;
    p.moveTo(x0 + tl, y0);
    if (top) { p.lineTo(x1 - tr, y0); if (tr) p.arcTo(x1, y0, x1, y0 + tr, tr); } else trace(p, cu.h[r][c]);
    if (right) { p.lineTo(x1, y1 - br); if (br) p.arcTo(x1, y1, x1 - br, y1, br); } else trace(p, cu.v[r][c + 1]);
    if (bot) { p.lineTo(x0 + bl, y1); if (bl) p.arcTo(x0, y1, x0, y1 - bl, bl); } else trace(p, reverse(cu.h[r + 1][c]));
    if (left) { p.lineTo(x0, y0 + tl); if (tl) p.arcTo(x0, y0, x0 + tl, y0, tl); } else trace(p, reverse(cu.v[r][c]));
    p.closePath();
    return p;
  }

  /** an inner shadow inside path p (already clipped to it): everything OUTSIDE the piece casts a blurred shadow inward,
   *  offset by (o, o) picture px — o > 0 lights the top / left edges, o < 0 shades the bottom / right ones.
   *  (canvas shadows ignore the transform, so offset and blur are scaled by rs here) */
  function innerGlow(g, p, cu, rs, o, blur, color) {
    const ring = new Path2D();
    ring.rect(-cu.W, -cu.H, cu.W * 3, cu.H * 3);
    ring.addPath(p);
    g.save();
    g.shadowColor = color; g.shadowBlur = blur * rs; g.shadowOffsetX = o * rs; g.shadowOffsetY = o * rs;
    g.fillStyle = '#000';
    g.fill(ring, 'evenodd');
    g.restore();
  }

  /** one piece -> canvas of (cw + 2m) x (ch + 2m) picture px times rs: the picture inside the outline, soft inner light
   *  (top-left) and shade (bottom-right) and a faint line, like a printed cardboard piece */
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
    // volume like a rounded cardboard edge (user: "흰색 면과 검은색 면에 투명도 줘서 볼륨감 준게 어색해 자연스럽게"): soft light
    // falling in from the top-left edges and soft shade from the bottom-right ones, both blurred so they fade inward —
    // no hard white / dark bands
    innerGlow(g, p, cu, rs, k * 0.016, k * 0.05, 'rgba(255,255,255,0.5)');
    innerGlow(g, p, cu, rs, -k * 0.018, k * 0.06, 'rgba(70,40,25,0.22)');
    g.restore();
    g.lineWidth = Math.max(1, 1.2 / rs); g.strokeStyle = 'rgba(110,75,50,0.22)'; g.stroke(p);
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
