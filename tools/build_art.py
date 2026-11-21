"""Web art -> assets/img/bg.webp, logo.webp, start.webp, hand.webp
- background = the user's own file design/puzzle_bg.png (2026-11-21, from ~/Downloads/puzzle_bg.png, 2752x1536 — the
  mockup's playroom without UI); the old LaMa-cleaned mockup (design/work/bg_clean.png, tools/clean_bg.py) only if it is missing
- logo / START / hand = cuts from the title mockup (design/work/cut/*.png, tools/cut_art.py)
uv run --with pillow python tools/build_art.py
"""
import pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
W = ROOT / 'design/work'
OUT = ROOT / 'assets/img'
OUT.mkdir(parents=True, exist_ok=True)
src = ROOT / 'design/puzzle_bg.png'
bg = Image.open(src if src.exists() else W / 'bg_clean.png').convert('RGB')
bg.resize((2064, 1152), Image.LANCZOS).save(OUT / 'bg.webp', quality=82, method=6)
for n in ('logo', 'start', 'hand'):
    im = Image.open(W / f'cut/{n}.png').convert('RGBA')
    im.save(OUT / f'{n}.webp', quality=90, method=6)
    print(n, im.size)
for f in sorted(OUT.glob('*.webp')):
    print(f.name, f.stat().st_size // 1024, 'KB')
