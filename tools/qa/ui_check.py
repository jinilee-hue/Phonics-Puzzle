"""Title (stars, logo motion, parallax), the START exit, the game HUD from the user's button sheet, sound off, clear card,
and a 4:3 window. uv run --with playwright==1.62.0 --with pillow python tools/qa/ui_check.py <out>"""
import sys, time, pathlib
from playwright.sync_api import sync_playwright
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=2)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto('http://127.0.0.1:5267/?fake=1'); pg.wait_for_function('window.__ready'); time.sleep(2.2)
    pg.screenshot(path=str(out / 'u1_title.png'))
    pg.mouse.move(1180, 120); time.sleep(1.2); pg.screenshot(path=str(out / 'u2_parallax.png'))
    pg.click('#btnLang', force=True); time.sleep(0.4); pg.screenshot(path=str(out / 'u3_flag_en.png'), clip={'x': 900, 'y': 0, 'width': 380, 'height': 110})
    pg.click('#btnStart', force=True)
    time.sleep(0.35); pg.screenshot(path=str(out / 'u4_leave.png'))
    pg.wait_for_function('window.__pp.G.screen === "game"', timeout=10000); time.sleep(1.2); pg.screenshot(path=str(out / 'u5_enter.png'))
    pg.wait_for_function('!window.__pp.G.busy', timeout=30000); time.sleep(0.4)
    pg.evaluate('__pp.solveOne()'); time.sleep(0.5)
    pg.screenshot(path=str(out / 'u6_game.png'))
    pg.click('#btnSound', force=True); time.sleep(0.3)
    pg.screenshot(path=str(out / 'u7_hud.png'), clip={'x': 0, 'y': 0, 'width': 1280, 'height': 150})
    pg.click('#btnSound', force=True)
    pg.evaluate('__pp.levelClear()'); time.sleep(1.3); pg.screenshot(path=str(out / 'u8_clear.png'))
    pg.click('#btnHome', force=True); time.sleep(0.8)
    pg.set_viewport_size({'width': 1024, 'height': 768}); time.sleep(1.5); pg.screenshot(path=str(out / 'u9_title43.png'))
    print('flag on:', pg.evaluate("document.querySelector('#btnLang').dataset.l"), '· score text:', pg.evaluate("document.querySelector('#score').dataset.t"))
    b.close()
print('\n'.join(errs) or 'no errors')
