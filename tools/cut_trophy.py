"""The gold trophy alone, from the score ribbon on the user's sheet (design/puzzle_assets.png) -> assets/img/ui/trophy.webp
(user 2026-11-21: "리본이 너무 많으니까 트로피만 이런형태로 넣고 점수판은 … 라운드 박스"). The trophy is painted over the
ribbon, so it is matted with rembg birefnet-general (on a 3x upscale, white backdrop); the handle loops come out clear.
U2NET_HOME=~/.cache/rembg uv run --with "rembg[cpu]" --with pillow --with numpy python tools/cut_trophy.py
"""
import pathlib
import numpy as np
from PIL import Image
from rembg import remove, new_session

ROOT = pathlib.Path(__file__).resolve().parent.parent
sheet = Image.open(ROOT / 'design/puzzle_assets.png').convert('RGBA')
crop = sheet.crop((807, 489, 1002, 654))                      # the trophy on the score ribbon (sheet px)
rgb = Image.new('RGB', crop.size, (255, 255, 255)); rgb.paste(crop, mask=crop.getchannel('A'))
big = rgb.resize((crop.width * 3, crop.height * 3), Image.LANCZOS)
m = remove(big, session=new_session('birefnet-general'), only_mask=True).resize(crop.size, Image.LANCZOS)
out = crop.copy(); out.putalpha(m)
out = out.crop(out.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox())
out.save(ROOT / 'assets/img/ui/trophy.webp', quality=92, method=6)
print('trophy', out.size)
