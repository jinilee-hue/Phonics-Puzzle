"""The bunny tutor in layers, so it can move (user 2026-11-21: "토끼 애니메이션 줄수 있어? 토끼 눈도 흰자에 홍채에 빛 넣어서
다시 만들어줘"). From the user's design/puzzle_tuter.png (816 x 1248, transparent):
  assets/img/tutor_base.webp  — the bunny without its ears above the head and without its painted eyes (filled with skin)
  assets/img/tutor_ear_l.webp — the left ear, assets/img/tutor_ear_r.webp — the right ear
All three are full-size canvases (same box, layered in the page: ears BEHIND the base). Each ear keeps a 30 px strip below
its cut line, hidden behind the head, so a small rotation never opens a gap; the base fades out over 8 px at the cut so
there is no seam. The new eyes (white, iris, pupil, light) are SVG in index.html, drawn over the base at the old eyes.
uv run --with pillow --with numpy --with scipy python tools/build_tutor.py
"""
import pathlib
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = pathlib.Path(__file__).resolve().parent.parent
src = np.asarray(Image.open(ROOT / 'design/puzzle_tuter.png').convert('RGBA')).astype(np.float32)
H, W = src.shape[:2]
yy, xx = np.mgrid[:H, :W]

# ── the painted eyes -> skin (harmonic fill: every hole pixel = the mean of its neighbours, repeated) ────────────────
base = src.copy()
eyes = np.zeros((H, W), bool)
for x0, x1, y0, y1 in [(296, 370, 448, 527), (485, 546, 428, 499)]:
    r, g, b = src[y0:y1, x0:x1, 0], src[y0:y1, x0:x1, 1], src[y0:y1, x0:x1, 2]
    eyes[y0:y1, x0:x1] |= (r < 175) & (g < 125) & (b < 105)
eyes = ndi.binary_fill_holes(ndi.binary_dilation(eyes, iterations=7))
ys, xs = np.nonzero(eyes)
y0, y1, x0, x1 = ys.min() - 2, ys.max() + 3, xs.min() - 2, xs.max() + 3
sub = base[y0:y1, x0:x1, :3].copy(); hole = eyes[y0:y1, x0:x1]
sub[hole] = sub[~hole].mean(0)
for _ in range(3000):
    avg = (np.roll(sub, 1, 0) + np.roll(sub, -1, 0) + np.roll(sub, 1, 1) + np.roll(sub, -1, 1)) / 4
    sub[hole] = avg[hole]
base[y0:y1, x0:x1, :3] = sub

# ── ears: above a cut line each; the base keeps the head ─────────────────────────────────────────────────────────
def dist_left(x, y):        # signed px above the left ear's cut line (98,342)-(264,246); > 0 = above
    ax, ay, bx, by = 98, 342, 264, 246
    nx, ny = (by - ay), -(bx - ax); n = np.hypot(nx, ny)
    return ((x - ax) * nx + (y - ay) * ny) / n
dl = dist_left(xx, yy)
dr = 262.0 - yy                                  # the right ear: above y 262
# each ear = its own width above its cut. The base fades the ear out softly (blurred mask, no hard alpha edge anywhere),
# and each ear layer reaches 10 px further than that fade on every side (only inside the head's outline below the cut),
# so wherever the base is see-through the ear is there underneath — no seam line (two hard edges in one place showed
# as a faint box when both layers were resampled)
left = (xx < 264)
right = (xx >= 300) & (xx < 496)
alpha = src[..., 3] / 255
# the head is a circle (centre 337,545, r 307 — through the head's top beside the right ear): nothing inside it moves
in_head = np.hypot(xx - 337, yy - 545) < 307
reg_l = left & (dl > 0) & ~in_head & (alpha > 0)
reg_r = right & (dr > -12) & ~in_head & (alpha > 0)
soft_l = np.clip(ndi.gaussian_filter(reg_l.astype(np.float32), 3), 0, 1)
soft_r = np.clip(ndi.gaussian_filter(reg_r.astype(np.float32), 3), 0, 1)
inner = ndi.binary_erosion(alpha > .5, iterations=10)
# under each ear (inside the head) a 30 px strip of head, only as wide as the ear's base, so a turned ear's base never
# lifts off the head (an eroded strip left a crescent of background at the base)
solid = alpha > .5
cover_l = reg_l | (ndi.binary_dilation(reg_l, iterations=30) & solid & (xx >= 108) & (xx < 262))
cover_r = reg_r | (ndi.binary_dilation(reg_r, iterations=30) & solid & (xx >= 306) & (xx < 490))
ear_l = src.copy(); ear_l[..., 3] = 255 * alpha * cover_l
ear_r = src.copy(); ear_r[..., 3] = 255 * alpha * cover_r
base[..., 3] = src[..., 3] * (1 - np.maximum(soft_l, soft_r))

out = ROOT / 'assets/img'
for name, arr in [('tutor_base', base), ('tutor_ear_l', ear_l), ('tutor_ear_r', ear_r)]:
    # lossless: lossy layers came out a shade apart, and the cut showed as a faint box on the head
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(out / f'{name}.webp', lossless=True, method=6)
    print(name, (out / f'{name}.webp').stat().st_size // 1024, 'KB')
