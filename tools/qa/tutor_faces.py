"""The bunny tutor's faces and mouth: each face at rest, and the mouth while a real line plays.
uv run --with playwright==1.62.0 --with pillow python tools/qa/tutor_faces.py <out>"""
import sys, time, json, pathlib
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont
o = pathlib.Path(sys.argv[1]); o.mkdir(parents=True, exist_ok=True)
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=3)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:5267/?fast=1&fake=1'); pg.wait_for_function('window.__ready'); time.sleep(0.4)
    pg.click('#btnStart', force=True); pg.wait_for_function('window.__pp.G.screen === "game" && !window.__pp.G.busy', timeout=30000); time.sleep(1.2)
    pg.evaluate("document.querySelectorAll('.tutor .rig, .tutor .ear').forEach(e => e.style.animation = 'none'); document.querySelectorAll('.bubble').forEach(e => e.style.display = 'none')")
    r = json.loads(pg.evaluate("JSON.stringify(document.querySelector('#tutor').getBoundingClientRect())"))
    head = {'x': r['x'] + r['width'] * .1, 'y': r['y'] + r['height'] * .2, 'width': r['width'] * .72, 'height': r['height'] * .36}
    for f in ['smile', 'happy', 'wow', 'wink', 'cheeky', 'oops']:
        pg.evaluate(f"window.__pp.setFace('{f}', 4000)"); time.sleep(0.9)
        pg.screenshot(path=str(o / f'face_{f}.png'), clip=head)
    pg.evaluate("window.__pp.setFace('smile')"); time.sleep(0.6)
    pg.evaluate("Sound.unlock(); Sound.say('t:howto')")
    shots, t0 = 0, time.time()
    while shots < 3 and time.time() - t0 < 6:
        if pg.evaluate('Sound.talking'):
            time.sleep(0.25 + shots * 0.37); pg.screenshot(path=str(o / f'talk_{shots}.png'), clip=head); shots += 1
        else: time.sleep(0.05)
    b.close()
try: font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 34)
except Exception: font = ImageFont.load_default()
names = ['smile', 'happy', 'wow', 'wink', 'cheeky', 'oops'] + [f'talk_{i}' for i in range(3)]
ims = []
for n in names:
    f = o / (f'face_{n}.png' if not n.startswith('talk') else f'{n}.png')
    if f.exists(): ims.append((n, Image.open(f).convert('RGB')))
W, H = ims[0][1].size; sc = 380 / W; w2, h2 = 380, int(H * sc)
s = Image.new('RGB', (3 * (w2 + 10), 3 * (h2 + 44)), (255, 255, 255)); d = ImageDraw.Draw(s)
for i, (n, im) in enumerate(ims):
    x, y = (i % 3) * (w2 + 10), (i // 3) * (h2 + 44); d.text((x + 6, y + 4), n, fill=(60, 40, 90), font=font); s.paste(im.resize((w2, h2)), (x, y + 42))
s.save(o / 'faces_sheet.png'); print(errs or 'no errors')
