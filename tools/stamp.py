"""Stamp index.html's css / js links with a content hash (?v=), so an update never mixes a new page with old cached files
(GitHub Pages caches for 10 min: a new index.html with an old style.css showed SKIP as plain text in the corner).
Run before every commit:  python3 tools/stamp.py"""
import hashlib, pathlib, re
R = pathlib.Path(__file__).resolve().parent.parent
p = R / 'index.html'
h = p.read_text(encoding='utf-8')
def stamp(m):
    f = R / m.group(2)
    if not f.exists():
        return m.group(0)
    return f'{m.group(1)}{m.group(2)}?v={hashlib.md5(f.read_bytes()).hexdigest()[:8]}{m.group(3)}'
h2 = re.sub(r'((?:href|src)=")((?:css|js)/[\w.-]+\.(?:css|js))(?:\?v=[0-9a-f]+)?(")', stamp, h)
p.write_text(h2, encoding='utf-8')
print('stamped', len(re.findall(r'\?v=', h2)), 'links')
