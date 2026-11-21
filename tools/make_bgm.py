"""Original background music for Phonics Puzzle: a light, bouncy playroom loop under the word voices.
C major, 120 BPM, 16 bars (32 s): marimba tune over C–Am–F–G (A half) and F–G–Em–Am (B half), plucked off-beat chords,
round bass, soft kick / claps / shaker, glockenspiel sparkles. The synth voices are Eye Catch's tools/make_bgm.py
(Croco Phonics' synths, no samples); the tune and chords are this game's own. Seamless loop (reverb tail folded back).
-> assets/audio/bgm.mp3 + js/bgm-data.js (base64)
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
BPM = 120
BEAT = 60 / BPM
BARS = 16
LOOP = BARS * 4 * BEAT
N = int(LOOP * SR) + SR * 3
rng = np.random.default_rng(7)
NOTE = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
hz = lambda midi: 440 * 2 ** ((midi - 69) / 12)


def m(s):
    return NOTE[s[:-1]] + 12 * (int(s[-1]) + 1)


CHORDS = ['C', 'Am', 'F', 'G', 'C', 'Am', ('F', 'G'), 'C',
          'F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'G']
TONES = {'C': ['C', 'E', 'G'], 'Am': ['A', 'C', 'E'], 'F': ['F', 'A', 'C'], 'G': ['G', 'B', 'D'], 'Em': ['E', 'G', 'B']}
HOOK = [('E5', 0, .5), ('G5', .5, .5), ('C6', 1, .5), ('G5', 1.5, .5), ('A5', 2, .5), ('G5', 2.5, .5), ('E5', 3, 1)]
MEL = [
    HOOK,
    [('C6', 0, .5), ('B5', .5, .5), ('A5', 1, .5), ('E5', 1.5, .5), ('A5', 2, 1), ('C6', 3, 1)],
    [('A5', 0, .5), ('C6', .5, .5), ('F6', 1, 1), ('E6', 2, .5), ('D6', 2.5, .5), ('C6', 3, 1)],
    [('B5', 0, .5), ('D6', .5, .5), ('G5', 1, .5), ('B5', 1.5, .5), ('D6', 2, 1.5), ('G5', 3.5, .5)],
    HOOK,
    [('E6', 0, .5), ('C6', .5, .5), ('A5', 1, 1), ('B5', 2, .5), ('C6', 2.5, .5), ('E6', 3, 1)],
    [('F6', 0, .5), ('E6', .5, .5), ('D6', 1, .5), ('C6', 1.5, .5), ('B5', 2, .5), ('D6', 2.5, .5), ('G6', 3, 1)],
    [('E6', 0, 1), ('C6', 1.5, .5), ('G5', 2, .5), ('E5', 2.5, .5)],
    [('A5', 0, .75), ('G5', .75, .25), ('F5', 1, .5), ('A5', 1.5, .5), ('C6', 2, 1), ('A5', 3, 1)],
    [('B5', 0, .75), ('A5', .75, .25), ('G5', 1, .5), ('B5', 1.5, .5), ('D6', 2, 1), ('B5', 3, 1)],
    [('G5', 0, .5), ('B5', .5, .5), ('E6', 1, .5), ('D6', 1.5, .5), ('B5', 2, .5), ('G5', 2.5, .5), ('E5', 3, 1)],
    [('A5', 0, .5), ('C6', .5, .5), ('E6', 1, 1), ('D6', 2, .5), ('C6', 2.5, .5), ('A5', 3, 1)],
    [('F6', 0, .5), ('E6', .5, .5), ('D6', 1, .5), ('C6', 1.5, .5), ('A5', 2, .5), ('C6', 2.5, .5), ('F6', 3, 1)],
    [('D6', 0, .5), ('B5', .5, .5), ('G5', 1, .5), ('B5', 1.5, .5), ('D6', 2, .5), ('G6', 2.5, .5), ('F6', 3, 1)],
    [('E6', 0, .5), ('D6', .5, .5), ('C6', 1, .5), ('G5', 1.5, .5), ('E5', 2, .5), ('G5', 2.5, .5), ('C6', 3, 1)],
    [('D5', 0, .5), ('E5', .5, .5), ('F5', 1, .5), ('G5', 1.5, .5), ('B5', 2, .5), ('D6', 2.5, .5)],
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
    B = bar >= 8
    fill = bar in (7, 15)
    for note, b, ln in MEL[bar]:
        f = hz(m(note))
        add(marimba(f, ln * BEAT), t0 + b * BEAT, pan=.12, gain=.34)
        if B:
            add(glock(f), t0 + b * BEAT + .004, pan=-.25, gain=.045)
    for b, iv, ln in ((0, 0, .8), (1.5, 7, .4), (2, 0, .8), (3.5, 12, .4)):
        root = m(TONES[chord_at(bar, b)][0] + '2')
        if root > m('G#2'):
            root -= 12
        add(bass(hz(root + iv), ln * BEAT), t0 + b * BEAT, gain=.24 if iv == 0 else .17)
    for k in range(4):
        tones = TONES[chord_at(bar, k)]
        for i, n in enumerate(tones):
            add(pluck(hz(m(n + '4')), .16), t0 + (k + .5) * BEAT + i * .006, pan=-.3, gain=.075)
    for b in ((0,) if fill else (0, 2)):
        add(kick(), t0 + b * BEAT, gain=.42)
    for b in (1, 3):
        if fill and b == 3:
            continue
        add(clap(), t0 + b * BEAT, pan=.05, gain=.14)
    for k in range(8):
        add(hat(), t0 + k * BEAT / 2 + .002, pan=-.4, gain=.03 if k % 2 else .018)
    if bar in (0, 8):
        add(crash(), t0, pan=-.2, gain=.04)
    if fill:
        for k in range(4):
            add(bongo(420 if k % 2 else 300), t0 + (2 + k * .5) * BEAT, pan=.4 if k % 2 else -.4, gain=.1)
        for k, n in enumerate(['G5', 'B5', 'D6', 'G6'] if bar == 15 else ['G5', 'B5', 'D6', 'F6']):
            add(glock(hz(m(n))), t0 + (2 + k * .5) * BEAT, pan=.4, gain=.08)
    if bar in (3, 11):
        for k, n in enumerate(['G5', 'B5', 'D6', 'F6']):
            add(glock(hz(m(n))), t0 + (3 + k * .25) * BEAT, pan=.4, gain=.06)

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
