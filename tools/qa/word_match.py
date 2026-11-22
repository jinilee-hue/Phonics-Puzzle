"""Play all 18 puzzles (?fast&fake) and, at every word step, check that the word shown, the picture on the board and the
word said all belong together: the board's finished picture is compared (24x20 thumbnail) with every pack picture —
the nearest must be the word shown; the voice keys played (Sound.say) must include w:<word>.
uv run --with playwright==1.62.0 python tools/qa/word_match.py [base url]
"""
import sys, time
from playwright.sync_api import sync_playwright
base = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5267/'
rows, errs = [], []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(base + '?fast=1&fake=1'); pg.wait_for_function('window.__ready')
    pg.evaluate('''() => { window.__said = []; const s = Sound.say; Sound.say = (k, o) => { __said.push(k); return s(k, o); };
      window.__thumbs = {}; return Promise.all(PP_WORDS.words.map(w => new Promise(r => { const im = new Image(); im.onload = () => {
        const c = document.createElement('canvas'); c.width = 24; c.height = 20; const g = c.getContext('2d'); g.drawImage(im, 0, 0, 24, 20);
        __thumbs[w.w] = g.getImageData(0, 0, 24, 20).data; r(); }; im.src = w.img; }))); }''')
    pg.click('#btnStart', force=True)
    for n in range(18):
        pg.wait_for_function('window.__pp.G.screen === "game" && !window.__pp.G.busy && __pp.G.left > 0', timeout=30000)
        pg.evaluate('__said.length = 0')
        while pg.evaluate('__pp.G.left') > 0:
            if not pg.evaluate('__pp.solveOne()'): time.sleep(0.15)
            time.sleep(0.3)
        pg.wait_for_selector('#btnNext.show', timeout=30000)
        r = pg.evaluate('''() => {
          const c = document.createElement('canvas'); c.width = 24; c.height = 20; const g = c.getContext('2d');
          g.drawImage(document.querySelector('#full'), 0, 0, 24, 20); const a = g.getImageData(0, 0, 24, 20).data;
          const d = Object.entries(__thumbs).map(([w, t]) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i]-t[i]) + Math.abs(a[i+1]-t[i+1]) + Math.abs(a[i+2]-t[i+2]); return [w, s / (a.length / 4 * 3)]; }).sort((x, y) => x[1] - y[1]);
          return { level: document.querySelector('#boardTabTxt').textContent, shown: document.querySelector('#wordBar .word').textContent,
                   board: d[0][0], diff: +d[0][1].toFixed(1), next: d[1][0], nextDiff: +d[1][1].toFixed(1), said: __said.filter(k => k.startsWith('w:')) };
        }''')
        r['ok'] = r['shown'] == r['board'] and ('w:' + r['shown']) in r['said']
        rows.append(r)
        print(f"{r['level']:4s} shown={r['shown']:9s} board={r['board']:9s} (diff {r['diff']}, next {r['next']} {r['nextDiff']}) said={r['said']} {'OK' if r['ok'] else 'MISMATCH'}")
        if n == 17: break
        pg.click('#btnNext', force=True)
        if n % 3 == 2:                                  # (a game = 3 pictures, then the result card)
            pg.wait_for_selector('#clear.show', timeout=15000); time.sleep(0.4); pg.click('#btnGo', force=True)
    b.close()
seen = sorted(r['shown'] for r in rows)
print(f"{sum(r['ok'] for r in rows)}/{len(rows)} OK · distinct words {len(set(seen))} · errors: {errs or 'none'}")
