"""Frames of the START transition -> <out>/sw_sheet.png. uv run --with playwright==1.62.0 --with pillow python tools/qa/swirl.py <out>"""
import sys, time, pathlib
from playwright.sync_api import sync_playwright
from PIL import Image
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.goto('http://127.0.0.1:5267/'); pg.wait_for_function('window.__ready'); time.sleep(1.4)
    pg.click('#btnStart', force=True)
    for i, t in enumerate([0.45, 0.25, 0.25, 0.3, 0.35, 0.5]):
        time.sleep(t); pg.screenshot(path=str(out / f'sw_{i}.png'))
    b.close()
ims = [Image.open(out / f'sw_{i}.png').resize((640, 360)) for i in range(6)]
s = Image.new('RGB', (1280, 1080))
for i, im in enumerate(ims):
    s.paste(im, ((i % 2) * 640, (i // 2) * 360))
s.save(out / 'sw_sheet.png')
