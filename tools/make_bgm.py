"""Original background music for Phonics Puzzle — a DISCO-FUNK loop (2026-11-22).

Why a new one (user): the old loop (G major, 140 BPM, steel pan over G–D–Em–C) was cut from the same template as Magic
Block, Croco, Eye Catch and Toy Catch (off-beat chops, bounce bass, kick/clap/hats, glock sparkles; its B half was their
IV–V–iii–vi | IV–V–I–V), so by ear they were one tune. Rule: "게임마다 게임에 맞게 음악이 좀 달라야해. 그리고 기본적으로
전체 음악은 신나야해." → "Puzzle → 디스코 펑크".

Fit: pieces that click into place, so a tight groove: A major, 120 BPM, 16 bars = 32 s. Four-on-the-floor kick, open hats
on the off-beats, claps + snare on 2 and 4, a cowbell in the B half, a slap/pop octave bass, a muted "chicken scratch"
guitar with open chords on the and-of-2/4, string stabs and disco string runs, an electric-piano tune (strings double it
in the B half) and a "click-clack" of pieces fitting at the ends of bars 4 and 12.
Chords (7ths): A = Imaj7–IVmaj7–Imaj7–IVmaj7 | iii7–vi7–ii7–V7, B = vi7–ii7–V7–Imaj7 | IVmaj7–iv7–iii7–V7
(a first B half of ii–V–ii–V matched Croco's new title for 5 bars — changed).
Instruments, mixer and mastering: phonics-kit tools/bgm_engine.py (only the score lives here).
→ assets/audio/bgm.mp3 + js/bgm-data.js (window.PP_BGM_DATA, base64). Bump index.html `bgm-data.js?v=` (md5[:8]).

Run: /Users/jini/.local/bin/uv run --with numpy --with scipy --with pyloudnorm python tools/make_bgm.py
(The previous steel-pan loop is in git history: tools/make_bgm.py before 2026-11-22.)
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path.home() / 'Documents/Jini/2026/Phonics/phonics-kit/tools'))
import bgm_engine as E  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
mx = E.Mix(bpm=120, bars=16, seed_n=120)
CHORDS = ['Amaj7', 'Dmaj7', 'Amaj7', 'Dmaj7', 'C#m7', 'F#m7', 'Bm7', 'E7',
          'F#m7', 'Bm7', 'E7', 'Amaj7', 'Dmaj7', 'Dm7', 'C#m7', 'E7']
TONES = {'Amaj7': ['A', 'C#', 'E', 'G#'], 'Dmaj7': ['D', 'F#', 'A', 'C#'], 'C#m7': ['C#', 'E', 'G#', 'B'],
         'F#m7': ['F#', 'A', 'C#', 'E'], 'Bm7': ['B', 'D', 'F#', 'A'], 'E7': ['E', 'G#', 'B', 'D'], 'Dm7': ['D', 'F', 'A', 'C']}
H1 = [('E5', 0, .5), ('A5', .5, .25), ('B5', .75, .25), ('C#6', 1, .5), ('E6', 1.5, .5)]
MEL = [
    H1 + [('G#5', 2.5, .5), ('A5', 3, .5), ('B5', 3.5, .5)],
    [('C#6', 0, .75), ('B5', .75, .25), ('A5', 1, .5), ('F#5', 1.5, .5), ('A5', 2, 1.5), ('F#5', 3.5, .5)],
    H1 + [('F#6', 2.5, .5), ('E6', 3, .5), ('C#6', 3.5, .5)],
    [('D6', 0, .5), ('C#6', .5, .5), ('A5', 1, .5), ('F#5', 1.5, .5), ('A5', 2, 1)],
    [('G#5', 0, .5), ('B5', .5, .5), ('C#6', 1, .5), ('E6', 1.5, .5), ('B5', 2, .5), ('G#5', 2.5, .5), ('E5', 3, 1)],
    [('A5', 0, .5), ('C#6', .5, .5), ('E6', 1, .5), ('F#6', 1.5, .5), ('E6', 2, .5), ('C#6', 2.5, .5), ('A5', 3, 1)],
    [('D6', 0, .5), ('C#6', .5, .5), ('B5', 1, .5), ('A5', 1.5, .5), ('F#5', 2, .5), ('A5', 2.5, .5), ('B5', 3, 1)],
    [('G#5', 0, .5), ('B5', .5, .5), ('D6', 1, .5), ('E6', 1.5, .5)],
    [('F#6', 0, .25), ('F#6', .25, .25), ('C#6', .5, .5), ('A5', 1, .5), ('C#6', 1.5, .5), ('E6', 2, .5), ('F#6', 2.5, .5), ('E6', 3, 1)],
    [('D6', 0, .25), ('D6', .25, .25), ('B5', .5, .5), ('F#5', 1, .5), ('A5', 1.5, .5), ('B5', 2, .5), ('D6', 2.5, .5), ('F#6', 3, 1)],
    [('G#6', 0, .5), ('F#6', .5, .5), ('E6', 1, .5), ('D6', 1.5, .5), ('B5', 2, .5), ('G#5', 2.5, .5), ('B5', 3, .5), ('D6', 3.5, .5)],
    [('C#6', 0, 1), ('E6', 1, .5), ('G#6', 1.5, .5), ('A6', 2, 1.5)],
    [('A5', 0, .5), ('D6', .5, .5), ('F#6', 1, .5), ('A6', 1.5, 1.5), ('F#6', 3, .5), ('E6', 3.5, .5)],
    [('F6', 0, .5), ('D6', .5, .5), ('A5', 1, .5), ('C6', 1.5, .5), ('D6', 2, 1), ('F6', 3, .5), ('E6', 3.5, .5)],
    [('E6', 0, .5), ('C#6', .5, .5), ('G#5', 1, .5), ('B5', 1.5, .5), ('C#6', 2, .5), ('E6', 2.5, .5), ('G#6', 3, 1)],
    [('F#6', 0, .5), ('D6', .5, .5), ('B5', 1, .5), ('A5', 1.5, .5)],
]
CLICK = {3: 3.0, 11: 3.5}               # bar → beat: two pieces click together
RUN = (7, 15)                           # disco string run up into the next bar
SCALE = ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#']
assert len(MEL) == len(CHORDS) == mx.bars

for bar in range(mx.bars):
    B = bar >= 8
    tones = TONES[CHORDS[bar]]
    for note, b, ln in MEL[bar]:                                       # electric-piano tune (+ strings in the B half)
        f = E.hz(note)
        mx.add(E.rhodes(f, ln * mx.beat * .95), mx.at(bar, b), pan=.12, gain=.24, send=.25)
        if B:
            mx.add(E.strings(f, ln * mx.beat, attack=.02), mx.at(bar, b), pan=-.25, gain=.05, send=.3)
    # string stabs on 1 (A) / a held pad (B)
    if B:
        for n in tones:
            mx.add(E.strings(E.hz(n + '4'), 4 * mx.beat * .95, attack=.15), mx.at(bar, 0), pan=-.1, gain=.025, send=.3)
    else:
        for n in tones:
            mx.add(E.strings(E.hz(n + '4'), .3 * mx.beat, attack=.01), mx.at(bar, 0), pan=-.1, gain=.04, send=.25)
    # guitar: muted 16ths, open chord on the and-of-2 and and-of-4
    gtr = [E.hz(n + '4') for n in tones[:3]]
    for k in range(16):
        open_ = k in (6, 14)
        mx.add(E.scratch(gtr, .16 if open_ else .05, muted=not open_), mx.at(bar, k / 4), pan=-.45,
               gain=.06 if open_ else (.035 if k % 2 else .02))
    # bass: slap the root on the beat, pop the octave on the off-beat, a ghost 16th before beat 3
    r = E.midi(tones[0] + '2')
    r = r - 12 if r > E.midi('F#2') else r
    for k in range(8):
        pop = k % 2 == 1
        mx.add(E.slap(E.hz(r + (12 if pop else 0)), .4 * mx.beat, pop=pop), mx.at(bar, k / 2), gain=.3 if not pop else .22)
    mx.add(E.slap(E.hz(r + 7), .2 * mx.beat), mx.at(bar, 1.75), gain=.14)
    # drums
    for b in range(4):
        mx.add(E.kick(), mx.at(bar, b), gain=.58)
        mx.add(E.hat(True), mx.at(bar, b + .5), pan=.3, gain=.06)
    for k in range(16):
        if k % 2:
            mx.add(E.hat(), mx.at(bar, k / 4), pan=.3, gain=.025)
    for b in (1, 3):
        if not (bar in RUN and b == 3):
            mx.add(E.clap(), mx.at(bar, b), pan=.05, gain=.16, send=.15)
            mx.add(E.snare(), mx.at(bar, b), gain=.08)
    if B:
        for b in (.5, 1.5, 2.75, 3.5):
            mx.add(E.cowbell(), mx.at(bar, b), pan=.35, gain=.04)
    if bar in CLICK:
        b = CLICK[bar]
        mx.add(E.woodblock(1400), mx.at(bar, b), pan=-.2, gain=.16, send=.15)
        mx.add(E.woodblock(1000), mx.at(bar, b + .25), pan=.2, gain=.18, send=.15)
    if bar in RUN:                                                     # string run up the scale + clap fill
        for k in range(8):
            deg = (SCALE.index('E') + k) % 7
            n = E.midi(SCALE[deg] + '5') + (12 if SCALE.index('E') + k >= 7 else 0)
            mx.add(E.strings(E.hz(n), .22 * mx.beat, attack=.01), mx.at(bar, 2 + k / 4), pan=-.2, gain=.07, send=.3)
        for k in range(4):
            mx.add(E.clap(), mx.at(bar, 3 + k / 4), gain=.08 + .03 * k, send=.1)
    if bar in (0, 8):
        mx.add(E.crash(), mx.at(bar, 0), pan=-.2, gain=.07, send=.1)

st = mx.render(lufs=-14.9)
E.write(st, mx, ROOT / 'assets' / 'audio' / 'bgm.mp3', ROOT / 'js' / 'bgm-data.js', 'PP_BGM_DATA',
        'generated by tools/make_bgm.py — do not edit: the background music loop (mp3, base64)')
