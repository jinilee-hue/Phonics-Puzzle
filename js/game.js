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
    clear: $('#clear'), clearTitle: $('#clearTitle'), clearPics: $('#clearPics'), clearScore: $('#clearScore'), go: $('#btnGo'), goTxt: $('#goTxt'),
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
  function loadImg(w) {
    if (!IMG[w.w]) IMG[w.w] = new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = w.img; });
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
  /** big candy letters: a white outer line, a dark edge and a gradient fill, stacked */
  function candyText(el, t) { el.innerHTML = `<span class="w">${t}</span><span class="o">${t}</span><span class="f">${t}</span>`; }
  // score / level written on the sheet's blank ribbons: an outline layer under a gradient-filled one
  function setRib(el, t, bump) {
    t = String(t);
    if (el.dataset.t !== t || !el.firstChild || el.firstChild.nodeType === 3) { el.dataset.t = t; el.innerHTML = `<span class="o">${t}</span><span class="f">${t}</span>`; }
    if (bump) restartAnim(el, 'bump');
  }
  [E.score, E.clearScore].forEach(el => { el.classList.add('rib-txt'); setRib(el, el.textContent); });
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
    E.drag.innerHTML = ''; E.bursts.innerHTML = '';
    E.logoWrap.classList.remove('float', 'leave'); E.stars.classList.remove('leave'); E.bubbles.classList.remove('leave'); E.titleHand.classList.remove('leave');
    restartAnim(E.logoWrap, 'drop');
    setTimeout(() => { if (G.screen === 'title') E.logoWrap.classList.add('float'); }, 1150);
    E.start.classList.remove('hit'); E.start.style.opacity = ''; restartAnim(E.start, 'in');
    restartAnim(E.sys, 'pop');
    clearInterval(ambient);
    ambient = setInterval(titleSparkle, 140);
    const tok = G.tok;
    later(7000, () => { if (alive(tok) && G.screen === 'title') S.say('t:pressstart'); });
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
  E.start.addEventListener('click', () => { if (G.screen === 'title' && !starting) startGame(); });
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
    G.level = Math.min(LEVELS.length - 1, Math.max(0, (+Q.get('level') || 1) - 1)); G.idx = 0; G.score = 0; G.taught = false;
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
    await S.say('t:hello');
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
    clearTimers(); endDragSilently(); S.stopVoice(); S.resetSnap();
    G.busy = true;
    resetBoard();
    E.drag.innerHTML = '';
    const cfg = LEVELS[G.level], word = G.order[G.level * PER + G.idx];
    G.word = word;
    showLevel();
    const img = await loadImg(word);
    if (!alive(tok)) return;
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
    G.busy = false; G.oops = false;
    if (!G.taught) { G.taught = true; S.say('t:howto'); }
    armHint();
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
      addScore(100, cx, cy);
      if (G.left === 0) complete(tok); else armHint();
    }, 210);
  }
  function updateTrayAfterRemoval() {
    // the dots and buttons change at once; the window keeps its place unless it ran past the end
    const n = liveSlots().length, max = Math.max(0, n - 3);
    if (G.top > max) G.top = max;
    updateTray();
  }
  function addScore(n, x, y) {
    G.score += n;
    setRib(E.score, G.score, true);
    const t = document.createElement('b');
    t.className = 'plus'; t.textContent = '+' + n; t.style.left = x + 'px'; t.style.top = y + 'px';
    E.bursts.appendChild(t);
    setTimeout(() => t.remove(), 1050);
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
    showHint(p, 3400);
    S.say('t:hint'); tutor('lean');
    { const hb = E.board.getBoundingClientRect(), hs = hb.width / IW, hcu = G.cut; lookAt(hb.left + (p.c * hcu.cw + hcu.cw / 2) * hs, hb.top + (p.r * hcu.ch + hcu.ch / 2) * hs, 3000); }
    // the hand glides from the piece to its place, twice
    const sr = stage.getBoundingClientRect(), k = u(), cr = p.cv.getBoundingClientRect(), br = E.board.getBoundingClientRect(), bs = br.width / IW, cu = G.cut;
    const a = [cr.left + cr.width * .5 - sr.left, cr.top + cr.height * .5 - sr.top];
    const b = [br.left + (p.c * cu.cw + cu.cw / 2) * bs - sr.left, br.top + (p.r * cu.ch + cu.ch / 2) * bs - sr.top];
    const off = [-3.42 * k, -0.24 * k];    // the common white hand's fingertip: 38 % across, 2 % down of its 9 x 12 u
    E.hand.classList.add('show'); E.hand.classList.remove('press');
    E.hand.getAnimations().forEach(x => x.cancel());
    E.hand.animate([
      { left: a[0] + off[0] + 'px', top: a[1] + off[1] + 'px', opacity: 0, offset: 0 },
      { left: a[0] + off[0] + 'px', top: a[1] + off[1] + 'px', opacity: 1, offset: .15 },
      { left: b[0] + off[0] + 'px', top: b[1] + off[1] + 'px', opacity: 1, offset: .75 },
      { left: b[0] + off[0] + 'px', top: b[1] + off[1] + 'px', opacity: 0, offset: 1 },
    ], { duration: 1600, iterations: 2, easing: 'ease-in-out', fill: 'forwards' }).onfinish = () => { E.hand.classList.remove('show'); armHint(); };
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
    addScore(200, br.left + br.width / 2, br.top + br.height * .4);
    await wait(500);
    if (!alive(tok)) return;
    await S.say('t:done');
    if (!alive(tok)) return;
    await wordStep(tok);
  }
  const SPK = '<svg viewBox="0 0 24 24"><path class="fill" d="M4 9.5v5h3.6L12 18.6V5.4L7.6 9.5z"/><path d="M15.4 8.6a4.6 4.6 0 0 1 0 6.8M17.9 6.2a8 8 0 0 1 0 11.6"/></svg>';
  const MIC = '<svg viewBox="0 0 24 24"><rect class="fill" x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/></svg>';
  const canSpeak = () => Q.has('fake') || (Mic.state === 'on' && (PhonicsAPI.usable() || STT.state !== 'error'));
  /** the word with its m in pink, "/m/ /m/ word" from the pack, then the child says it, then Next */
  async function wordStep(tok) {
    const w = G.word.w;
    E.word.innerHTML = `<div class="word"><b>${w[0]}</b>${w.slice(1)}</div><button class="snd" aria-label="Listen: ${w}">${SPK}</button>`
      + (canSpeak() ? `<button class="mic idle" aria-label="Say it">${MIC}</button>` : '');
    E.word.querySelector('.snd').addEventListener('click', (e) => { e.stopPropagation(); if (!G.listening) chant(w); });
    const mic = E.word.querySelector('.mic');
    if (mic) mic.addEventListener('click', (e) => { e.stopPropagation(); if (!G.listening && !mic.classList.contains('ok')) speak(tok, mic, true); });
    restartAnim(E.word, 'show');
    await wait(450);
    if (!alive(tok)) return;
    await chant(w);
    if (!alive(tok)) return;
    if (mic) await speak(tok, mic, false);
    if (!alive(tok)) return;
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
        if (!alive(tok)) return;
        if (v === 'ok') {
          mic.className = 'mic ok'; tutor('cheer');
          S.sfx('win');
          const r = mic.getBoundingClientRect();
          candyBurst(r.left + r.width / 2, r.top + r.height / 2, 0.7);
          addScore(300, r.left + r.width / 2, r.top - 2 * u());
          await S.say('t:great' + (1 + ((Math.random() * 3) | 0)));
          return;
        }
        if (v === null) { mic.remove(); return; }           // no recogniser at all: Next only
        mic.className = 'mic idle';
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
    const r = await Mic.listen({ waitMs: t ? 5000 : 4500, onLevel: v => mic.style.setProperty('--lv', v.toFixed(2)), aborted: () => !alive(tok) });
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
  E.next.addEventListener('click', () => {
    if (!E.next.classList.contains('show')) return;
    S.sfx('tap'); hideHand(); S.stopVoice();
    E.next.classList.remove('show'); E.word.classList.remove('show');
    G.idx++;
    if (G.idx >= PER || G.level * PER + G.idx >= G.order.length) levelClear();
    else startPuzzle();
  });

  // ── level clear / all clear ─────────────────────────────────────────────────────────────────────────────
  function levelClear() {
    G.tok++; G.busy = true; clearTimers();
    const last = G.level >= LEVELS.length - 1;
    candyText(E.clearTitle, last ? 'ALL CLEAR!' : `LEVEL ${G.level + 1} CLEAR!`);
    const tilt = [-3, 2, -2, 3, -2, 2];
    E.clearPics.innerHTML = G.order.slice(G.level * PER, G.level * PER + PER).map((w, i) => `<img src="${w.img}" alt="${w.w}" style="--d:${(0.35 + i * 0.08).toFixed(2)}s;--r:${tilt[i % 6]}deg">`).join('');
    setRib(E.clearScore, G.score);
    E.goTxt.textContent = last ? 'Play again' : 'Next';
    E.go.setAttribute('aria-label', last ? 'Play again' : 'Next level');
    restartAnim(E.clear, 'show');
    S.sfx('fanfare'); FX.confetti(160);
    // each star lands with a sparkle
    [.25, .45, .65].forEach((d, i) => setTimeout(() => {
      const st = document.querySelectorAll('.clear-stars i')[i]; if (!st || !E.clear.classList.contains('show')) return;
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
  window.__pp = { G, E, startGame, showTitle, startPuzzle, solveOne, beginDrag, moveDrag, endDrag, levelClear, fake, judgeSpeech, setFace };
  showTitle();
  window.__ready = true;
})();
