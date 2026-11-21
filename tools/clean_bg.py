"""The arcade room without the title UI: the logo, START, hand, the flag toggle, the sparkle trails and the Gemini
sparkle are masked out of design/ref_title.png and filled with LaMa (big-lama) at half size (large holes in a soft,
blurred room come out cleaner there), then put back into the full-size picture only inside the mask (feathered).
-> design/work/bg_clean.png (+ bg_mask.png)
uv run --with simple-lama-inpainting --with pillow --with numpy --with scipy python tools/clean_bg.py
"""
import pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi
from simple_lama_inpainting import SimpleLama

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = ROOT / 'design'
C = D / 'work/cut'
ref = Image.open(D / 'ref_title.png').convert('RGB')
W, H = ref.size
m = np.zeros((H, W), bool)
for name, at, grow in [('logo', (610, 203), 26), ('start', (950, 1011), 30), ('hand', (1680, 1225), 18)]:
    a = np.asarray(Image.open(C / f'{name}.png').getchannel('A')) > 8
    m[at[1]:at[1] + a.shape[0], at[0]:at[0] + a.shape[1]] |= a
m = ndi.binary_dilation(m, iterations=26)
im = Image.new('L', (W, H), 0)
d = ImageDraw.Draw(im)
d.rounded_rectangle((10, 10, 400, 215), radius=70, fill=255)          # EN/KO flags (top left) + their glow
d.rounded_rectangle((2560, 1350, 2715, 1490), radius=40, fill=255)    # Gemini sparkle (bottom right)
d.polygon([(1760, 1250), (1860, 1000), (2000, 930), (2010, 1010), (1880, 1150), (1800, 1330)], fill=255)  # sparkle trail right of START
d.polygon([(560, 800), (700, 560), (800, 600), (690, 860)], fill=255)  # sparkle trail left of the logo
d.ellipse((880, 1300, 1130, 1450), fill=255)                          # sparkles under START (left)
d.rounded_rectangle((1890, 950, 2030, 1090), radius=30, fill=255)     # white pointer triangle right of START
m |= np.asarray(im) > 0
Image.fromarray((m * 255).astype(np.uint8)).save(D / 'work/bg_mask.png')

half = ref.resize((W // 2, H // 2), Image.LANCZOS)
mh = Image.fromarray((m * 255).astype(np.uint8)).resize((W // 2, H // 2), Image.NEAREST)
fill = SimpleLama()(half, mh).crop((0, 0, W // 2, H // 2)).resize((W, H), Image.LANCZOS)
soft = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10))
out = Image.composite(fill, ref, soft)
out.save(D / 'work/bg_clean.png')
print('masked', round(m.mean() * 100, 1), '%')
