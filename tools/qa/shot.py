"""Headless walk-through with screenshots: title → START → puzzle → solve → word → next … (Playwright 1.62)
uv run --with playwright==1.62.0 python tools/qa/shot.py <out dir> [W H] [extra query]
"""
import sys, pathlib, time
from playwright.sync_api import sync_playwright
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
W, H = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (1280, 720)
q = sys.argv[4] if len(sys.argv) > 4 else ''
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=1)
    pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))
    pg.goto(f'http://127.0.0.1:5267/?{q}')
    pg.wait_for_function('window.__ready')
    time.sleep(1.6); pg.screenshot(path=str(out / '01_title.png'))
    pg.click('#btnStart', force=True)
    time.sleep(0.75); pg.screenshot(path=str(out / '02_swirl.png'))
    time.sleep(0.9); pg.screenshot(path=str(out / '03_enter.png'))
    time.sleep(1.6); pg.screenshot(path=str(out / '04_preview.png'))
    pg.wait_for_function('!window.__pp.G.busy', timeout=20000)
    time.sleep(0.3); pg.screenshot(path=str(out / '05_tray.png'))
    # drag the top piece half way (screenshot mid-drag) then drop it right
    box = pg.evaluate('''() => { const G = __pp.G, s = document.querySelector('.slot:not(.gone) canvas'); const r = s.getBoundingClientRect();
        const p = G.pieces[+s.dataset.i], cu = G.cut, br = document.querySelector('#board').getBoundingClientRect(), bs = br.width / 1200;
        return {x: r.left + r.width/2, y: r.top + r.height/2, tx: br.left + (p.c*cu.cw + cu.cw/2)*bs, ty: br.top + (p.r*cu.ch + cu.ch/2)*bs}; }''')
    pg.mouse.move(box['x'], box['y']); pg.mouse.down()
    for i in range(1, 11):
        pg.mouse.move(box['x'] + (box['tx'] - box['x']) * i / 20, box['y'] + (box['ty'] - box['y']) * i / 20); time.sleep(0.02)
    time.sleep(0.25); pg.screenshot(path=str(out / '06_drag.png'))
    for i in range(11, 21):
        pg.mouse.move(box['x'] + (box['tx'] - box['x']) * i / 20, box['y'] + (box['ty'] - box['y']) * i / 20); time.sleep(0.02)
    pg.mouse.up()
    time.sleep(0.42); pg.screenshot(path=str(out / '07_snap.png'))
    time.sleep(1.0)
    # wrong drop: next piece onto the far corner of the board
    pg.evaluate('''() => { const G = __pp.G, s = document.querySelector('.slot:not(.gone) canvas'); if (!s) return;
        const r = s.getBoundingClientRect(), p = G.pieces[+s.dataset.i], br = document.querySelector('#board').getBoundingClientRect();
        __pp.beginDrag(p, r.left + r.width/2, r.top + r.height/2, -1);
        const x = p.c ? br.left + br.width*0.15 : br.right - br.width*0.15, y = p.r ? br.top + br.height*0.15 : br.bottom - br.height*0.15;
        __pp.moveDrag(x, y); __pp.endDrag(x, y); }''')
    time.sleep(0.5); pg.screenshot(path=str(out / '08_wrong.png'))
    time.sleep(0.6)
    while pg.evaluate('__pp.G.left') > 0:
        pg.evaluate('__pp.solveOne()'); time.sleep(0.45)
    time.sleep(0.5); pg.screenshot(path=str(out / '09_done.png'))
    if 'fake' in q:
        pg.wait_for_selector('.mic.listen', timeout=20000); time.sleep(0.3); pg.screenshot(path=str(out / '09b_listen.png'))
        pg.wait_for_selector('.mic.ok', timeout=20000); time.sleep(0.25); pg.screenshot(path=str(out / '09c_ok.png'))
    pg.wait_for_selector('#btnNext.show', timeout=20000)
    time.sleep(0.6); pg.screenshot(path=str(out / '10_word.png'))
    print('level text', pg.inner_text('#levelTxt'), 'score', pg.inner_text('#score'))
    # hint after idle on the next puzzle
    pg.click('#btnNext', force=True)
    pg.wait_for_function('!window.__pp.G.busy', timeout=20000)
    time.sleep(10.2); pg.screenshot(path=str(out / '11_hint.png'))
    # level clear card
    pg.evaluate('__pp.levelClear()'); time.sleep(1.2); pg.screenshot(path=str(out / '12_clear.png'))
    b.close()
print('\n'.join(errs) or 'no console errors')
