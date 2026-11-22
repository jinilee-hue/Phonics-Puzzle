"""Original background music for Phonics Puzzle — upbeat (user 2026-11-22: "게임 음악 좀더 신나는 걸로"):
G major, 140 BPM, 16 bars (27.4 s). A half over G–D–Em–C, B half (the chorus) over C–D–Bm–Em / C–D–G–D.
Four-on-the-floor kick, claps (+ snare in the chorus) on 2 and 4, 16th hats with an open hat on every off-beat, an
octave-jumping bass, plucked off-beat chords, a steel-pan hook (doubled by marimba and glockenspiel in the chorus),
brassy stabs, bongo / snare fills into each half. Synth voices from Eye Catch's tools/make_bgm.py (no samples);
tune and arrangement are this game's own. Seamless loop. -> assets/audio/bgm.mp3 + js/bgm-data.js (base64)
Run: /Users/jini/.local/bin/uv run --with numpy --with scipy python tools/make_bgm.py
"""
import base64
import json
import pathlib
import subprocess
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT_MP3 = ROOT / 'assets' / 'audio' / 'bgm.mp3'
OUT_JS = ROOT / 'js' / 'bgm-data.js'
SR = 44100
BPM = 140
BEAT = 60 / BPM
BARS = 16
LOOP = BARS * 4 * BEAT
N = int(LOOP * SR) + SR * 3
rng = np.random.default_rng(7)
NOTE = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
hz = lambda midi: 440 * 2 ** ((midi - 69) / 12)


def m(s):
    return NOTE[s[:-1]] + 12 * (int(s[-1]) + 1)


CHORDS = ['G', 'D', 'Em', 'C', 'G', 'D', 'Em', ('C', 'D'),
          'C', 'D', 'Bm', 'Em', 'C', 'D', 'G', 'D']
TONES = {'G': ['G', 'B', 'D'], 'D': ['D', 'F#', 'A'], 'Em': ['E', 'G', 'B'], 'C': ['C', 'E', 'G'], 'Bm': ['B', 'D', 'F#']}
HOOK = [('D6', 0, .5), ('B5', .5, .25), ('D6', .75, .5), ('G6', 1.25, .5), ('F#6', 1.75, .25), ('E6', 2, .5), ('D6', 2.5, .5), ('B5', 3, .75)]
MEL = [
    HOOK,
    [('A5', 0, .5), ('F#5', .5, .25), ('A5', .75, .5), ('D6', 1.25, .75), ('C6', 2, .5), ('B5', 2.5, .5), ('A5', 3, .75)],
    [('B5', 0, .5), ('G5', .5, .25), ('B5', .75, .5), ('E6', 1.25, .5), ('D6', 1.75, .25), ('B5', 2, .5), ('G5', 2.5, .5), ('E5', 3, .75)],
    [('E5', 0, .5), ('G5', .5, .5), ('C6', 1, .5), ('E6', 1.5, .5), ('D6', 2, .25), ('C6', 2.25, .25), ('B5', 2.5, .5), ('A5', 3, 1)],
    HOOK,
    [('A5', 0, .5), ('F#5', .5, .25), ('A5', .75, .5), ('D6', 1.25, .5), ('E6', 1.75, .25), ('F#6', 2, .5), ('E6', 2.5, .5), ('D6', 3, .75)],
    [('B5', 0, .5), ('E6', .5, .25), ('G6', .75, .5), ('E6', 1.25, .5), ('B5', 1.75, .25), ('D6', 2, .5), ('E6', 2.5, .5), ('G6', 3, .75)],
    [('E6', 0, .5), ('D6', .5, .5), ('C6', 1, .5), ('B5', 1.5, .5), ('A5', 2, .25), ('B5', 2.25, .25), ('C6', 2.5, .25), ('D6', 2.75, .25),
     ('E6', 3, .25), ('F#6', 3.25, .25), ('G6', 3.5, .5)],
    [('G6', 0, .75), ('E6', .75, .25), ('G6', 1, .5), ('E6', 1.5, .5), ('C6', 2, .5), ('E6', 2.5, .5), ('G6', 3, .5), ('A6', 3.5, .5)],
    [('F#6', 0, .75), ('D6', .75, .25), ('F#6', 1, .5), ('A6', 1.5, .5), ('F#6', 2, .5), ('E6', 2.5, .5), ('D6', 3, 1)],
    [('D6', 0, .5), ('B5', .5, .5), ('D6', 1, .5), ('F#6', 1.5, .5), ('E6', 2, .5), ('D6', 2.5, .5), ('B5', 3, 1)],
    [('E6', 0, .5), ('G6', .5, .5), ('B6', 1, .5), ('G6', 1.5, .5), ('E6', 2, .5), ('F#6', 2.5, .5), ('G6', 3, 1)],
    [('E6', 0, .5), ('G6', .5, .25), ('A6', .75, .5), ('G6', 1.25, .5), ('E6', 1.75, .25), ('C6', 2, .5), ('E6', 2.5, .5), ('G6', 3, 1)],
    [('F#6', 0, .5), ('A6', .5, .25), ('F#6', .75, .5), ('D6', 1.25, .75), ('E6', 2, .5), ('F#6', 2.5, .5), ('A6', 3, 1)],
    [('B6', 0, .75), ('A6', .75, .25), ('G6', 1, .5), ('D6', 1.5, .5), ('B5', 2, .5), ('D6', 2.5, .5), ('G6', 3, 1)],
    [('A5', 0, .25), ('B5', .25, .25), ('C6', .5, .25), ('D6', .75, .25), ('E6', 1, .25), ('F#6', 1.25, .25), ('G6', 1.5, .5), ('F#6', 2, .5), ('D6', 2.5, .5)],
]
assert len(MEL) == BARS == len(CHORDS)

L = np.zeros(N); R = np.zeros(N)


def add(sig, t, pan=0.0, gain=1.0):
    i = int(round(t * SR))
    if i >= N:
        return
    j = min(N, i + len(sig))
    s = sig[:j - i] * gain
    L[i:j] += s * np.sqrt(0.5 * (1 - pan)); R[i:j] += s * np.sqrt(0.5 * (1 + pan))


def tt(dur):
    return np.arange(int(dur * SR)) / SR


def steelpan(f, dur):
    """steel drum: a strong octave partial, a twelfth that dies fast, a slightly detuned double for the shimmer"""
    t = tt(max(dur, .3) + .8)
    tau = .55 * (523 / f) ** .35
    env = np.minimum(1, t / .003) * np.exp(-t / tau)
    s = (np.sin(2 * np.pi * f * t) + .55 * np.sin(2 * np.pi * 2.005 * f * t + .4) * np.exp(-t / (tau * .6))
         + .22 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t / .12) + .12 * np.sin(2 * np.pi * 5.2 * f * t) * np.exp(-t / .03)
         + .35 * np.sin(2 * np.pi * f * 1.004 * t + 1.3))
    return s * env / 1.6


def marimba(f, dur):
    t = tt(max(dur, .25) + .9)
    env = np.minimum(1, t / .002) * np.exp(-t / (.32 * (523 / f) ** .3))
    return (np.sin(2 * np.pi * f * t) + .28 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / .05)) * env


def glock(f):
    t = tt(1.4)
    env = np.minimum(1, t / .001) * np.exp(-t / .5)
    return (np.sin(2 * np.pi * f * t) + .35 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / .12) + .2 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t / .05)) * env


def pluck(f, dur=.22):
    """ukulele-ish chop: bright harmonics that die out faster the higher they are"""
    t = tt(dur + .2)
    s = np.zeros_like(t)
    for k in range(1, 9):
        s += (1 / k) * np.sin(2 * np.pi * k * f * t + rng.random()) * np.exp(-t * (9 + 6 * k))
    return s * np.minimum(1, t / .002)


def bass(f, dur):
    """punchy synth bass: a saw whose upper harmonics close quickly (filter-envelope feel)"""
    t = tt(dur + .05)
    s = np.zeros_like(t)
    for k in range(1, 10):
        s += ((-1) ** (k + 1) / k) * np.sin(2 * np.pi * k * f * t) * np.exp(-t * (3 + 10 * (k - 1)))
    env = np.minimum(1, t / .004) * np.where(t < dur, 1, np.exp(-(t - dur) / .02))
    return s * env


def kick():
    t = tt(.3)
    f = 48 + 120 * np.exp(-t / .03)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-t / .14) + .25 * np.exp(-t / .004) * rng.standard_normal(len(t)) * .3) * np.minimum(1, t / .001)


BP_CLAP = butter(2, [900, 2600], btype='band', fs=SR, output='sos')
HP_HAT = butter(2, 7000, btype='high', fs=SR, output='sos')
BP_SN = butter(2, [1500, 6000], btype='band', fs=SR, output='sos')
HP_CR = butter(2, 4500, btype='high', fs=SR, output='sos')


def clap():
    t = tt(.26)
    n = rng.standard_normal(len(t))
    env = np.zeros_like(t)
    for d in (0, .01, .02):
        env += (t >= d) * np.exp(-np.clip(t - d, 0, None) / .008)
    env += (t >= .028) * np.exp(-np.clip(t - .028, 0, None) / .1) * .6
    return sosfilt(BP_CLAP, n * env) * 2.2


def hat(open_=False):
    t = tt(.3 if open_ else .06)
    return sosfilt(HP_HAT, rng.standard_normal(len(t))) * np.exp(-t / (.09 if open_ else .02))


def snare():
    t = tt(.2)
    body = np.sin(2 * np.pi * 200 * t) * np.exp(-t / .05)
    return sosfilt(BP_SN, rng.standard_normal(len(t))) * np.exp(-t / .07) * 1.6 + .5 * body


def bongo(f):
    """a hand drum: a pitch that drops a little, a skin slap at the start"""
    t = tt(.22)
    ff = f * (1 + .25 * np.exp(-t / .012))
    ph = 2 * np.pi * np.cumsum(ff) / SR
    return (np.sin(ph) * np.exp(-t / (.07 if f > 300 else .11)) + .3 * sosfilt(BP_SN, rng.standard_normal(len(t))) * np.exp(-t / .006))


def crash():
    t = tt(1.6)
    return sosfilt(HP_CR, rng.standard_normal(len(t))) * np.exp(-t / .55) * np.minimum(1, t / .002)


def chord_at(bar, beat):
    c = CHORDS[bar]
    return (c[0] if beat < 2 else c[1]) if isinstance(c, tuple) else c


for bar in range(BARS):
    t0 = bar * 4 * BEAT
    B = bar >= 8                                    # the chorus
    fill = bar in (7, 15)
    for note, b, ln in MEL[bar]:                    # the hook: steel pan; in the chorus doubled by marimba (8va below) + glock
        f = hz(m(note))
        add(steelpan(f, ln * BEAT), t0 + b * BEAT, pan=.1, gain=.34)
        if B:
            add(marimba(f / 2, ln * BEAT), t0 + b * BEAT + .003, pan=-.15, gain=.16)
            add(glock(f), t0 + b * BEAT + .006, pan=-.3, gain=.045)
    for k in range(8):                              # octave-jumping bass on the 8ths (root down, octave up, 5th on beat 3)
        b = k * .5
        root = m(TONES[chord_at(bar, b)][0] + '2')
        if root > m('G#2'):
            root -= 12
        iv = 12 if k % 2 else (7 if k == 4 else 0)
        if fill and bar == 15 and k >= 5:
            continue
        add(bass(hz(root + iv), .38 * BEAT), t0 + b * BEAT, gain=.25 if k % 2 == 0 else .2)
    for k in range(4):                              # plucked chords on every off-beat
        tones = TONES[chord_at(bar, k)]
        for i, n in enumerate(tones):
            add(pluck(hz(m(n + '4')), .14), t0 + (k + .5) * BEAT + i * .005, pan=-.3, gain=.085)
    if B:                                           # brassy stabs on the and-of-2 and on 4
        for b in (1.5, 3):
            for i, n in enumerate(TONES[chord_at(bar, b)]):
                add(bass(hz(m(n + '4')), .22 * BEAT), t0 + b * BEAT + i * .004, pan=.25, gain=.05)
    for b in range(4):                              # four-on-the-floor
        if bar == 15 and b >= 2:
            continue
        add(kick(), t0 + b * BEAT, gain=.5)
    for b in (1, 3):
        if bar == 15 and b == 3:
            continue
        add(clap(), t0 + b * BEAT, pan=.05, gain=.16)
        if B:
            add(snare(), t0 + b * BEAT + .002, pan=-.05, gain=.1)
    for k in range(16):                             # 16th hats + an open hat on every off-beat
        if bar == 15 and k >= 8:
            break
        add(hat(), t0 + k * BEAT / 4 + .002, pan=-.4, gain=.03 if k % 2 == 0 else .016)
    for k in range(4):
        if bar == 15 and k >= 2:
            break
        add(hat(True), t0 + (k + .5) * BEAT, pan=.35, gain=.035)
    if bar in (0, 8):
        add(crash(), t0, pan=-.2, gain=.055)
    if bar == 7:                                    # bongo run into the chorus
        for k in range(8):
            add(bongo(440 if k % 2 else 320), t0 + (2 + k * .25) * BEAT, pan=.4 if k % 2 else -.4, gain=.09 + k * .006)
    if bar == 15:                                   # snare roll + glock climb back to the top
        for k in range(8):
            add(snare(), t0 + (2 + k * .25) * BEAT, pan=0, gain=.05 + k * .012)
        for k, n in enumerate(['G5', 'B5', 'D6', 'G6']):
            add(glock(hz(m(n))), t0 + (2 + k * .5) * BEAT, pan=.4, gain=.07)

# a little room (short, so it stays punchy)
ir_t = np.arange(int(1.0 * SR)) / SR
irL = rng.standard_normal(len(ir_t)) * np.exp(-ir_t / .2); irR = rng.standard_normal(len(ir_t)) * np.exp(-ir_t / .2)
irL[:int(.01 * SR)] = 0; irR[:int(.014 * SR)] = 0
irL /= np.sqrt((irL ** 2).sum()); irR /= np.sqrt((irR ** 2).sum())
wetL = fftconvolve(L, irL)[:N]; wetR = fftconvolve(R, irR)[:N]
L2 = L + .15 * wetL; R2 = R + .15 * wetR

# seamless loop: fold everything after LOOP back onto the start
n = int(round(LOOP * SR))
outL = L2[:n].copy(); outR = R2[:n].copy()
tail = len(L2) - n
outL[:tail] += L2[n:]; outR[:tail] += R2[n:]
st = np.stack([outL, outR], 1)
st /= np.abs(st).max()
st = np.tanh(st * 1.6) / np.tanh(1.6)                      # gentle glue / limiting
st *= 10 ** (-17 / 20) / np.sqrt((st ** 2).mean())          # −17 dBFS RMS (audio.js trims it to sit where the old tune did)
st *= min(1, 10 ** (-1 / 20) / np.abs(st).max())
rms = 20 * np.log10(np.sqrt((st ** 2).mean())); peak = 20 * np.log10(np.abs(st).max())
seam = float(np.abs(st[0] - st[-1]).max())
print(f'loop {LOOP:.3f}s · {BPM} BPM · peak {peak:.1f} dBFS · rms {rms:.1f} dBFS · seam jump {seam:.4f}')

OUT_MP3.parent.mkdir(parents=True, exist_ok=True)
wav = ROOT / 'tools' / 'bgm_loop.wav'
pcm = (np.clip(st, -1, 1) * 32767).astype('<i2')
with wave.open(str(wav), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(wav), '-c:a', 'libmp3lame', '-b:a', '128k', str(OUT_MP3)], check=True)
wav.unlink()
OUT_JS.write_text('/* generated by tools/make_bgm.py — do not edit: the background music loop (mp3, base64) */\n'
                  'window.PP_BGM_DATA = ' + json.dumps({'loop': round(LOOP, 5), 'bpm': BPM,
                                                      'data': base64.b64encode(OUT_MP3.read_bytes()).decode()}) + ';\n',
                  encoding='utf-8')
print('→', OUT_MP3.relative_to(ROOT), OUT_MP3.stat().st_size // 1024, 'KB ·', OUT_JS.relative_to(ROOT), OUT_JS.stat().st_size // 1024, 'KB')
