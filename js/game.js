/* Phonics Puzzle — the game.
 * Title (logo drop + float + glint, twinkling stars, slow room drift with pointer parallax, START shine, tapping hand) →
 * START: sparkle burst, the logo lifts away → game screen (frame + sparkle comets,
 * HUD pop, tray slides in) → 3 levels x 6 pictures from the lesson pack FP.K.U1L1 (every m-word with a picture):
 * level 1 = 2x2 pieces, level 2 = 3x2, level 3 = 3x3. Each puzzle: the picture shows and its word is said, it breaks
 * into pieces that fly into the PIECES tray, the child drags them onto the faint picture (snap = colour burst, stars,
 * notes, +100). Done: the seams vanish, the word shows with its m in pink and "/m/ /m/ word" is chanted (pack audio),
 * then the child SAYS the word (mic opened once at START): the company phonics-api judges it when this device has a key
 * (title, top left; same judging as Eye Catch), else the on-device whisper; right = gold mic + bonus, two misses = "good
 * try" — never a dead end. Then Next. After 6 pictures: LEVEL CLEAR card; after level 3: ALL CLEAR.
 * Tutor lines (EN/KO by the title toggle) = phonics-api TTS in the unified tutor voice (tools/build_voice.py).
 */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const app = $('#app'), stage = $('#stage'), S = window.Sound, Q = new URLSearchParams(location.search);
  const PACK = window.PP_WORDS, WORDS = PACK.words, IW = PACK.size[0], IH = PACK.size[1];
  const LEVELS = [{ cols: 2, rows: 2 }, { cols: 3, rows: 2 }, { cols: 3, rows: 3 }];
  const PER = Math.ceil(WORDS.length / LEVELS.length);
  const FAST = Q.has('fast');
  const PH = Object.fromEntries(WORDS.map(w => [w.w, w.ph]));        // expected phonemes (pack + server G2P)
  const fake = [];                                                    // ?fake=1 (QA): verdicts instead of the mic
  const E = {
    logoWrap: $('#logoWrap'), start: $('#btnStart'), titleHand: $('#titleHand'), gameLogo: $('#gameLogo'),
    frame: $('#frame'), lights: $('#lights'), board: $('#board'), ghost: $('#ghost'), placed: $('#placed'), full: $('#full'), hint: $('#hint'),
    tray: $('#tray'), list: $('#trayList'), view: $('#trayView'), dots: $('#trayDots'), up: $('#btnUp'), down: $('#btnDown'),
    word: $('#wordBar'), next: $('#btnNext'), hand: $('#gameHand'), drag: $('#drag'), bursts: $('#bursts'), stars: $('#titleStars'), tutor: $('#tutor'), bubbles: $('#bubbles'),
    score: $('#score'), level: $('#boardTabTxt'), hudL: $('.hud-left'), sys: $('.sys:not(.sys-left)'),
    clear: $('#clear'), clearTitle: $('#clearTitle'), clearPics: $('#clearPics'), go: $('#btnGo'), goTxt: $('#goTxt'),
  };
  const G = { screen: 'title', tok: 0, order: [], level: 0, idx: 0, score: 0, cut: null, img: null, word: null, pieces: [], left: 0,
    top: 0, drag: null, busy: true, timers: [], hintAt: 0 };
  const wait = ms => new Promise(r => setTimeout(r, FAST ? Math.min(ms, 60) : ms));
  const alive = tok => tok === G.tok;
  const u = () => stage.getBoundingClientRect().height / 100;            // px per u
  function later(ms, fn) { const t = setTimeout(fn, ms); G.timers.push(t); return t; }
  function clearTimers() { G.timers.forEach(clearTimeout); G.timers = []; }
  function shuffle(a, rnd = Math.random) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function restartAnim(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

  // ── pictures ────────────────────────────────────────────────────────────────────────────────────────────
  const IMG = {};
  /** a picture, loaded once. An error or no answer in 10 s rejects, and a failure is not kept (the next ask tries again) */
  function loadImg(w) {
    if (!IMG[w.w]) {
      const p = IMG[w.w] = new Promise((res, rej) => {
        const im = new Image();
        const t = setTimeout(() => { im.onload = im.onerror = null; im.src = ''; rej(new Error('timeout ' + w.img)); }, 10000);
        im.onload = () => { clearTimeout(t); res(im); };
        im.onerror = () => { clearTimeout(t); rej(new Error('error ' + w.img)); };
        im.src = w.img;
      });
      p.catch(() => { if (IMG[w.w] === p) delete IMG[w.w]; });
    }
    return IMG[w.w];
  }

  // ── Toy Catch's candy bursts (js/candyfx.js): baked once at load, ticked on the frame clock while anything flies ──
  CandyFX.init($('#candyfx'));
  let candyLast = 0, candyRaf = 0;
  function candyLoop(now) {
    const dt = Math.min(0.05, (now - (candyLast || now)) / 1000); candyLast = now;
    CandyFX.tick(dt);
    candyRaf = CandyFX.parts.length ? requestAnimationFrame(candyLoop) : (CandyFX.tick(0), 0);
  }
  /** the burst when a friend is caught in Toy Catch, sized to the moment (power 1 = Toy Catch's own catch) */
  function candyBurst(x, y, power) {
    CandyFX.confetti(x, y, Math.round(130 * power), power);
    CandyFX.stars(x, y, Math.max(4, Math.round(16 * power)), Math.min(1, 0.45 + power * 0.55));
    if (!candyRaf) { candyLast = 0; candyRaf = requestAnimationFrame(candyLoop); }
  }

  // ── the tutor (the user's bunny): bobs while a line plays, reacts to the play ─────────────────────────
  function tutor(act) {
    if (G.screen !== 'game') return;
    restartAnim(E.tutor, act);
    const fx = { hop: ['happy', 900], cheer: ['happy', 1800], oops: ['oops', 1300], lean: ['cheeky', 1600] }[act];
    if (fx) setFace(fx[0], fx[1]);
  }
  setInterval(() => { E.tutor.classList.toggle('talk', G.screen === 'game' && S.talking > 0 && !E.tutor.matches('.hop,.cheer,.oops,.lean')); }, 120);
  // ── the tutor's face: a drawn mouth (user: "입이 어색한데" — the squashed picture of the mouth) and a face per line
  // (user: "토끼 표정도 말할때 마다 바뀌게"). Mouth = a top lip curve L→R and a bowl under it whose depth follows the voice;
  // two front teeth hang from the lip, the tongue sits in the bowl. Each face has its own mouth shape (image px). ──────
  const FACES = {
    smile:  { lx: 394, ly: 556, rx: 497, ry: 545, bend: 6,   D: 95,  round: 0,   rest: 1 },
    happy:  { lx: 387, ly: 550, rx: 504, ry: 537, bend: 9,   D: 90,  round: 0,   rest: .95 },
    wow:    { lx: 414, ly: 553, rx: 478, ry: 548, bend: -10, D: 98,  round: 1,   rest: 1 },
    wink:   { lx: 395, ly: 557, rx: 500, ry: 539, bend: 6,   D: 84,  round: 0,   rest: .9 },
    cheeky: { lx: 399, ly: 559, rx: 496, ry: 540, bend: 4,   D: 72,  round: .1,  rest: .85 },
    oops:   { lx: 416, ly: 563, rx: 476, ry: 559, bend: -5,  D: 46,  round: .6,  rest: .7 },
  };
  const LINE_FACES = ['smile', 'happy', 'wow', 'wink', 'cheeky'];
  const mEl = {
    in: E.tutor.querySelector('.m-in'), rim: E.tutor.querySelector('.m-rim'), lip: E.tutor.querySelector('.m-lip'),
    shade: E.tutor.querySelector('.m-shade'), clip: document.getElementById('tMouthClipPath'),
    tongue: E.tutor.querySelector('.m-tongue'), teeth: [...E.tutor.querySelectorAll('.m-tooth')],
  };
  let face = 'smile', faceUntil = 0, lastLineFace = 'smile', wasTalking = false, faceBack = 0;
  const M = Object.assign({}, FACES.smile);    // the mouth's current shape (eased toward the face's)
  let mOpen = 1;
  E.tutor.dataset.face = face;
  function setFace(name, ms) {
    face = name; E.tutor.dataset.face = name;
    clearTimeout(faceBack);
    if (ms) { faceUntil = performance.now() + ms; faceBack = setTimeout(() => { faceUntil = 0; if (!S.talking) setFace('smile'); }, ms); }
  }
  function drawMouth() {
    const L = [M.lx, M.ly], R = [M.rx, M.ry], wd = R[0] - L[0];
    const mx = (L[0] + R[0]) / 2, my = (L[1] + R[1]) / 2 + M.bend;
    const d = M.D * (0.1 + 0.9 * mOpen);
    const c1 = [R[0] + wd * (-0.04 + 0.2 * M.round), R[1] + d * (1.15 - 0.1 * M.round)];
    const c2 = [L[0] - wd * (-0.04 + 0.2 * M.round), L[1] + d * (1.25 - 0.15 * M.round)];
    const f = n => n.toFixed(1);
    const top = `M${f(L[0])} ${f(L[1])}Q${f(mx)} ${f(my)} ${f(R[0])} ${f(R[1])}`;
    const bowl = `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(L[0])} ${f(L[1])}`;
    const path = top + bowl + 'Z';
    mEl.in.setAttribute('d', path); mEl.rim.setAttribute('d', path); mEl.clip.setAttribute('d', path);
    mEl.shade.setAttribute('d', `M${f(L[0] + 4)} ${f(L[1] - 4)}Q${f(mx)} ${f(my - 4)} ${f(R[0] - 4)} ${f(R[1] - 4)}`);
    mEl.lip.setAttribute('d', `M${f(R[0] - 2)} ${f(R[1] + 3)}C${f(c1[0])} ${f(c1[1] + 3)} ${f(c2[0])} ${f(c2[1] + 3)} ${f(L[0] + 2)} ${f(L[1] + 3)}`);
    const bottom = 0.125 * R[1] + 0.375 * c1[1] + 0.375 * c2[1] + 0.125 * L[1];
    mEl.tongue.setAttribute('cx', f(mx + wd * 0.02)); mEl.tongue.setAttribute('cy', f(bottom - d * 0.2));
    mEl.tongue.setAttribute('rx', f(wd * 0.37)); mEl.tongue.setAttribute('ry', f(Math.max(4, d * 0.34)));
    const topY = x => { const t = (x - L[0]) / wd, u = 1 - t; return u * u * L[1] + 2 * u * t * my + t * t * R[1]; };
    [0.41, 0.615].forEach((t, i) => {
      const x = L[0] + wd * t, tw = Math.min(21, wd * 0.2);
      mEl.teeth[i].setAttribute('x', f(x)); mEl.teeth[i].setAttribute('y', f(topY(x + tw / 2) - 5)); mEl.teeth[i].setAttribute('width', f(tw));
    });
  }
  (function faceLoop() {
    const now = performance.now(), talking = G.screen === 'game' && S.talking > 0;
    if (talking && !wasTalking && now > faceUntil) {             // a new line: a new face (never the same twice running)
      let n; do { n = LINE_FACES[(Math.random() * LINE_FACES.length) | 0]; } while (n === lastLineFace);
      lastLineFace = n; setFace(n);
    }
    if (!talking && wasTalking && now > faceUntil) { clearTimeout(faceBack); faceBack = setTimeout(() => { if (!S.talking && performance.now() > faceUntil) setFace('smile'); }, 700); }
    wasTalking = talking;
    const F = FACES[face];
    for (const k of ['lx', 'ly', 'rx', 'ry', 'bend', 'D', 'round']) M[k] += (F[k] - M[k]) * 0.2;
    const target = talking ? 0.12 + 0.88 * Math.min(1, S.voiceLevel() * 1.7) : F.rest;
    mOpen += (target - mOpen) * (target > mOpen ? 0.55 : 0.3);
    drawMouth();
    requestAnimationFrame(faceLoop);
  })();
  const rig = E.tutor.querySelector('.rig');
  rig.addEventListener('animationend', (e) => { if (e.target === rig) E.tutor.classList.remove('hop', 'cheer', 'oops', 'lean'); });
  // blinks now and then (a double blink sometimes)
  (function blink() {
    setTimeout(() => {
      E.tutor.classList.add('blink'); setTimeout(() => E.tutor.classList.remove('blink'), 140);
      if (Math.random() < 0.25) setTimeout(() => { E.tutor.classList.add('blink'); setTimeout(() => E.tutor.classList.remove('blink'), 130); }, 300);
      blink();
    }, 2200 + Math.random() * 3200);
  })();
  /** the eyes look toward a screen point (the dragged piece, the place it snapped to, the hint); null = the board */
  let lookBack = 0;
  function lookAt(x, y, hold) {
    if (x == null) { const br = E.board.getBoundingClientRect(); x = br.left + br.width * .4; y = br.top + br.height * .5; }
    const r = E.tutor.getBoundingClientRect(), ex = r.left + r.width * .52, ey = r.top + r.height * .385;
    const dx = x - ex, dy = y - ey, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / (r.width * .8)) * 8;
    E.tutor.style.setProperty('--lx', (dx / d * k).toFixed(2)); E.tutor.style.setProperty('--ly', (dy / d * k * .85).toFixed(2));
    clearTimeout(lookBack);
    if (hold) lookBack = setTimeout(() => lookAt(null), hold);
  }

  // ── level = the tab on the board's top edge ───────────────────────────────────────────────────────
  function showLevel() {
    const t = `${G.level + 1}-${G.idx + 1}`;
    if (E.level.textContent !== t) { E.level.textContent = t; restartAnim(E.level, 'bump'); }
  }

  // ── frame lights: bulbs (pink / blue / yellow) with a star at each corner and every few bulbs ─────────────
  // (the board's frame, and the result card's frame in the same style)
  function layoutLights(el, FW, FH, across, down) {
    const IN = 2.5, cols = ['--bulb-pink', '--bulb-blue', '--bulb-yellow'];
    let html = '', n = 0;
    const put = (x, y, star) => {
      const l = (x / FW * 100).toFixed(2), t = (y / FH * 100).toFixed(2);
      html += star ? `<i class="st" style="left:${l}%;top:${t}%"></i>`
        : `<i style="left:${l}%;top:${t}%;--c:var(${cols[n % 3]});--d:${(n % 6) * -.27}s"></i>`;
      if (!star) n++;
    };
    const CI = 3.1;   // corner stars sit further in, inside the frame's round corners (user: "테두리 벗어나지 않았으면")
    const corner = (x, y) => put(x < FW / 2 ? CI : FW - CI, y < FH / 2 ? CI : FH - CI, true);
    for (let i = 0; i <= across; i++) { const x = IN + (FW - 2 * IN) * i / across; if (i === 0 || i === across) corner(x, IN); else put(x, IN, i % 5 === 0); }
    for (let i = 1; i < down; i++) put(FW - IN, IN + (FH - 2 * IN) * i / down, i % 4 === 0);
    for (let i = across; i >= 0; i--) { const x = IN + (FW - 2 * IN) * i / across; if (i === 0 || i === across) corner(x, FH - IN); else put(x, FH - IN, i % 3 === 0); }
    for (let i = down - 1; i >= 1; i--) put(IN, IN + (FH - 2 * IN) * i / down, i % 4 === 0);
    el.innerHTML = html;
  }
  layoutLights(E.lights, 92, 78.33, 15, 12);
  layoutLights($('#clearLights'), 104, 68, 17, 10);
  /** big candy letters: a dark edge under a gradient fill (no white outer line — user) */
  function candyText(el, t) { el.innerHTML = `<span class="o">${t}</span><span class="f">${t}</span>`; }
  // score / level written on the sheet's blank ribbons: an outline layer under a gradient-filled one
  function setRib(el, t, bump) {
    t = String(t);
    if (el.dataset.t !== t || !el.firstChild || el.firstChild.nodeType === 3) { el.dataset.t = t; el.innerHTML = `<span class="o">${t}</span><span class="f">${t}</span>`; }
    if (bump) restartAnim(el, 'bump');
  }
  [E.score].forEach(el => { el.classList.add('rib-txt'); setRib(el, el.textContent); });
  // twinkling stars over the title room (user: "배경에 별 반짝이 좀 더"): sparkles and little candy stars, seeded positions,
  // each on its own beat; some drift up slowly. They sit behind the logo and START.
  (function titleStars() {
    let s = 7;
    const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    // all in the START button's warm yellow (user: "흰색말고 노란색이어야하지 않아? 스타트버튼에 있는 별 참고해")
    const cols = ['--fx-yellow', '--fx-yellow', '--spark-amber', '--fx-orange'];   // clear yellows, no near-white
    let html = '';
    for (let i = 0; i < 58; i++) {
      const star = R() < 0.3, x = R() * 100, y = R() * 100;
      const size = star ? 1.6 + R() * 1.8 : 1.4 + R() * 3.2;
      const c = cols[(R() * 4) | 0];
      html += `<i class="tstar ${star ? 'st' : 'sp'}${R() < 0.35 ? ' drift' : ''}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;--s:calc(${size.toFixed(2)} * var(--u));--c:var(${c});--t:${(2.2 + R() * 3).toFixed(2)}s;--d:${(-R() * 5).toFixed(2)}s"><b></b></i>`;
    }
    E.stars.innerHTML = html;
  })();
  // soap bubbles rising over the room, on the title and behind the board in the game (user: "게임화면에도 인트로처럼"): seeded sizes / lanes / speeds, already on their way
  (function bubbles() {
    let s = 11;
    const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    let html = '';
    for (let i = 0; i < 18; i++) {
      const size = 2.6 + R() * 6, dur = 13 + R() * 11;
      html += `<span class="bubble" style="--x:${(R() * 100).toFixed(1)}%;--s:calc(${size.toFixed(2)} * var(--u));--d:${dur.toFixed(1)}s;--dl:${(-R() * dur).toFixed(1)}s;`
        + `--sw:${(2.6 + R() * 2.4).toFixed(2)}s;--a:calc(${(1.2 + R() * 3).toFixed(2)} * var(--u));--hue:${(R() * 360) | 0}deg"><i><b class="bd"></b><b class="hl"></b></i></span>`;
    }
    E.bubbles.innerHTML = html;
  })();
  // pointer parallax on the title: the room and stars lean away, the logo toward the pointer (a touch screen just drifts)
  let pxRaf = 0;
  addEventListener('pointermove', (e) => {
    if (G.screen !== 'title' || e.pointerType === 'touch' || pxRaf) return;
    pxRaf = requestAnimationFrame(() => {
      pxRaf = 0;
      app.style.setProperty('--px', ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
      app.style.setProperty('--py', ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
    });
  });
  // little twinkles over the title logo
  (function twinkles() {
    const at = [[9, 14], [30, 8], [58, 6], [86, 12], [94, 44], [5, 52], [50, 30], [72, 70], [22, 74]];
    at.forEach(([x, y], i) => { const t = document.createElement('i'); t.className = 'twinkle'; t.style.cssText = `left:${x}%;top:${y}%;--d:${(i * 0.37).toFixed(2)}s`; E.logoWrap.appendChild(t); });
  })();

  // ── title ───────────────────────────────────────────────────────────────────────────────────────────────
  let ambient = null;
  function showTitle() {
    G.tok++; clearTimers(); endDragSilently(); S.stopVoice(); FX.clear();
    G.screen = 'title'; app.dataset.screen = 'title'; G.busy = true;
    E.clear.classList.remove('show'); E.word.classList.remove('show'); E.next.classList.remove('show'); hideHand();
    levelMenu(false);                               // (the tab's level list never stays open on the title)
    E.drag.innerHTML = ''; E.bursts.innerHTML = '';
    E.logoWrap.classList.remove('float', 'leave'); E.stars.classList.remove('leave'); E.bubbles.classList.remove('leave'); E.titleHand.classList.remove('leave');
    restartAnim(E.logoWrap, 'drop');
    setTimeout(() => { if (G.screen === 'title') E.logoWrap.classList.add('float'); }, 1150);
    E.start.classList.remove('hit'); E.start.style.opacity = ''; restartAnim(E.start, 'in');
    restartAnim(E.sys, 'pop');
    clearInterval(ambient);
    ambient = setInterval(titleSparkle, 140);
    const tok = G.tok;
    later(7000, () => { if (alive(tok) && G.screen === 'title' && !decorating()) S.say('t:pressstart'); });
  }
  // the sparkle stream that flows round to START (the reference video)
  let amb = 0;
  function titleSparkle() {
    if (G.screen !== 'title' || document.hidden) return;
    const r = E.start.getBoundingClientRect(), k = u();
    amb = (amb + 0.075) % 1;
    const t = amb, x0 = r.right + 26 * k, y0 = r.top - 26 * k, x1 = r.right - 2 * k, y1 = r.top + r.height * .55;
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * (r.right + 18 * k) + t * t * x1;
    const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (r.top + 6 * k) + t * t * y1;
    FX.trail(x, y, 1, k / 9);
  }

  let starting = false;
  E.start.addEventListener('click', () => { if (G.screen === 'title' && !starting && !decorating()) startGame(); });

  // ── continue + level select (phonics-kit F1 — the same as Croco; user 2026-11-22: "진행저장은 왜 puzzle은 적용안됐어? 통일해서
  // 적용해"). The shared record (js/phonics-progress.js, 'puzzle'): setLevel when a level starts, played when it is cleared.
  // The chip left of START shows the level START plays (the page opens on the saved level = continue) and opens the levels:
  // open = every level reached and the one after the highest cleared; the rest show a lock. Each level = its piece grid.
  const PP = window.PhonicsProgress || null, GAME_ID = 'puzzle';
  const progress = () => (PP ? PP.get(GAME_ID) : { level: null, maxLevel: null, best: {} });
  function unlockedTop() {
    const r = progress();
    return Math.max(1, Math.min(LEVELS.length, Math.max(r.maxLevel || 1, ((r.best && r.best.level) || 0) + 1)));
  }
  const gridOf = L => `<span class="grid" style="--c:${L.cols};--r:${L.rows}">${'<i></i>'.repeat(L.cols * L.rows)}</span>`;
  const SVG_LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.2" y="10.6" width="13.6" height="9.6" rx="2.4"/><path d="M8.4 10.6V8.2a3.6 3.6 0 0 1 7.2 0v2.4"/></svg>';
  // the board's LEVEL tab is the picker (user 2026-11-22: the level display goes into the game screen): it shows the level's
  // piece grid; the title has START only, which continues at G.pick (the saved level)
  function paintPick() {
    const pk = $('#boardTab');
    pk.querySelector('.grid')?.remove();
    pk.querySelector('.caret').insertAdjacentHTML('beforebegin', gridOf(LEVELS[G.pick]));
    pk.setAttribute('aria-label', `Level ${G.pick + 1}`);
  }
  function levelMenu(open) {
    const m = $('#lvMenu'), pk = $('#boardTab'), panel = m.querySelector('.lm-panel');
    if (open) {
      const top = unlockedTop();
      panel.innerHTML = LEVELS.map((L, k) => {
        const on = k < top || k === G.pick;
        return `<button class="lm-t${k === G.pick ? ' cur' : ''}${on ? '' : ' lock'}" data-k="${k}" aria-label="Level ${k + 1}${on ? '' : ' (locked)'}"${on ? '' : ' aria-disabled="true"'}>`
          + `<span class="n">${k + 1}</span>${gridOf(L)}${on ? '' : SVG_LOCK}</button>`;
      }).join('');
      const r = pk.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      panel.style.setProperty('--tx', (r.left - sr.left) + 'px');
      panel.style.setProperty('--ty', (r.bottom - sr.top + u() * 0.8) + 'px');   // under the tab
    }
    m.classList.toggle('show', open);
    m.setAttribute('aria-hidden', String(!open));
    pk.setAttribute('aria-expanded', String(open));
  }
  $('#boardTab').addEventListener('click', (e) => {
    e.stopPropagation();
    if (G.screen !== 'game' || app.classList.contains('explain') || E.clear.classList.contains('show')) return;
    S.unlock(); S.sfx('tap');
    levelMenu(!$('#lvMenu').classList.contains('show'));
  });
  /** another level from the tab, mid-game: its first picture starts now (the stars so far stay in the total) */
  function switchLevel(k) {
    G.pick = G.level = k; G.idx = 0; G.levelStars = {};
    loadImg(G.order[k * PER]);
    startPuzzle();
  }
  $('#lvMenu').addEventListener('click', (e) => {
    e.stopPropagation();
    const t = e.target.closest('.lm-t');
    if (!t) { levelMenu(false); return; }                   // outside the tiles: close
    if (t.classList.contains('lock')) {
      S.sfx('boing');
      t.animate([{ translate: '0 0' }, { translate: '-6% 0' }, { translate: '6% 0' }, { translate: '0 0' }], { duration: 260 });
      return;
    }
    S.sfx('pick');
    levelMenu(false);
    const k = +t.dataset.k;
    if (k !== G.level) switchLevel(k);
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') levelMenu(false); });
  G.pick = Math.min(progress().level || 1, unlockedTop()) - 1;   // continue at the saved level, never past the open ones
  paintPick();
  async function startGame() {
    S.unlock(); S.startBgm(); S.sfx('start'); S.stopVoice();
    STT.preload();                       // the on-device backup recogniser loads while the first puzzle plays
    const tok = ++G.tok;
    starting = true;
    clearInterval(ambient);
    // no colour swirl (user: "색들이 회오리 처럼 들어가는건 안어울려"): START bursts into gold sparkles, the logo lifts
    // away and the stars fade, then the game screen comes in
    const r = E.start.getBoundingClientRect();
    FX.sparkles(r.left + r.width / 2, r.top + r.height / 2, 26, 170, u() / 9);
    restartAnim(E.start, 'hit');
    await wait(160);
    E.logoWrap.classList.remove('float'); restartAnim(E.logoWrap, 'leave'); E.stars.classList.add('leave'); E.titleHand.classList.add('leave');   // (the bubbles keep floating into the game — user)
    S.sfx('whoosh');
    await wait(560);
    starting = false;
    if (!alive(tok)) return;
    app.style.setProperty('--px', 0); app.style.setProperty('--py', 0);
    newGame();
    enterGame(tok);
  }
  function newGame() {
    G.order = Q.get('words') ? Q.get('words').split(',').map(w => WORDS.find(x => x.w === w)).filter(Boolean) : shuffle(WORDS);
    G.level = Q.get('level') ? Math.min(LEVELS.length - 1, Math.max(0, +Q.get('level') - 1)) : (G.pick || 0); G.idx = 0; G.stars = 0; G.levelStars = {}; G.taught = false;
    setRib(E.score, 0);
    loadImg(G.order[G.level * PER]);
  }
  async function enterGame(tok) {
    G.screen = 'game'; app.dataset.screen = 'game'; G.busy = true;
    resetBoard();
    restartAnim(E.frame, 'intro'); restartAnim(E.gameLogo, 'pop'); restartAnim(E.tray, 'intro');
    restartAnim(E.hudL, 'pop'); restartAnim(E.sys, 'pop');
    buildTray([]);
    await wait(120);
    S.sfx('sparkle');
    FX.frameComets(E.frame.getBoundingClientRect(), FAST ? 60 : 1100);
    await wait(500);
    if (!alive(tok)) return;
    G.skipTeach = false;
    if (!G.taught) explaining(true);               // SKIP shows from the greeting through the how-to demo
    await Promise.race([S.say('t:hello'), skipped()]);
    if (!alive(tok)) return;
    // the microphone: asked here, once (the tutor asks for it if the browser prompt stays up); an unanswered prompt
    // must not hold the game — after 15 s it goes on, and the word step just shows Next until the mic is on
    if (!Q.has('fake') && Mic.supported() && Mic.state !== 'on' && Mic.state !== 'denied') {
      const ask = setTimeout(() => { if (alive(tok)) S.say('t:micask'); }, 1600);
      await Promise.race([Mic.open(S.ctx), wait(15000)]);
      clearTimeout(ask);
    }
    await wait(200);
    if (alive(tok)) startPuzzle();
  }

  // ── one puzzle ──────────────────────────────────────────────────────────────────────────────────────────
  function resetBoard() {
    E.placed.innerHTML = ''; E.board.classList.remove('done', 'shine', 'hinting'); E.frame.classList.remove('party');
    E.board.classList.add('blank');
    E.word.classList.remove('show'); E.next.classList.remove('show'); hideHand();
  }
  function renderScale() {
    const w = E.board.getBoundingClientRect().width * Math.min(2, devicePixelRatio || 1);
    return Math.max(0.5, Math.min(1.6, w / IW));
  }
  async function startPuzzle() {
    const tok = ++G.tok;
    if (G.idx === 0) {                                // a level begins: the record's level (the title continues from it)
      G.pick = G.level; paintPick();
      if (PP) PP.setLevel(GAME_ID, G.level + 1);
      G.jumpTold = false;                             // the jump guide: once a level (phonics-kit common rule)
    }
    clearTimers(); endDragSilently(); S.stopVoice(); S.resetSnap();
    G.busy = true;
    resetBoard();
    E.drag.innerHTML = '';
    const cfg = LEVELS[G.level], word = G.order[G.level * PER + G.idx];
    G.word = word; resetPicStars();
    showLevel();
    // a picture that won't load (an error, or 10 s without an answer) is tried once more, then skipped — the board used
    // to stay blank and busy with no hint, and only Home got the child out
    let img = await loadImg(word).catch(() => null);
    if (!img && alive(tok)) { await wait(500); img = await loadImg(word).catch(() => null); }
    if (!alive(tok)) return;
    if (!img) { skipPicture(); return; }
    G.img = img;
    const nx = G.order[G.level * PER + G.idx + 1]; if (nx) loadImg(nx);
    const cu = G.cut = Jigsaw.cut(cfg.cols, cfg.rows, (Math.random() * 1e9) | 1, IW, IH);
    const rs = renderScale();
    Jigsaw.renderGhost(E.ghost, img, cu, rs);
    Jigsaw.renderFull(E.full, img, cu, rs);
    Jigsaw.clearCanvas(E.hint);
    G.pieces = [];
    for (let r = 0; r < cu.rows; r++) for (let c = 0; c < cu.cols; c++) {
      const cv = Jigsaw.renderPiece(img, cu, r, c, rs);
      const p = { r, c, i: G.pieces.length, cv, placed: false };
      cv.dataset.i = p.i;
      G.pieces.push(p);
    }
    G.left = G.pieces.length;
    // 1) the whole picture + its word
    E.board.classList.remove('blank'); E.board.classList.add('done');
    restartAnim(E.board, 'shine');
    await wait(500);
    if (!alive(tok)) return;
    S.say('w:' + word.w);
    await wait(1300);
    if (!alive(tok)) return;
    // 2) it breaks into pieces that fly into the tray
    const order = shuffle(G.pieces);
    buildTray(order);
    const br = E.board.getBoundingClientRect(), bs = br.width / IW;
    const flying = order.map(p => {
      const el = pieceEl(p, br, bs);
      E.drag.appendChild(el);
      return { p, el };
    });
    E.board.classList.remove('done');
    S.sfx('whoosh');
    await wait(260);
    for (let n = 0; n < flying.length; n++) {
      if (!alive(tok)) return;
      const { p, el } = flying[n];
      const slot = slotOf(p), sr = slot.getBoundingClientRect(), vr = E.view.getBoundingClientRect();
      const fit = fitIn(sr, p);
      // pieces for slots below the window fly to its bottom edge and drop in there
      const ty = Math.min(fit.top, vr.bottom - fit.h * 0.6);
      el.style.transformOrigin = '0 0';
      el.classList.add('fly');
      el.style.left = fit.left + 'px'; el.style.top = ty + 'px'; el.style.transform = `scale(${fit.s})`;
      S.sfx('fly');
      trailAlong(el, 620);
      later(640, () => {
        if (!alive(tok)) return;
        el.remove();
        slot.appendChild(p.cv); p.cv.classList.add('arrive');
        setTimeout(() => p.cv.classList.remove('arrive'), 500);
      });
      await wait(FAST ? 10 : 110);
    }
    await wait(700);
    if (!alive(tok)) return;
    G.oops = false; G.wrong = 0;
    if (!G.taught) { G.taught = true; if (!G.skipTeach) await teachDemo(); if (!alive(tok)) return; }
    explaining(false);
    G.busy = false;
    armHint();
  }
  /** the picture didn't load: on to the next one; past the level's last, the clear card if a picture was played, else
   *  back to the title with the levels open */
  function skipPicture() {
    G.busy = false;
    if (Q.has('log')) console.log('picture failed, skipped:', G.word.w);
    G.idx++;
    if (G.idx < PER && G.level * PER + G.idx < G.order.length) { startPuzzle(); return; }
    if (G.order.slice(G.level * PER, G.level * PER + PER).some(w => G.levelStars[w.w])) { levelClear(); return; }
    showTitle();
  }
  /** a piece's canvas in a .dpiece box at its board place (screen px) */
  function pieceEl(p, br, bs) {
    const cu = G.cut, el = document.createElement('div');
    el.className = 'dpiece';
    el.style.width = (cu.cw + 2 * cu.m) * bs + 'px'; el.style.height = (cu.ch + 2 * cu.m) * bs + 'px';
    el.style.left = br.left + (p.c * cu.cw - cu.m) * bs + 'px'; el.style.top = br.top + (p.r * cu.ch - cu.m) * bs + 'px';
    el.appendChild(p.cv);
    return el;
  }
  /** where a piece sits fitted in a tray slot (screen px; scale s from its board size) */
  function fitIn(sr, p) {
    const cu = G.cut, bs = E.board.getBoundingClientRect().width / IW;
    const pw = (cu.cw + 2 * cu.m) * bs, ph = (cu.ch + 2 * cu.m) * bs;
    const s = Math.min(sr.width * 0.86 / pw, sr.height * 0.84 / ph);
    return { s, w: pw * s, h: ph * s, left: sr.left + (sr.width - pw * s) / 2, top: sr.top + (sr.height - ph * s) / 2 };
  }
  function trailAlong(el, ms) {
    const t0 = performance.now(), k = u() / 9;
    const step = () => {
      if (!el.isConnected || performance.now() - t0 > ms) return;
      const r = el.getBoundingClientRect();
      FX.trail(r.left + r.width / 2, r.top + r.height / 2, 1, k);
      requestAnimationFrame(step);
    };
    step();
  }

  // ── tray ────────────────────────────────────────────────────────────────────────────────────────────────
  function buildTray(order) {
    E.list.innerHTML = '';
    order.forEach(p => { const s = document.createElement('div'); s.className = 'slot'; s.dataset.i = p.i; E.list.appendChild(s); });
    G.top = 0; updateTray();
  }
  const slotOf = p => E.list.querySelector(`.slot[data-i="${p.i}"]`);
  const liveSlots = () => [...E.list.querySelectorAll('.slot:not(.gone)')];
  function updateTray() {
    const n = liveSlots().length, max = Math.max(0, n - 3);
    G.top = Math.max(0, Math.min(G.top, max));
    E.list.style.setProperty('--top', G.top);
    E.up.disabled = G.top <= 0; E.down.disabled = G.top >= max;
    let d = '';
    for (let i = 0; i < n; i++) d += `<i class="${i >= G.top && i < G.top + 3 ? 'on' : ''}"></i>`;
    E.dots.innerHTML = d;
  }
  function scrollTray(dir) {
    if (G.screen !== 'game') return;
    const before = G.top; G.top += dir; updateTray();
    if (G.top !== before) { S.sfx('tap'); poke(); }
  }
  E.up.addEventListener('click', () => scrollTray(-1));
  E.down.addEventListener('click', () => scrollTray(1));
  $('#btnSkip').addEventListener('click', (e) => { e.stopPropagation(); skipTeach(); });   // the explanation's SKIP
  let wheelAt = 0;
  E.tray.addEventListener('wheel', (e) => { e.preventDefault(); const now = performance.now(); if (now - wheelAt < 220 || Math.abs(e.deltaY) < 4) return; wheelAt = now; scrollTray(e.deltaY > 0 ? 1 : -1); }, { passive: false });

  // ── drag & drop ─────────────────────────────────────────────────────────────────────────────────────────
  E.list.addEventListener('pointerdown', (e) => {
    const cv = e.target.closest('canvas');
    if (!cv || G.busy || G.drag || G.screen !== 'game') return;
    e.preventDefault();
    const p = G.pieces[+cv.dataset.i];
    if (!p || p.placed) return;
    beginDrag(p, e.clientX, e.clientY, e.pointerId);
  });
  addEventListener('pointermove', (e) => { if (G.drag && e.pointerId === G.drag.id) moveDrag(e.clientX, e.clientY); });
  addEventListener('pointerup', (e) => { if (G.drag && e.pointerId === G.drag.id) endDrag(e.clientX, e.clientY); });
  addEventListener('pointercancel', (e) => { if (G.drag && e.pointerId === G.drag.id) { const d = G.drag; G.drag = null; backToTray(d); } });

  function beginDrag(p, x, y, id) {
    S.unlock(); S.sfx('pick'); hideHint();
    const cu = G.cut, r = p.cv.getBoundingClientRect(), bs = E.board.getBoundingClientRect().width / IW;
    const pw = (cu.cw + 2 * cu.m) * bs, ph = (cu.ch + 2 * cu.m) * bs;
    const fx = Math.max(0, Math.min(1, (x - r.left) / r.width)), fy = Math.max(0, Math.min(1, (y - r.top) / r.height));
    const el = document.createElement('div');
    el.className = 'dpiece';
    el.style.width = pw + 'px'; el.style.height = ph + 'px';
    el.style.left = x - fx * pw + 'px'; el.style.top = y - fy * ph + 'px';
    el.style.transformOrigin = `${fx * 100}% ${fy * 100}%`;
    el.style.transform = `scale(${r.width / pw})`;
    el.appendChild(p.cv);
    E.drag.appendChild(el);
    void el.offsetWidth;
    el.classList.add('lift'); el.style.transform = 'scale(1)';
    G.drag = { p, el, fx, fy, pw, ph, id, slot: slotOf(p), t: 0 };
  }
  function moveDrag(x, y) {
    const d = G.drag;
    d.el.style.left = x - d.fx * d.pw + 'px'; d.el.style.top = y - d.fy * d.ph + 'px';
    const now = performance.now();
    if (now - d.t > 34) { d.t = now; FX.trail(x, y, 1, u() / 9); lookAt(x, y); }
  }
  function endDrag(x, y) {
    const d = G.drag; G.drag = null;
    const cu = G.cut, p = d.p, br = E.board.getBoundingClientRect(), bs = br.width / IW;
    const px = (parseFloat(d.el.style.left) - br.left) / bs + cu.cw / 2 + cu.m;   // the piece's middle, picture px
    const py = (parseFloat(d.el.style.top) - br.top) / bs + cu.ch / 2 + cu.m;
    const tx = p.c * cu.cw + cu.cw / 2, ty = p.r * cu.ch + cu.ch / 2;
    if (Math.hypot(px - tx, py - ty) < cu.k * 0.42) return snap(d, br, bs);
    const onBoard = x > br.left && x < br.right && y > br.top && y < br.bottom;
    if (onBoard) {                     // a wrong place: a soft boing, the right place glows for a moment
      S.sfx('boing'); restartAnim(E.frame, 'nope'); tutor('oops');
      showHint(p, 1500);
      G.wrong++;
      if (!G.oops) { G.oops = true; S.say('t:oops'); }       // said once per picture
    }
    backToTray(d);
  }
  function backToTray(d) {
    lookAt(null);
    const p = d.p, el = d.el, slot = d.slot;
    if (!slot || !slot.isConnected) { el.remove(); return; }
    const fit = fitIn(slot.getBoundingClientRect(), p);
    // switch the scale origin to the corner while the scale is 1 (no jump), then glide back into the slot
    const r = el.getBoundingClientRect();
    el.classList.remove('lift');
    el.style.transformOrigin = '0 0'; el.style.transform = 'scale(1)';
    el.style.left = r.left + 'px'; el.style.top = r.top + 'px';
    void el.offsetWidth;
    el.classList.add('back');
    el.style.left = fit.left + 'px'; el.style.top = fit.top + 'px'; el.style.transform = `scale(${fit.s})`;
    setTimeout(() => { if (el.isConnected) { el.remove(); slot.appendChild(p.cv); } armHint(); }, 380);
  }
  function endDragSilently() {
    if (!G.drag) return;
    const d = G.drag; G.drag = null; d.el.remove();
    if (d.slot && d.slot.isConnected) d.slot.appendChild(d.p.cv);
  }
  function snap(d, br, bs) {
    const cu = G.cut, p = d.p, el = d.el, tok = G.tok;
    const tl = p.c * cu.cw - cu.m, tt = p.r * cu.ch - cu.m;
    el.classList.remove('lift');
    const r = el.getBoundingClientRect();
    el.style.transformOrigin = '0 0'; el.style.transform = 'scale(1)'; el.style.left = r.left + 'px'; el.style.top = r.top + 'px';
    void el.offsetWidth;
    el.classList.add('go');
    el.style.left = br.left + tl * bs + 'px'; el.style.top = br.top + tt * bs + 'px';
    p.placed = true; G.left--;
    G.busy = G.left === 0;
    hideHint();
    const slot = d.slot;
    if (slot) { slot.classList.add('gone'); setTimeout(() => { slot.remove(); updateTray(); }, 330); }
    updateTrayAfterRemoval();
    setTimeout(() => {
      if (!alive(tok)) { el.remove(); return; }
      el.remove();
      const cv = p.cv;
      cv.style.left = (tl / IW * 100) + '%'; cv.style.top = (tt / IH * 100) + '%';
      cv.style.width = ((cu.cw + 2 * cu.m) / IW * 100) + '%'; cv.style.height = ((cu.ch + 2 * cu.m) / IH * 100) + '%';
      E.placed.appendChild(cv);
      restartAnim(cv, 'snap');
      restartAnim(E.board, 'ping');
      // the burst: rainbow rays + stars, notes and confetti from the piece's middle
      const cx = br.left + (tl + cu.cw / 2 + cu.m) * bs, cy = br.top + (tt + cu.ch / 2 + cu.m) * bs;
      S.sfx('snap'); tutor('hop'); lookAt(cx, cy, 900);
      candyBurst(cx, cy, 0.55);                       // Toy Catch's catch burst, a little smaller for one piece
      if (G.left === 0) complete(tok); else armHint();
    }, 210);
  }
  function updateTrayAfterRemoval() {
    // the dots and buttons change at once; the window keeps its place unless it ran past the end
    const n = liveSlots().length, max = Math.max(0, n - 3);
    if (G.top > max) G.top = max;
    updateTray();
  }
  // ── stars (up to 3 per picture) and the sticker book ─────────────────────────────────────────────────
  const picStarsEl = $('#picStars');
  let stickers = {};
  try { stickers = JSON.parse(localStorage.getItem('ppStickers') || '{}') || {}; } catch (e) { stickers = {}; }
  function saveSticker(w, n) {
    if ((stickers[w] || 0) >= n) return;
    stickers[w] = n;
    try { localStorage.setItem('ppStickers', JSON.stringify(stickers)); } catch (e) { /* storage off */ }
    showBookCount();
  }
  function showBookCount() {
    const n = WORDS.filter(x => stickers[x.w] > 0).length;
    $('#btnDecor').disabled = !n;   // (no count anywhere — user: "타이틀 옆에 갯수는 삭제해")
  }
  function resetPicStars() { G.picStars = [false, false, false]; picStarsEl.classList.remove('show'); picStarsEl.querySelectorAll('i').forEach(i => i.classList.remove('on')); }
  function earnStar(i) {
    if (!G.picStars || G.picStars[i]) return;
    G.picStars[i] = true;
    // the slot in the score pill lights up (sparkles there) and the total next to it bumps
    const slot = picStarsEl.children[i]; restartAnim(slot, 'on');
    const r = slot.getBoundingClientRect(), k = u() / 9;
    if (r.width) FX.sparkles(r.left + r.width / 2, r.top + r.height / 2, 10, 110, k);
    S.sfx('sparkle');
    G.stars++; setRib(E.score, G.stars, true);
    const n = G.picStars.filter(Boolean).length;
    G.levelStars[G.word.w] = n; saveSticker(G.word.w, n);
  }

  // ── the explanation (first game of a visit): the greeting, then on the first puzzle the hand moves a piece to its
  // place while the tutor says how. SKIP (bottom right, white see-through glass, like the other phonics games —
  // phonics-kit README "공통 규칙" 1; user 2026-11-22: "puzzle만 게임설명과 게임설명 skip 하는 버튼만 없어? 다른게임처럼
  // 만들어줘") cuts it: the voice stops, the demo ends, the child plays at once.
  function explaining(on) { app.classList.toggle('explain', !!on); }
  let skipFns = [];
  const skipped = () => new Promise(r => skipFns.push(r));
  function skipTeach() {
    if (!app.classList.contains('explain')) return;
    G.skipTeach = true; S.sfx('tap'); S.stopVoice(); hideHint(); explaining(false);
    skipFns.splice(0).forEach(r => r());
  }
  async function teachDemo() {
    const slot = liveSlots()[G.top];
    const p = slot && G.pieces[+slot.dataset.i];
    if (!p || p.placed || !p.cv.isConnected) return;
    explaining(true); tutor('lean');
    // played for real, like the other games' explanations (user 2026-11-22: "다른 파닉스 처럼 실제로 게임진행하면서
    // 설명 하는게 있어야하지 않아?"): the hand drags a tray piece onto its place and it snaps with the child's own
    // snap; then the word step is told, then "Now you try!"
    const on = () => app.classList.contains('explain');
    const steps = (async () => {
      await Promise.all([S.say('t:howto'), demoDrag(p)]);
      if (!on()) return;
      await S.say('t:howto2');
      if (!on()) return;
      tutor('cheer');
      await S.say('t:tryit');
    })();
    await Promise.race([steps, skipped()]);
    hideHint();
  }
  /** the explanation's real move: the white hand comes to piece p in the tray, grabs it and drags it onto its place,
   *  where it snaps exactly like a child's move (same snap, burst, sound). SKIP mid-way finishes the move at once. */
  async function demoDrag(p) {
    const sr = stage.getBoundingClientRect(), k = u(), off = [-3.42 * k, -0.24 * k];
    const r = p.cv.getBoundingClientRect(), a = [r.left + r.width / 2, r.top + r.height / 2];
    const cu = G.cut, br = E.board.getBoundingClientRect(), bs = br.width / IW;
    const b = [br.left + (p.c * cu.cw + cu.cw / 2) * bs, br.top + (p.r * cu.ch + cu.ch / 2) * bs];
    const handAt = (x, y) => { E.hand.style.left = x - sr.left + off[0] + 'px'; E.hand.style.top = y - sr.top + off[1] + 'px'; };
    const cut = () => !app.classList.contains('explain');
    hideHand(); handAt(a[0], a[1]); E.hand.classList.add('show');
    await wait(cut() ? 0 : 550);
    E.hand.classList.add('press');
    beginDrag(p, a[0], a[1], -1);
    const T = 1400, t0 = performance.now(), lift = 9 * k;
    await new Promise(res => {
      const step = () => {
        const t = cut() ? 1 : Math.min(1, (performance.now() - t0) / T), e = t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        const x = a[0] + (b[0] - a[0]) * e, y = a[1] + (b[1] - a[1]) * e - Math.sin(Math.PI * e) * lift;   // a little arc
        if (G.drag) { moveDrag(x, y); handAt(x, y); }
        if (t < 1 && G.drag) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
    if (G.drag && G.drag.p === p) endDrag(b[0], b[1]);           // the right place: it snaps
    E.hand.classList.remove('press');
    await wait(cut() ? 0 : 450);
    hideHand();
  }


  // ── hint: after a while without a move, the hand shows where the top tray piece goes ──────────────────────
  function armHint() {
    clearTimeout(G.hintT);
    if (G.busy || G.screen !== 'game') return;
    G.hintT = setTimeout(autoHint, FAST ? 400 : 9000);
  }
  function poke() { hideHint(); armHint(); }
  function autoHint() {
    if (G.busy || G.drag || G.screen !== 'game') return;
    const slot = liveSlots()[G.top];
    const p = slot && G.pieces[+slot.dataset.i];
    if (!p || p.placed || !p.cv.isConnected) return;
    S.say('t:hint'); tutor('lean');
    guideHand(p).then(armHint);
  }
  /** the hint picture + the white hand gliding from piece p to its place, twice; resolves when done or cut */
  function guideHand(p) {
    showHint(p, 3400);
    { const hb = E.board.getBoundingClientRect(), hs = hb.width / IW, hcu = G.cut; lookAt(hb.left + (p.c * hcu.cw + hcu.cw / 2) * hs, hb.top + (p.r * hcu.ch + hcu.ch / 2) * hs, 3000); }
    // the hand glides from the piece to its place, twice
    const sr = stage.getBoundingClientRect(), k = u(), cr = p.cv.getBoundingClientRect(), br = E.board.getBoundingClientRect(), bs = br.width / IW, cu = G.cut;
    const a = [cr.left + cr.width * .5 - sr.left, cr.top + cr.height * .5 - sr.top];
    const b = [br.left + (p.c * cu.cw + cu.cw / 2) * bs - sr.left, br.top + (p.r * cu.ch + cu.ch / 2) * bs - sr.top];
    const off = [-3.42 * k, -0.24 * k];    // the common white hand's fingertip: 38 % across, 2 % down of its 9 x 12 u
    E.hand.classList.add('show'); E.hand.classList.remove('press');
    E.hand.getAnimations().forEach(x => x.cancel());
    const anim = E.hand.animate([
      { left: a[0] + off[0] + 'px', top: a[1] + off[1] + 'px', opacity: 0, offset: 0 },
      { left: a[0] + off[0] + 'px', top: a[1] + off[1] + 'px', opacity: 1, offset: .15 },
      { left: b[0] + off[0] + 'px', top: b[1] + off[1] + 'px', opacity: 1, offset: .75 },
      { left: b[0] + off[0] + 'px', top: b[1] + off[1] + 'px', opacity: 0, offset: 1 },
    ], { duration: 1600, iterations: 2, easing: 'ease-in-out', fill: 'forwards' });
    const end = () => E.hand.classList.remove('show');
    return anim.finished.then(end, end);
  }
  function showHint(p, ms) {
    Jigsaw.renderHint(E.hint, G.cut, p.r, p.c, Math.min(1, renderScale()));
    E.board.classList.add('hinting');
    clearTimeout(G.hintOff);
    G.hintOff = setTimeout(() => E.board.classList.remove('hinting'), ms);
  }
  function hideHint() {
    clearTimeout(G.hintT); clearTimeout(G.hintOff);
    E.board.classList.remove('hinting');
    if (!E.hand.classList.contains('press')) hideHand();
  }
  function hideHand() { E.hand.getAnimations().forEach(x => x.cancel()); E.hand.classList.remove('show', 'press'); E.hand.style.left = ''; E.hand.style.top = ''; }

  // ── puzzle done ─────────────────────────────────────────────────────────────────────────────────────────
  async function complete(tok) {
    G.busy = true; clearTimeout(G.hintT);
    await wait(380);
    if (!alive(tok)) return;
    E.board.classList.add('done'); restartAnim(E.board, 'shine'); E.frame.classList.add('party'); tutor('cheer');
    S.sfx('win');
    FX.confetti(110);
    const br = E.board.getBoundingClientRect(), k = u() / 9;
    [[0, 0], [1, 0], [0, 1], [1, 1], [.5, .5]].forEach(([fx, fy], i) => setTimeout(() => FX.sparkles(br.left + br.width * fx, br.top + br.height * fy, 12, 140, k), i * 120));
    later(350, () => alive(tok) && earnStar(0));                       // ★ done
    if (!G.wrong) later(800, () => alive(tok) && earnStar(1));        // ★ no wrong spot
    await wait(500);
    if (!alive(tok)) return;
    await S.say('t:done');
    if (!alive(tok)) return;
    await wordStep(tok);
  }
  const SPK = '<svg viewBox="0 0 24 24"><path class="fill" d="M4 9.5v5h3.6L12 18.6V5.4L7.6 9.5z"/><path d="M15.4 8.6a4.6 4.6 0 0 1 0 6.8M17.9 6.2a8 8 0 0 1 0 11.6"/></svg>';
  const MIC = '<svg viewBox="0 0 24 24"><rect class="fill" x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/></svg>';
  // JUMP (phonics-kit README "공통 규칙" 2): the jumping child of Phonics Match's button, in purple here — the word bar
  // already has an orange speaker and a green mic ("모양이 같으면 안돼"; a game may pick its own JUMP colour)
  const JUMP = '<svg viewBox="0 0 24 24"><g transform="translate(12 12.2) scale(1.12) translate(-12 -12)"><circle cx="15.4" cy="4.1" r="2.45" />'
    + '<path d="M14.1 7.1 11.2 12" /><path d="M13.6 8.3 18.3 6.2" /><path d="M13.6 8.3 9.3 6.5" /><path d="M11.2 12 14.8 13.5 13 16.5" />'
    + '<path d="M11.2 12 8 14.3 5 12.9" /><path d="M7.8 20.9h9.8" /></g></svg>';
  const canSpeak = () => Q.has('fake') || (Mic.state === 'on' && (PhonicsAPI.usable() || STT.state !== 'error'));
  /** the word with its m in pink, "/m/ /m/ word" from the pack, then the child says it, then Next */
  async function wordStep(tok) {
    const w = G.word.w;
    E.word.innerHTML = `<div class="word"><b>${w[0]}</b>${w.slice(1)}</div><button class="snd" aria-label="Listen: ${w}">${SPK}</button>`
      + (canSpeak() ? `<button class="mic idle" aria-label="Say it">${MIC}</button><button class="jump" aria-label="Jump">${JUMP}</button>` : '');
    G.jumped = false;
    E.word.querySelector('.snd').addEventListener('click', (e) => { e.stopPropagation(); if (!G.listening) chant(w); });
    const mic = E.word.querySelector('.mic');
    const jb = E.word.querySelector('.jump');
    if (jb) jb.addEventListener('click', (e) => { e.stopPropagation(); jumpWord(tok); });
    if (mic) mic.addEventListener('click', (e) => { e.stopPropagation(); if (!G.listening && !mic.classList.contains('ok')) speak(tok, mic, true); });
    restartAnim(E.word, 'show');
    await wait(450);
    if (!alive(tok)) return;
    await chant(w);
    if (!alive(tok)) return;
    if (mic) await speak(tok, mic, false);              // no microphone: no word star (phonics-kit rule 5 — the star is for saying it)
    if (!alive(tok) || G.jumped) return;
    restartAnim(E.next, 'show');
    later(2600, () => { if (alive(tok) && E.next.classList.contains('show') && !G.listening) pointAt(E.next); });
  }
  /** "Now you say it!" → up to two tries; never blocks the game. again = the child tapped the mic to try once more */
  async function speak(tok, mic, again) {
    const w = G.word.w;
    G.listening = true; hideHand();
    try {
      if (!again) { await S.say('t:sayit'); if (!alive(tok)) return; }
      for (let t = 0; t < (again ? 1 : 2); t++) {
        const v = await listenOnce(tok, mic, w, t);
        if (!alive(tok) || G.jumped) return;
        if (v === 'ok') {
          mic.className = 'mic ok'; tutor('cheer');
          S.sfx('win');
          const r = mic.getBoundingClientRect();
          candyBurst(r.left + r.width / 2, r.top + r.height / 2, 0.7);
          earnStar(2);                                      // ★ the word said right
          await S.say('t:great' + (1 + ((Math.random() * 3) | 0)));
          return;
        }
        if (v === null) { mic.remove(); E.word.querySelector('.jump')?.remove(); return; }   // can't judge: no word star (kit rule 5)
        mic.className = 'mic idle';
        if (v === 'silence' && !G.jumpTold) { G.jumpTold = true; await jumpGuide(); if (!alive(tok) || G.jumped) return; }
        if (t === 0 && !again) {                            // once more, with the model again
          await S.say(v === 'silence' ? 't:sayit' : 't:again');
          if (!alive(tok)) return;
          await chant(w);
          if (!alive(tok)) return;
        }
      }
      await S.say('t:goodtry');                            // the mic stays: a tap tries again
    } finally { G.listening = false; S.setListening(false); }
  }
  /** one listen: 'ok' | 'wrong' | 'unclear' | 'silence' | null (no recogniser) */
  async function listenOnce(tok, mic, w, t) {
    mic.className = 'mic listen'; S.sfx('listen'); S.setListening(true);
    if (Q.has('fake')) { await wait(700); mic.className = 'mic think'; await wait(300); S.setListening(false); return fake.length ? fake.shift() : 'ok'; }
    const r = await Mic.listen({ waitMs: t ? 5000 : 4500, onLevel: v => mic.style.setProperty('--lv', v.toFixed(2)), aborted: () => !alive(tok) || G.jumped });
    S.setListening(false);
    if (!alive(tok) || r.kind === 'aborted') return 'unclear';
    if (r.kind === 'nomic') return null;
    if (r.kind === 'silence') return 'silence';
    mic.className = 'mic think';
    const pcm = await Mic.prepare(r.pcm, r.sr);
    const v = await judgeSpeech(pcm, w);
    if (Q.has('log')) console.log('heard', v, STT.last);
    return v;
  }
  /** the company phonics-api first (key on this device), the on-device whisper as backup — Eye Catch's rule */
  async function judgeSpeech(pcm16k, target) {
    const rv = WORDS.map(x => x.w).filter(x => x !== target);
    const dev = STT.judge(pcm16k, target, rv);
    if (window.PhonicsAPI && PhonicsAPI.usable()) {
      const r = await PhonicsAPI.analyze(PhonicsAPI.encodeWav(pcm16k, 16000), target);
      if (r.ok) {
        const j = PhonicsAPI.judge(r.data, target, rv, PH);
        STT.last = { by: 'phonics-api', target, ms: r.ms, verdict: j.verdict, heard: j.heard };
        if (j.verdict === 'ok') return 'ok';
        // the server heard another word: wrong only when the on-device recogniser hears another word too
        if (j.verdict === 'wrong') { const d = await dev; return d === 'ok' ? 'ok' : d === 'wrong' ? 'wrong' : 'unclear'; }
        // nearest to the target among the pack words, up to 1.3 sounds off per sound (Eye Catch's looser rule)
        const dt = j.d[target], dr = Math.min(...rv.filter(x => j.d[x] != null).map(x => j.d[x]), Infinity);
        if (j.heard && dt != null && j.rel <= 1.3 && dr - dt > 0) return 'ok';
        const d = await dev;
        return d === 'ok' ? 'ok' : 'unclear';
      }
      if (Q.has('log')) console.log('phonics-api failed -> on-device', r.reason, r.status || '');
    }
    return dev;
  }
  async function chant(w) {
    const word = E.word.querySelector('.word'), m = word && word.querySelector('b');
    const hop = el => el && restartAnim(el, 'say');
    S.stopVoice();
    // the letter hops on each /m/, the word on the word
    hop(m); setTimeout(() => hop(m), 520); setTimeout(() => hop(word), 1050);
    await S.chant(w);
  }
  function pointAt(el) {
    const sr = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
    E.hand.getAnimations().forEach(x => x.cancel());
    const k = u();
    E.hand.style.left = r.left + r.width * .55 - sr.left - 3.42 * k + 'px'; E.hand.style.top = r.top + r.height * .55 - sr.top - 0.24 * k + 'px';
    E.hand.classList.add('show', 'press');
  }
  function nextPicture() {
    S.sfx('tap'); hideHand(); S.stopVoice();
    E.next.classList.remove('show'); E.word.classList.remove('show'); picStarsEl.classList.remove('show');
    G.idx++;
    if (G.idx >= PER || G.level * PER + G.idx >= G.order.length) levelClear();
    else startPuzzle();
  }
  E.next.addEventListener('click', () => { if (E.next.classList.contains('show')) nextPicture(); });
  /** JUMP: skip saying this word — no word star — and go straight on to the next picture */
  function jumpWord(tok) {
    if (G.jumped || !alive(tok)) return;
    G.jumped = true; G.jumps = (G.jumps || 0) + 1;
    S.setListening(false);
    nextPicture();
  }
  /** once a level, on the first quiet try: the hand taps JUMP twice (it hops) while the tutor says what it does */
  async function jumpGuide() {
    const jb = E.word.querySelector('.jump');
    if (!jb) return;
    pointAt(jb);
    const hop = () => { jb.classList.remove('poke'); void jb.offsetWidth; jb.classList.add('poke'); };
    later(700, hop); later(1250, hop);
    await Promise.all([S.has && S.has('t:jump') ? S.say('t:jump') : wait(0), wait(2000)]);
    hideHand();
  }

  // ── level clear / all clear ─────────────────────────────────────────────────────────────────────────────
  function levelClear() {
    G.tok++; G.busy = true; clearTimers();
    const last = G.level >= LEVELS.length - 1;
    candyText(E.clearTitle, last ? 'ALL CLEAR!' : `LEVEL ${G.level + 1} CLEAR!`);
    const tilt = [-3, 2, -2, 3, -2, 2], words = G.order.slice(G.level * PER, G.level * PER + PER);
    const mini = n => `<span class="mini-stars">${[0, 1, 2].map(i => `<i class="${i < n ? '' : 'off'}"></i>`).join('')}</span>`;
    E.clearPics.innerHTML = words.map((w, i) => `<figure><img src="${w.img}" alt="${w.w}" style="--d:${(0.35 + i * 0.08).toFixed(2)}s;--r:${tilt[i % 6]}deg">${mini(G.levelStars[w.w] || 0)}</figure>`).join('');
    // the big stars: how the level went (of 3 x 6 = 18 stars: 16+ = 3, 10+ = 2, else 1)
    const got = words.reduce((s, w) => s + (G.levelStars[w.w] || 0), 0), big = got >= 16 ? 3 : got >= 10 ? 2 : 1;
    if (PP) PP.played(GAME_ID, { level: G.level + 1, stars: got, levelStars: big, pictures: words.length, jumps: G.jumps || 0 }, { higher: ['levelStars'] });
    if (PP && !last) PP.setLevel(GAME_ID, G.level + 2);   // cleared: next time the title continues from the next level
    document.querySelectorAll('.clear-stars i').forEach((st, i) => st.classList.toggle('off', i >= big));
    E.goTxt.textContent = last ? 'Play again' : 'Next';
    E.go.setAttribute('aria-label', last ? 'Play again' : 'Next level');
    restartAnim(E.clear, 'show');
    S.sfx('fanfare'); FX.confetti(160);
    // each star lands with a sparkle
    [.25, .45, .65].forEach((d, i) => setTimeout(() => {
      const st = document.querySelectorAll('.clear-stars i')[i]; if (!st || st.classList.contains('off') || !E.clear.classList.contains('show')) return;
      const r = st.getBoundingClientRect(); FX.sparkles(r.left + r.width / 2, r.top + r.height / 2, 12, 120, u() / 9); S.sfx('sparkle');
    }, (d + .3) * 1000));
    setTimeout(() => S.say(last ? 't:allclear' : 't:level'), 700);
  }
  E.go.addEventListener('click', () => {
    S.sfx('tap');
    E.clear.classList.remove('show');
    if (G.level >= LEVELS.length - 1) { newGame(); G.level = 0; }
    else { G.level++; G.idx = 0; }
    startPuzzle();
  });
  $('#btnHome').addEventListener('click', () => { S.sfx('tap'); showTitle(); });
  // ── MY STICKERS (title): all the m-words, finished ones as stickers (gold edge with 3 stars); tap = hear the word ──
  layoutLights($('#bookLights'), 104, 84, 17, 13);
  function openBook() {
    S.unlock(); S.sfx('tap');
    candyText($('#bookTitle'), 'MY STICKERS'); showBookCount();
    const tilt = [-3, 2, -2, 3, -1, 2, 2, -3, 1, -2, 3, -1, -2, 3, -3, 1, 2, -2];
    $('#bookGrid').innerHTML = WORDS.map((x, i) => {
      const n = stickers[x.w] || 0, name = `<span class="name"><b>${x.w[0]}</b>${x.w.slice(1)}</span>`;
      if (!n) return `<div class="sticker empty"><div class="slot">?</div><span class="name">?</span></div>`;
      return `<button class="sticker${n >= 3 ? ' gold' : ''}" data-w="${x.w}" style="--r:${tilt[i % 18]}deg"><img class="pic" src="${x.img}" alt="${x.w}" draggable="false">`
        + `<span class="mini-stars">${[0, 1, 2].map(j => `<i class="${j < n ? '' : 'off'}"></i>`).join('')}</span>${name}</button>`;
    }).join('');
    $('#bookGrid').querySelectorAll('button.sticker').forEach(b => b.addEventListener('click', () => { restartAnim(b, 'bump'); S.stopVoice(); S.chant(b.dataset.w); }));
    restartAnim($('#book'), 'show');
  }
  $('#btnBook').addEventListener('click', openBook);
  $('#btnBookClose').addEventListener('click', () => { S.sfx('tap'); S.stopVoice(); $('#book').classList.remove('show'); });
  showBookCount();

  // ── my sticker wall (title): stickers from MY STICKERS stuck anywhere on the title and decorated freely (user: "스티커를
  // 모은건 화면에 붙일수 있게 해주면 안돼? … 자유롭게 꾸밀수 있게"). Decorate (in the book) opens the tray along the bottom:
  // tap a sticker = it lands on the screen, or drag it where you like; on the screen drag = move, the corner knob = turn and
  // size, × or dragging it back onto the tray = peel off, tap = hear the word. A sticker can go up any number of times.
  // Kept on the device (ppDecor: word, x / y in stage u, size, turn; array order = stacking). ───────────────────────────
  const decorEl = $('#decor'), decorTray = $('#decorTray'), decorList = $('#decorList');
  const MAX_DECALS = 40, SW = 177.78;
  let decals = [];
  try { decals = (JSON.parse(localStorage.getItem('ppDecor') || '[]') || []).filter(d => d && WORDS.some(x => x.w === d.w)); } catch (e) { decals = []; }
  const saveDecor = () => { try { localStorage.setItem('ppDecor', JSON.stringify(decals.map(({ w, x, y, s, r }) => ({ w, x, y, s, r })))); } catch (e) { /* storage off */ } };
  const decorating = () => app.classList.contains('decor');
  const wordOf = w => WORDS.find(x => x.w === w);
  const toStage = (cx, cy) => { const r = stage.getBoundingClientRect(), k = r.width / SW; return [(cx - r.left) / k, (cy - r.top) / k]; };
  const clampPos = d => { d.x = Math.min(SW - 3, Math.max(3, d.x)); d.y = Math.min(97, Math.max(3, d.y)); };
  const ICO_X = '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7 7 17"/></svg>';
  const ICO_TURN = '<svg viewBox="0 0 24 24"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.8 4.2v4.6h-4.6"/></svg>';
  function paintDecal(d) {
    const el = d.el; el.style.left = `calc(${d.x.toFixed(2)} * var(--u))`; el.style.top = `calc(${d.y.toFixed(2)} * var(--u))`;
    el.style.setProperty('--s', d.s.toFixed(3)); el.style.setProperty('--r', d.r.toFixed(1) + 'deg');
  }
  function makeDecal(d) {
    const x = wordOf(d.w), el = document.createElement('div');
    el.className = 'decal' + ((stickers[d.w] || 0) >= 3 ? ' gold' : '');
    el.innerHTML = `<img src="${x.img}" alt="${x.w}" draggable="false"><button class="h h-x" aria-label="Peel off">${ICO_X}</button><button class="h h-turn" aria-label="Turn and size">${ICO_TURN}</button>`;
    d.el = el; el._d = d; paintDecal(d); decorEl.appendChild(el);
    return el;
  }
  decals.forEach(makeDecal);
  let selD = null;
  function select(d) { if (selD && selD.el) selD.el.classList.remove('sel'); selD = d; if (d) d.el.classList.add('sel'); }
  function toFront(d) { const i = decals.indexOf(d); if (i >= 0 && i < decals.length - 1) { decals.splice(i, 1); decals.push(d); decorEl.appendChild(d.el); } }
  function peel(d) {
    const i = decals.indexOf(d); if (i < 0) return;
    decals.splice(i, 1); if (selD === d) selD = null;
    d.el.classList.add('peel'); S.sfx('fly'); setTimeout(() => d.el.remove(), 260); saveDecor();
  }
  function stickFx(d) {
    restartAnim(d.el, 'stick'); S.sfx('snap');
    const r = d.el.getBoundingClientRect(); FX.sparkles(r.left + r.width / 2, r.top + r.height / 2, 10, 90, u() / 9);
  }
  const overTray = (cx, cy) => { const r = decorTray.getBoundingClientRect(); return cx > r.left && cx < r.right && cy > r.top && cy < r.bottom; };
  function buildDecorTray() {
    const tilt = [-4, 3, -2, 4, -3, 2, 3, -4, 2, -3, 4, -2, -3, 4, -4, 2, 3, -3];
    decorList.innerHTML = WORDS.map((x, i) => {
      const n = stickers[x.w] || 0; if (!n) return '';
      return `<button class="dsticker${n >= 3 ? ' gold' : ''}" data-w="${x.w}" style="--r:${tilt[i % 18]}deg" aria-label="${x.w}"><img src="${x.img}" alt="" draggable="false"></button>`;
    }).join('');
  }
  function openDecor() {
    if (!WORDS.some(x => stickers[x.w] > 0)) return;
    S.sfx('tap'); S.stopVoice(); $('#book').classList.remove('show');
    buildDecorTray(); select(null); app.classList.add('decor');
    E.titleHand.classList.add('leave');
  }
  function closeDecor() {
    S.sfx('tap'); select(null); app.classList.remove('decor'); decorTray.classList.remove('drop');
    E.titleHand.classList.remove('leave'); restartAnim(E.start, 'in'); restartAnim(E.sys, 'pop'); restartAnim($('.sys-left'), 'pop');
  }
  $('#btnDecor').addEventListener('click', openDecor);
  $('#btnDecorDone').addEventListener('click', closeDecor);

  // one finger at a time: move a sticker on the screen, turn / size it by its knob, or pull a new one out of the tray
  let DG = null;
  stage.addEventListener('pointerdown', (e) => {
    if (!decorating() || DG) return;
    const knob = e.target.closest('.h'), del = e.target.closest('.decal'), ts = e.target.closest('.dsticker');
    if (knob && del) {
      e.preventDefault(); const d = del._d;
      if (knob.classList.contains('h-x')) return peel(d);
      const r = del.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      DG = { kind: 'turn', id: e.pointerId, d, cx, cy, a0: Math.atan2(e.clientY - cy, e.clientX - cx), l0: Math.hypot(e.clientX - cx, e.clientY - cy) || 1, r0: d.r, s0: d.s };
      return;
    }
    if (del) {
      e.preventDefault(); const d = del._d, [px, py] = toStage(e.clientX, e.clientY);
      select(d); toFront(d); del.classList.add('drag');
      DG = { kind: 'move', id: e.pointerId, d, ox: d.x - px, oy: d.y - py, sx: e.clientX, sy: e.clientY, moved: false };
      return;
    }
    if (ts) {
      e.preventDefault();
      DG = { kind: 'new', id: e.pointerId, w: ts.dataset.w, btn: ts, sx: e.clientX, sy: e.clientY, moved: false, d: null };
      return;
    }
    if (!e.target.closest('.decor-tray')) select(null);   // a tap on the empty screen lets go of the chosen sticker
  });
  addEventListener('pointermove', (e) => {
    if (!DG || e.pointerId !== DG.id) return;
    if (DG.kind === 'turn') {
      const d = DG.d, a = Math.atan2(e.clientY - DG.cy, e.clientX - DG.cx), l = Math.hypot(e.clientX - DG.cx, e.clientY - DG.cy);
      d.r = DG.r0 + (a - DG.a0) * 180 / Math.PI; d.s = Math.min(2.4, Math.max(0.5, DG.s0 * l / DG.l0)); paintDecal(d);
      return;
    }
    if (!DG.moved && Math.hypot(e.clientX - DG.sx, e.clientY - DG.sy) < 8) return;
    DG.moved = true;
    if (DG.kind === 'new' && !DG.d) {             // out of the tray: the sticker comes up under the finger
      if (decals.length >= MAX_DECALS) { restartAnim(DG.btn, 'nope'); S.sfx('boing'); DG = null; return; }
      const [px, py] = toStage(e.clientX, e.clientY);
      const d = { w: DG.w, x: px, y: py, s: 1, r: (Math.random() * 16 - 8) }; decals.push(d); makeDecal(d);
      select(d); d.el.classList.add('drag'); DG.d = d; DG.ox = 0; DG.oy = 0; S.sfx('pick');
    }
    const d = DG.d, [px, py] = toStage(e.clientX, e.clientY);
    d.x = px + DG.ox; d.y = py + DG.oy; paintDecal(d);
    decorTray.classList.toggle('drop', overTray(e.clientX, e.clientY));
  });
  function endDecorDrag(e, cancel) {
    if (!DG || e.pointerId !== DG.id) return;
    const g = DG; DG = null; decorTray.classList.remove('drop');
    if (g.kind === 'turn') { saveDecor(); return; }
    if (g.kind === 'new' && !g.d) {               // a tap on a tray sticker: it lands somewhere on the screen
      if (cancel) return;
      if (decals.length >= MAX_DECALS) { restartAnim(g.btn, 'nope'); S.sfx('boing'); return; }
      const d = { w: g.w, x: 26 + Math.random() * (SW - 52), y: 22 + Math.random() * 44, s: 1, r: Math.random() * 20 - 10 };
      decals.push(d); makeDecal(d); select(d); stickFx(d); saveDecor(); S.chant(d.w);
      return;
    }
    const d = g.d; d.el.classList.remove('drag');
    if (!cancel && g.moved && overTray(e.clientX, e.clientY)) return peel(d);   // dragged back onto the tray = peeled off
    if (!g.moved && g.kind === 'move') { restartAnim(d.el, 'bump'); S.stopVoice(); S.chant(d.w); return; }   // tap = hear it
    clampPos(d); paintDecal(d); stickFx(d); saveDecor();
  }
  addEventListener('pointerup', e => endDecorDrag(e, false));
  addEventListener('pointercancel', e => endDecorDrag(e, true));

  // ── HUD ─────────────────────────────────────────────────────────────────────────────────────────────────
  const btnSound = $('#btnSound');
  function paintSound() { app.classList.toggle('muted', S.muted); btnSound.setAttribute('aria-pressed', String(!S.muted)); }
  btnSound.addEventListener('click', () => { S.unlock(); S.setMuted(!S.muted); paintSound(); if (!S.muted) S.sfx('tap'); });
  paintSound();
  const btnLang = $('#btnLang');
  function paintLang() { btnLang.dataset.l = S.lang; btnLang.querySelectorAll('.flag').forEach(f => f.classList.toggle('on', f.dataset.l === S.lang)); btnLang.setAttribute('aria-pressed', String(S.lang === 'ko')); }
  btnLang.addEventListener('click', () => { S.unlock(); S.setLang(S.lang === 'ko' ? 'en' : 'ko'); paintLang(); S.sfx('tap'); });
  paintLang();
  $('#btnExit').addEventListener('click', () => {
    S.sfx('tap');
    if (G.screen === 'game') return showTitle();
    if (history.length > 1) history.back(); else { window.close(); setTimeout(() => location.reload(), 150); }
  });
  document.addEventListener('pointerdown', () => S.unlock(), { once: true });
  // phonics-api key: entered once per device (kit dialog); the dot shows who judges the words
  const keyBtn = $('#btnKey');
  const showApi = () => { keyBtn.dataset.api = PhonicsAPI.status(); };
  addEventListener('phonicsapi:status', showApi);
  keyBtn.addEventListener('click', async () => { S.unlock(); S.sfx('tap'); await PhonicsAPI.keyDialog(); showApi(); });
  PhonicsAPI.init().then(showApi);

  // ── QA hooks ────────────────────────────────────────────────────────────────────────────────────────────
  /** put the top tray piece (or piece i) in place through the real drag path */
  function solveOne(i) {
    if (G.busy || G.drag) return false;
    const p = i != null ? G.pieces[i] : G.pieces[+((liveSlots()[0] || {}).dataset || {}).i];
    if (!p || p.placed) return false;
    const r = p.cv.getBoundingClientRect();
    beginDrag(p, r.left + r.width / 2, r.top + r.height / 2, -1);
    const cu = G.cut, br = E.board.getBoundingClientRect(), bs = br.width / IW, d = G.drag;
    const x = br.left + (p.c * cu.cw + cu.cw / 2) * bs, y = br.top + (p.r * cu.ch + cu.ch / 2) * bs;
    // the grab point's offset from the piece middle
    moveDrag(x + (d.fx - .5) * d.pw, y + (d.fy - .5) * d.ph);
    endDrag(x, y);
    return true;
  }
  window.__pp = { G, E, startGame, showTitle, startPuzzle, solveOne, beginDrag, moveDrag, endDrag, levelClear, fake, judgeSpeech, setFace, openBook, earnStar, openDecor, closeDecor, decals: () => decals };
  showTitle();
  window.__ready = true;
})();
