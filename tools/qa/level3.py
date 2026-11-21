"""Level 3 (3x3) at a given size: tray scrolling, drag, solve all. uv run --with playwright==1.62.0 python tools/qa/level3.py <out> W H"""
import sys, pathlib, time
from playwright.sync_api import sync_playwright
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
W, H = int(sys.argv[2]), int(sys.argv[3])
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=2)
    pg.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))
    pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type == 'error' else None)
    pg.goto('http://127.0.0.1:5267/?level=3&fast=1')
    pg.wait_for_function('window.__ready'); time.sleep(0.5)
    pg.screenshot(path=str(out / f'L3_{W}_title.png'))
    pg.click('#btnStart', force=True)
    pg.wait_for_function('window.__pp.G.screen === "game" && !window.__pp.G.busy', timeout=20000)
    time.sleep(0.8); pg.screenshot(path=str(out / f'L3_{W}_a.png'))
    pg.click('#btnDown', force=True); time.sleep(0.2); pg.click('#btnDown', force=True); time.sleep(0.5)
    pg.screenshot(path=str(out / f'L3_{W}_scrolled.png'))
    for k in range(5):
        pg.evaluate('__pp.solveOne()'); time.sleep(0.5)
    print('left', pg.evaluate('__pp.G.left'), 'top', pg.evaluate('__pp.G.top'), 'slots', pg.evaluate('document.querySelectorAll(".slot").length'))
    pg.screenshot(path=str(out / f'L3_{W}_half.png'))
    while pg.evaluate('__pp.G.left') > 0:
        if not pg.evaluate('__pp.solveOne()'): time.sleep(0.2)
        time.sleep(0.45)
    pg.wait_for_selector('#btnNext.show', timeout=15000); time.sleep(0.4)
    pg.screenshot(path=str(out / f'L3_{W}_done.png'))
    b.close()
print('\n'.join(errs) or 'no errors')
