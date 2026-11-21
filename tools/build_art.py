"""Web art -> assets/img/bg.webp, logo.webp, start.webp, hand.webp
- background = the user's own file design/puzzle_bg.png (2026-11-21, from ~/Downloads/puzzle_bg.png, 2752x1536 — the
  mockup's playroom without UI); the old LaMa-cleaned mockup (design/work/bg_clean.png, tools/clean_bg.py) only if it is missing
- logo = the user's own file design/puzzle_logo.png (2026-11-21, from ~/Downloads/puzzle_logo.png, transparent, no ribbon),
  1800 px wide; the mockup cut only if it is missing
- START = the user's own file design/puzzle_btn_start.png (2026-11-21, from ~/Downloads, 1080x396, transparent);
  the mockup cut only if it is missing
- hand = cut from the title mockup (design/work/cut/hand.png, tools/cut_art.py)
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
    own = ROOT / {'logo': 'design/puzzle_logo.png', 'start': 'design/puzzle_btn_start.png'}.get(n, 'design/-')
    im = Image.open(own if own.exists() else W / f'cut/{n}.png').convert('RGBA')
    if n == 'logo' and im.width > 1800:
        im = im.resize((1800, round(im.height * 1800 / im.width)), Image.LANCZOS)
    im.save(OUT / f'{n}.webp', quality=90, method=6)
    print(n, im.size)
for f in sorted(OUT.glob('*.webp')):
    print(f.name, f.stat().st_size // 1024, 'KB')
