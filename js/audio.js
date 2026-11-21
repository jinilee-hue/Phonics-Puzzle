/* Phonics Puzzle — sound: word / letter-sound clips from the lesson pack (js/voice.js + base64 js/voice-data.js, so
 * file:// plays), synthesized effects, the background music loop (js/bgm-data.js). Tutor lines (t:/k:) come with the
 * phonics-api voice (tools/build_voice.py); A.say() on a key that is not there just resolves.
 * Keys: 'w:word', 's:m' (letter sound), 't:x' English line ('k:x' its Korean take when lang = 'ko').
 */
(function () {
  'use strict';
  const V = window.PP_VOICE || { clips: {} };
  const DATA = window.PP_VOICE_DATA || {};
  const A = { ctx: null, muted: false, lang: 'ko', talking: 0, bgmOn: false, bgmLevel: 1 };
  try { const l = localStorage.getItem('ppLang'); if (l === 'en' || l === 'ko') A.lang = l; } catch (e) { /* storage off */ }
  try { A.muted = localStorage.getItem('ppMuted') === '1'; } catch (e) { /* storage off */ }
  let master, voiceBus, sfxBus, musicBus;
  const buffers = new Map();
  let cur = null, voiceTok = 0, seqTok = 0;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  A.wait = wait;

  A.unlock = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return A.ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = A.ctx = new AC();
    master = ctx.createGain(); master.connect(ctx.destination); master.gain.value = A.muted ? 0 : 1;
    voiceBus = ctx.createGain(); voiceBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.5; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
    setTimeout(() => Object.keys(V.clips).forEach(k => decode(k)), 50);
    return ctx;
  };
  function b64(s) { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  function decode(key) {
    if (buffers.has(key)) return buffers.get(key);
    const c = V.clips[key];
    if (!c || !A.ctx) return Promise.resolve(null);
    const src = DATA[key] ? Promise.resolve(b64(DATA[key])) : fetch('assets/voice/' + c[0]).then(r => r.arrayBuffer());
    const p = src.then(ab => A.ctx.decodeAudioData(ab)).catch(() => null);
    buffers.set(key, p);
    return p;
  }
  A.resolve = key => (A.lang === 'ko' && key.startsWith('t:') && V.clips['k:' + key.slice(2)]) ? 'k:' + key.slice(2) : key;
  A.has = key => !!V.clips[A.resolve(key)];
  /** play one clip; resolves when it ends (or is stopped) */
  A.say = async function (key, opts = {}) {
    const k = A.resolve(key), c = V.clips[k];
    if (!c || !A.ctx) return;
    const tok = ++voiceTok;
    const buf = await decode(k);
    if (!buf || tok !== voiceTok) return;
    stopCur();
    const s = A.ctx.createBufferSource(); s.buffer = buf;
    const g = A.ctx.createGain(); g.gain.value = c[2] * (opts.gain || 1);
    s.connect(g); g.connect(voiceBus);
    const start = c[1], dur = Math.min(c[3], buf.duration - start);
    cur = s; talk(1);
    return new Promise(res => {
      let done = false;
      const end = () => { if (done) return; done = true; if (cur === s) cur = null; talk(-1); res(); };
      s.onended = end;
      s.start(0, start, dur);
      setTimeout(end, (dur + 0.4) * 1000);
    });
  };
  /** clips back to back (numbers = pauses in s); stops if another seq / stopVoice happens */
  A.seq = async function (keys, gap = 0.08) {
    const my = ++seqTok;
    for (const k of keys) {
      if (my !== seqTok) return false;
      if (typeof k === 'number') { await wait(k * 1000); continue; }
      await A.say(k);
      if (gap && my === seqTok) await wait(gap * 1000);
    }
    return my === seqTok;
  };
  /** "/m/ /m/ monkey" */
  A.chant = word => A.seq(['s:m', 0.12, 's:m', 0.2, 'w:' + word], 0.05);
  function stopCur() { if (cur) { try { cur.onended = null; cur.stop(); } catch (e) { /* done */ } cur = null; talk(-1); } }
  A.stopVoice = function () { voiceTok++; seqTok++; stopCur(); };
  function talk(d) { A.talking = Math.max(0, A.talking + d); duck(); }
  // while the child's word is being recorded the music goes almost silent (through the speakers it got into the mic)
  A.listening = false;
  A.setListening = function (on) { A.listening = !!on; duck(); };
  function duck() {
    if (!musicBus) return;
    const t = A.ctx.currentTime, v = A.bgmOn ? (A.listening ? 0.006 : A.talking ? 0.045 : 0.12) * A.bgmLevel : 0;
    musicBus.gain.cancelScheduledValues(t); musicBus.gain.setTargetAtTime(v, t, 0.12);
  }
  A.setMuted = function (m) {
    A.muted = m;
    try { localStorage.setItem('ppMuted', m ? '1' : '0'); } catch (e) { /* storage off */ }
    if (master) master.gain.setTargetAtTime(m ? 0 : 1, A.ctx.currentTime, 0.03);
  };
  A.setLang = function (l) { A.lang = l; try { localStorage.setItem('ppLang', l); } catch (e) { /* storage off */ } };

  // ── synthesized effects ─────────────────────────────────────────────────────────────────────────────
  function env(g, t, a, d, peak) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function tone(type, f0, f1, t, dur, peak, a = 0.005) {
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, a, dur, peak); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + a + dur + 0.05);
  }
  function noise(t, dur, peak, freq, q, type = 'bandpass') {
    const n = A.ctx.createBuffer(1, Math.ceil(A.ctx.sampleRate * dur), A.ctx.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = A.ctx.createBufferSource(); s.buffer = n;
    const f = A.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = A.ctx.createGain(); env(g, t, 0.004, dur, peak);
    s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t);
  }
  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
  let snapStep = 0;
  A.sfx = function (name) {
    if (!A.ctx) return;
    const t = A.ctx.currentTime + 0.01;
    switch (name) {
      case 'tap': tone('sine', 880, 660, t, 0.08, 0.25); break;
      case 'pick': tone('sine', 420, 760, t, 0.09, 0.22); noise(t, 0.06, 0.05, 3000, 1); break;
      // the snap climbs a scale with every piece (C major), so a puzzle "plays" as it fills
      case 'snap': {
        const sc = [72, 74, 76, 77, 79, 81, 83, 84, 86, 88], n = sc[snapStep++ % sc.length];
        tone('triangle', NOTE(n), NOTE(n), t, 0.22, 0.3); tone('sine', NOTE(n + 12), NOTE(n + 12), t + 0.04, 0.25, 0.12);
        noise(t, 0.05, 0.12, 1800, 1.2); break;
      }
      case 'boing': tone('sine', 300, 140, t, 0.25, 0.28); tone('triangle', 160, 120, t + 0.05, 0.2, 0.1); break;
      case 'whoosh': noise(t, 0.45, 0.25, 900, 0.6); break;
      case 'swirl': noise(t, 1.3, 0.16, 700, 0.5); [84, 88, 91, 96, 100, 103].forEach((n, i) => tone('sine', NOTE(n), NOTE(n), t + i * 0.09, 0.3, 0.07)); break;
      case 'start': [72, 76, 79, 84].forEach((n, i) => tone('triangle', NOTE(n), NOTE(n), t + i * 0.06, 0.2, 0.25)); break;
      case 'fly': tone('sine', 600, 1300, t, 0.14, 0.08); break;
      case 'win': [72, 76, 79, 84, 79, 84, 88].forEach((n, i) => tone('triangle', NOTE(n), NOTE(n), t + i * 0.11, i === 6 ? 0.8 : 0.2, 0.28)); noise(t + 0.6, 0.6, 0.05, 7000, 0.7, 'highpass'); break;
      case 'listen': tone('sine', NOTE(84), NOTE(84), t, 0.09, 0.2); tone('sine', NOTE(91), NOTE(91), t + 0.1, 0.12, 0.2); break;
      case 'sparkle': [96, 100, 103, 108].forEach((n, i) => tone('sine', NOTE(n), NOTE(n), t + i * 0.045, 0.16, 0.08)); break;
      case 'fanfare': [67, 72, 76, 79, 76, 79, 84].forEach((n, i) => tone('triangle', NOTE(n), NOTE(n), t + i * 0.13, i === 6 ? 1 : 0.22, 0.3)); break;
      default: break;
    }
  };
  A.resetSnap = () => { snapStep = 0; };

  // ── music (loop from js/bgm-data.js) ─────────────────────────────────────────────────────────────────
  let bgmSrc = null, bgmBuf = null;
  A.startBgm = async function () {
    A.bgmOn = true;
    if (!A.ctx || !window.PP_BGM_DATA) return;
    if (!bgmBuf) { try { bgmBuf = await A.ctx.decodeAudioData(b64(window.PP_BGM_DATA.data)); } catch (e) { return; } }
    if (!bgmSrc) {
      bgmSrc = A.ctx.createBufferSource(); bgmSrc.buffer = bgmBuf; bgmSrc.loop = true;
      if (window.PP_BGM_DATA.loop) { bgmSrc.loopStart = 0; bgmSrc.loopEnd = window.PP_BGM_DATA.loop; }
      bgmSrc.connect(musicBus); bgmSrc.start();
    }
    duck();
  };
  A.stopBgm = function () { A.bgmOn = false; duck(); };

  window.Sound = A;
})();
