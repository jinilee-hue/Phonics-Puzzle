"""Buttons from the user's asset sheet design/puzzle_assets.png (2576 x 717, transparent; from ~/Downloads/puzzle_assets.png,
2026-11-21: "버튼들 최대한 동일하게") -> assets/img/ui/*.webp, used as they are:
  home, restart (pills) · up, down (tray) · sound · flag_en, flag_ko · back, pause, settings (cut, not used yet)
Three get their text / icon painted out so the game can put live content on the same art (each column is filled with a
straight blend between the clean pixels just above and just below — the ribbons and the jelly are smooth vertical
gradients there; LaMa smeared ghost digits in from the shadows at the hole's edge):
  level  = the LEVEL badge without "Stage" (the game writes "1-3" on the blue ribbon)
  score  = the gold ribbon without "1200" (the game writes the score)
  round  = the pink round button without the speaker (key / exit icons go on it)
Each piece is cut by its own alpha blob (neighbours dropped), 3 px padding.
uv run --with pillow --with numpy --with scipy python tools/cut_buttons.py
"""
import json, pathlib
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'design/puzzle_assets.png'
OUT = ROOT / 'assets/img/ui'
OUT.mkdir(parents=True, exist_ok=True)
sheet = Image.open(SRC).convert('RGBA')
A = np.asarray(sheet)[..., 3]
lab, _ = ndi.label(ndi.binary_closing(A > 24, iterations=3))

BOX = {   # sheet px (x0, y0, x1, y1) — from the alpha blobs
    'home': (1227, 115, 1856, 339), 'restart': (1936, 115, 2565, 339),
    'level': (3, 445, 369, 714), 'score': (430, 492, 1024, 705),
    'up': (1093, 477, 1325, 711), 'down': (1366, 477, 1596, 710), 'back': (1667, 477, 1896, 711), 'pause': (1938, 477, 2167, 711),
    'flag_en': (2242, 383, 2393, 533), 'sound': (2242, 557, 2393, 712), 'flag_ko': (2422, 385, 2573, 533), 'settings': (2423, 557, 2573, 712),
}


def cut(name, pad=3):
    x0, y0, x1, y1 = BOX[name]
    ids = np.unique(lab[y0:y1, x0:x1]); ids = ids[ids > 0]
    best = max(ids, key=lambda i: (lab[y0:y1, x0:x1] == i).sum())
    keep = ndi.binary_dilation(lab == best, iterations=4)
    arr = np.asarray(sheet).copy(); arr[..., 3] = np.where(keep, arr[..., 3], 0)
    im = Image.fromarray(arr).crop((max(0, x0 - pad), max(0, y0 - pad), x1 + pad, y1 + pad))
    return im


def blend_fill(im, y0, y1, x0, x1, inside=None):
    """rows y0..y1-1 of columns x0..x1-1: a straight blend from the mean of the 3 rows above to the 3 rows below,
    then a light blur inside the hole (only where `inside` is true, if given)"""
    a = np.asarray(im).astype(np.float32).copy()
    top = a[y0 - 3:y0, x0:x1, :3].mean(0); bot = a[y1:y1 + 3, x0:x1, :3].mean(0)
    t = ((np.arange(y0, y1) - y0 + 0.5) / (y1 - y0))[:, None, None]
    fill = top[None] * (1 - t) + bot[None] * t
    hole = np.zeros(a.shape[:2], bool); hole[y0:y1, x0:x1] = True
    if inside is not None:
        hole &= inside
    region = a[y0:y1, x0:x1, :3]
    region[hole[y0:y1, x0:x1]] = fill[hole[y0:y1, x0:x1]]
    a[y0:y1, x0:x1, :3] = region
    sm = np.stack([ndi.gaussian_filter(a[..., c], 1.6) for c in range(3)], -1)
    soft = ndi.gaussian_filter(ndi.binary_dilation(hole, iterations=2).astype(np.float32), 1.2)[..., None]
    a[..., :3] = a[..., :3] * (1 - soft) + sm * soft
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def blend_fill_h(im, y0, y1, x0, x1):
    """the same along rows: the blue ribbon runs sideways and its letters touch the stripes above / below"""
    a = np.asarray(im).astype(np.float32).copy()
    left = a[y0:y1, x0 - 3:x0, :3].mean(1); right = a[y0:y1, x1:x1 + 3, :3].mean(1)
    t = ((np.arange(x0, x1) - x0 + 0.5) / (x1 - x0))[None, :, None]
    a[y0:y1, x0:x1, :3] = left[:, None] * (1 - t) + right[:, None] * t
    sm = np.stack([ndi.gaussian_filter(a[..., c], 1.2) for c in range(3)], -1)
    hole = np.zeros(a.shape[:2], np.float32); hole[y0:y1, x0:x1] = 1
    soft = ndi.gaussian_filter(hole, 1.2)[..., None]
    a[..., :3] = a[..., :3] * (1 - soft) + sm * soft
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def band_fill(im, x0, x1, top, bot, bend):
    """a curved ribbon: rows top..bot-1 at the ribbon's middle (x = 185) shift down by bend * (x - 185)^2 toward the ends
    (the LEVEL band arcs up ~10 px in the middle). Each hole pixel = a straight blend, along the band, of the clean
    columns just left of x0 and right of x1 at the same height IN THE BAND — the gold stripes above and below stay as
    they are (the first flat fill smeared them: user "버튼에 얼룩이 다 안 지워진게 있는데")"""
    a = np.asarray(im).astype(np.float32).copy()
    src = a.copy()
    sh = lambda x: bend * (x - 185) ** 2

    def ref(xc, y):                      # 3 columns round xc at a fractional height (no stair steps on the stripes)
        y0 = int(np.floor(y)); f = y - y0
        return ((1 - f) * src[y0, xc - 1:xc + 2, :3] + f * src[y0 + 1, xc - 1:xc + 2, :3]).mean(0)
    xl, xr = x0 - 3, x1 + 2
    for x in range(x0, x1):
        t = (x - x0 + 0.5) / (x1 - x0)
        for y in range(int(round(top + sh(x))), int(round(bot + sh(x)))):
            yb = y - sh(x)
            a[y, x, :3] = (1 - t) * ref(xl, yb + sh(xl)) + t * ref(xr, yb + sh(xr))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def harmonic_fill(im, hole, iters=2500):
    """a hole on a curved jelly: every hole pixel becomes the mean of its 4 neighbours, repeated (smooth from all sides)"""
    a = np.asarray(im).astype(np.float32).copy()
    c = a[..., :3]
    ys, xs = np.nonzero(hole)
    y0, y1, x0, x1 = ys.min() - 1, ys.max() + 2, xs.min() - 1, xs.max() + 2
    sub = c[y0:y1, x0:x1].copy(); h = hole[y0:y1, x0:x1]
    sub[h] = sub[~h].mean(0)
    for _ in range(iters):
        avg = (np.roll(sub, 1, 0) + np.roll(sub, -1, 0) + np.roll(sub, 1, 1) + np.roll(sub, -1, 1)) / 4
        sub[h] = avg[h]
    c[y0:y1, x0:x1] = sub
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


meta = {}
for n in BOX:
    im = cut(n)
    if n == 'level':                     # "Stage" on the ribbon: the cream / brown letter pixels between the two stripes
        im = band_fill(im, 80, 291, 132, 216, 9.5 / 115 ** 2)   # band body + the bottom stripe the g reached into (middle: rows 131-215)
        meta[n] = {'text': [0.5, 0.637], 'h': 0.21}      # where the live text goes (share of width / height), cap height
    elif n == 'score':                   # "1200": a box over the digits, left of the trophy
        # along the ribbon between its clean body left of the digits and right of them (a top-to-bottom blend made the
        # middle pale: the rows above and below the digits are the light stripes)
        im = blend_fill_h(im, 32, 150, 106, 391)
        meta[n] = {'text': [252 / im.width, 88 / im.height], 'h': 0.44}
    elif n == 'sound':                   # the round pink base without its speaker -> 'round'
        a = np.asarray(im).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
        yy, xx = np.mgrid[:im.height, :im.width]; cx, cy = im.width / 2, im.height / 2 - 4
        inner = np.hypot(xx - cx, yy - cy) < im.width * 0.36
        light = (g > 150) & (r > 220)    # the light pink icon (the jelly is a deeper pink)
        ys, xs = np.nonzero(ndi.binary_opening(inner & light, iterations=2))
        icx, icy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
        icy += 4; rad = max(xs.max() - xs.min(), ys.max() - ys.min()) / 2 + 15   # the icon with its outline and drop shadow
        m = (np.hypot(xx - icx, yy - icy) < rad) & (np.hypot(xx - cx, yy - cy) < im.width * 0.42)
        blank = harmonic_fill(im, m)
        blank.save(OUT / 'round.webp', quality=92, method=6)
        meta['round'] = {}
    im.save(OUT / f'{n}.webp', quality=92, method=6)
    meta.setdefault(n, {})
    meta[n]['size'] = list(im.size)
    print(n, im.size)
(OUT / 'meta.json').write_text(json.dumps(meta, indent=1))
