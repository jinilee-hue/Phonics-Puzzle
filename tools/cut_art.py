"""Cut the title art out of the user's mockup (design/ref_title.png, 2752x1536): the PHONICS PUZZLE logo, the START
button and the pointing hand -> design/work/cut/<name>.png (RGBA, mockup px). Matte = rembg birefnet-general on a crop.
The hand covers START's bottom-right rim in the mockup: run tools/fill_start.py once first (LaMa fills that corner).
U2NET_HOME=~/.cache/rembg uv run --with "rembg[cpu]" --with pillow --with numpy --with scipy python tools/cut_art.py
"""
import os, pathlib
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from rembg import remove, new_session

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = ROOT / 'design'
OUT = D / 'work/cut'
OUT.mkdir(parents=True, exist_ok=True)
ref = Image.open(D / 'ref_title.png').convert('RGB')
S = new_session('birefnet-general')

BOXES = {                      # crop boxes in mockup px (x0, y0, x1, y1)
    'logo': (600, 180, 2130, 1013),
    'start': (930, 1000, 1820, 1345),
    'hand': (1660, 1205, 1870, 1400),
}


def matte(im):
    m = remove(im, session=S, only_mask=True)
    return np.asarray(m).astype(np.float32) / 255


def keep_main(a, thr=0.5):
    """the biggest connected blob (+ anything touching it), so stray sparkles in the crop drop out"""
    lab, n = ndi.label(a > thr)
    if n < 2:
        return a
    sizes = ndi.sum(np.ones_like(a), lab, range(1, n + 1))
    big = lab == (1 + int(np.argmax(sizes)))
    big = ndi.binary_dilation(big, iterations=6)
    return a * big


for name, box in BOXES.items():
    crop = ref.crop(box)
    if name == 'start':
        # the hand covers START's bottom-right rim: tools/fill_start.py painted it over with LaMa (same crop box)
        assert box == (930, 1000, 1820, 1345)
        crop = Image.open(OUT / 'start_src.png').convert('RGB')
    a = matte(crop)
    if name != 'logo':
        a = keep_main(a)
    rgba = crop.convert('RGBA')
    rgba.putalpha(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)))
    bb = rgba.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
    rgba = rgba.crop(bb)
    rgba.save(OUT / f'{name}.png')
    print(name, 'crop at', (box[0] + bb[0], box[1] + bb[1]), rgba.size)
