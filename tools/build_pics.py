"""Puzzle pictures + word list, straight from the lesson pack FP.K.U1L1 (Phonics/공통자료/FP.K.U1L1-lesson-pack, read with
phonics-kit/tools/lessonpack.py; user 2026-11-21: "레슨팩 써서 만들어"): every m-word of the pack that has a picture and
the content team's audio — the activity words (A-HN.TW, A-IN.SI, A-IP.SW), the sound-sort words (A-SS.SO: mail, mask,
match, mice, mouth) and mug from the listening sentence; 'my' (a function word, its picture is a girl) is left out.
Pictures = the pack's (= 공통이미지자료 대표이미지), used as they are.
A jigsaw needs a picture in every piece, so each object is set on a soft pastel backdrop of its own (gradient, light,
faint rays, bokeh, a floor shadow) at the puzzle's 6:5 shape. moon keeps its own night-sky square (cover-cropped).
-> assets/pics/<w>.webp (1200 x 1000) + js/words.js (with `ph`, the expected phonemes for the phonics-api judge)
uv run --with pillow --with numpy python tools/build_pics.py
"""
import json, math, pathlib, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
KIT = pathlib.Path.home() / 'Documents/Jini/2026/Phonics/phonics-kit'
sys.path.insert(0, str(KIT / 'tools'))
import lessonpack  # noqa: E402

TB = 'FP.K.U1L1'
SKIP = {'my'}
W, H = 1200, 1000
OUT = ROOT / 'assets/pics'
OUT.mkdir(parents=True, exist_ok=True)
# backdrop (top, bottom) per word: a colour that stands apart from the object
PAL = {
    'man': ('#fff1cf', '#ffc995'), 'map': ('#fff6cf', '#ffd77f'), 'meat': ('#e2f8ef', '#a9e5d0'),
    'milk': ('#ffe6f0', '#ffb7d3'), 'mirror': ('#e2eeff', '#b5cefb'), 'mitt': ('#e0f4ff', '#a6daf6'),
    'monkey': ('#e8f8d6', '#b6e397'), 'mop': ('#f1e7ff', '#d2bbf6'), 'mouse': ('#fff4cf', '#ffdf86'),
    'mug': ('#ddf7f4', '#a4e1dc'), 'mushroom': ('#eaf9dc', '#bde6a0'), 'mat': ('#e3f1ff', '#b3d6f7'),
    'mail': ('#fff0dc', '#ffcf9e'), 'mask': ('#e0f8ee', '#a8e4cc'), 'match': ('#e8ecff', '#bfc8f6'),
    'mice': ('#f3f9d2', '#d6eb92'), 'mouth': ('#ddf6f6', '#a3dfe0'),
}
hexrgb = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32)


def backdrop(top, bot, seed):
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    t = (y / H)[..., None]
    img = hexrgb(top) * (1 - t) + hexrgb(bot) * t
    # light behind the object
    r = np.hypot((x - W / 2) / W, (y - H * .46) / H)[..., None]
    img = img + (255 - img) * np.clip(1 - r / .42, 0, 1) ** 1.6 * .75
    # faint rays from the middle
    ang = np.arctan2(y - H * .46, x - W / 2)
    rays = (np.sin(ang * 14) > 0).astype(np.float32)[..., None] * np.clip(r * 2.2, 0, 1) * .07
    img = img + (255 - img) * rays
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).convert('RGBA')
    # bokeh + little sparkles
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    for _ in range(26):
        cx, cy, rr = rng.uniform(0, W), rng.uniform(0, H), rng.uniform(14, 60)
        if abs(cx - W / 2) < 300 and abs(cy - H * .5) < 330:
            continue
        d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=(255, 255, 255, int(rng.uniform(40, 95))))
    lay = lay.filter(ImageFilter.GaussianBlur(3))
    d = ImageDraw.Draw(lay)
    for _ in range(18):
        cx, cy, s = rng.uniform(30, W - 30), rng.uniform(30, H - 30), rng.uniform(7, 16)
        if abs(cx - W / 2) < 330 and abs(cy - H * .5) < 360:
            continue
        d.polygon([(cx, cy - s), (cx + s * .28, cy - s * .28), (cx + s, cy), (cx + s * .28, cy + s * .28),
                   (cx, cy + s), (cx - s * .28, cy + s * .28), (cx - s, cy), (cx - s * .28, cy - s * .28)], fill=(255, 255, 255, 210))
    im.alpha_composite(lay)
    return im


def place(bg, obj):
    a = obj.getchannel('A').point(lambda v: 255 if v > 8 else 0)
    obj = obj.crop(a.getbbox())
    s = min(900 / obj.width, 780 / obj.height)
    obj = obj.resize((round(obj.width * s), round(obj.height * s)), Image.LANCZOS)
    x = (W - obj.width) // 2
    y = max(70, min(905 - obj.height, round(H * .52 - obj.height / 2)))     # wide things (mat, mask) sit in the middle
    # floor shadow
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse((W / 2 - obj.width * .42, y + obj.height - 26, W / 2 + obj.width * .42, y + obj.height + 26), fill=(40, 30, 60, 70))
    bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)))
    bg.alpha_composite(obj, (x, y))
    return bg


pk = lessonpack.load(lessonpack.pack_dir(TB))
lessonpack.phonemes(pk)
WORDS = [w for w, e in pk['words'].items()
         if w[0] == 'm' and w not in SKIP and e['image'] and e['audio'] and e['audio_src'] == 'pack']
words = []
for i, w in enumerate(WORDS):
    e = pk['words'][w]
    src = Image.open(e['image']).convert('RGBA')
    if w == 'moon':                       # the pack's own night sky, cover-cropped to 6:5
        s = W / src.width
        im = src.resize((W, round(src.height * s)), Image.LANCZOS)
        top = (im.height - H) // 2
        im = im.crop((0, top, W, top + H))
    else:
        im = place(backdrop(*PAL[w], seed=11 + i), src)
    im.convert('RGB').save(OUT / f'{w}.webp', quality=88, method=6)
    words.append({'w': w, 'ko': e['ko'], 'ph': e['ph'], 'img': f'assets/pics/{w}.webp',
                  'act': [a.split('.')[-2] + '.' + a.split('.')[-1] for a in e['activities']]})
    print(w, ' '.join(e['ph']))
data = {'book': pk['book'], 'pack': TB, 'resource_version': pk['resource_version'], 'unit': pk['unit'], 'lesson': 1,
        'title': 'Mm', 'sound': pk['sound']['text'], 'size': [W, H], 'words': words}
(ROOT / 'js/words.js').write_text('/* generated by tools/build_pics.py — do not edit */\nwindow.PP_WORDS = '
                                  + json.dumps(data, ensure_ascii=False, indent=1) + ';\n', encoding='utf-8')
