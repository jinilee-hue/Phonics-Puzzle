"""START without the hand: the hand's own matte (design/work/cut/hand.png, grown 14 px) is painted over with LaMa on
the START crop -> design/work/cut/start_src.png (then tools/cut_art.py mattes it).
uv run --with simple-lama-inpainting --with pillow --with numpy --with scipy python tools/fill_start.py
"""
import pathlib
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from simple_lama_inpainting import SimpleLama

ROOT = pathlib.Path(__file__).resolve().parent.parent
C = ROOT / 'design/work/cut'
BOX = (930, 1000, 1820, 1345)
HAND_AT = (1680, 1225)
ref = Image.open(ROOT / 'design/ref_title.png').convert('RGB')
crop = ref.crop(BOX)
m = np.zeros((crop.height, crop.width), bool)
a = np.asarray(Image.open(C / 'hand.png').getchannel('A')) > 8
x, y = HAND_AT[0] - BOX[0], HAND_AT[1] - BOX[1]
h, w = min(a.shape[0], crop.height - y), min(a.shape[1], crop.width - x)
m[y:y + h, x:x + w] |= a[:h, :w]
m = ndi.binary_dilation(m, iterations=14)
out = SimpleLama()(crop, Image.fromarray((m * 255).astype(np.uint8))).crop((0, 0, crop.width, crop.height))
out.save(C / 'start_src.png')
print('filled', int(m.sum()), 'px')
