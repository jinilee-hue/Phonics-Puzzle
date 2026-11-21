"""The real judging path in the page (no mic): each pack word recording -> Mic.prepare -> judgeSpeech(target), against its
own word (should be ok) and against a different word (should not be ok). mode 'api' puts ~/.config/phonics-api/key into
this headless browser only; 'device' = no key (on-device whisper).
uv run --with playwright==1.62.0 python tools/qa/judge_check.py [api|device]
"""
import json, pathlib, sys, time
from playwright.sync_api import sync_playwright
mode = sys.argv[1] if len(sys.argv) > 1 else 'api'
key = (pathlib.Path.home() / '.config/phonics-api/key').read_text().strip() if mode == 'api' else ''
words = [w['w'] for w in json.loads((pathlib.Path(__file__).resolve().parents[2] / 'js/words.js').read_text().split('=', 1)[1].rstrip().rstrip(';'))['words']]
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.goto('http://127.0.0.1:5267/?fast=1')
    pg.evaluate('k => { if (k) localStorage.setItem("phonics_api_key", k); else localStorage.removeItem("phonics_api_key"); }', key)
    pg.reload(); pg.wait_for_function('window.__ready')
    pg.evaluate('() => { STT.preload(); return PhonicsAPI.init(); }')
    pg.wait_for_function('STT.state === "ready" || STT.state === "error"', timeout=60000)
    print('api status', pg.evaluate('PhonicsAPI.status()'), '· stt', pg.evaluate('STT.state'))
    res = pg.evaluate('''async (words) => {
      const ctx = new AudioContext(), out = [];
      for (let i = 0; i < words.length; i++) {
        const w = words[i], other = words[(i + 5) % words.length];
        const ab = await (await fetch('assets/voice/w_' + w + '.mp3')).arrayBuffer();
        const buf = await ctx.decodeAudioData(ab);
        const pcm = await Mic.prepare(buf.getChannelData(0), buf.sampleRate);
        const self = await __pp.judgeSpeech(pcm, w), by = STT.last && STT.last.by || 'device', heard = STT.last && (STT.last.heard || STT.last.text);
        const cross = await __pp.judgeSpeech(pcm, other);
        out.push([w, self, by, heard, other, cross]);
      }
      return out;
    }''', words)
    ok = sum(r[1] == 'ok' for r in res); bad = sum(r[5] == 'ok' for r in res)
    for r in res:
        print(f'{r[0]:9s} -> {r[1]:8s} ({r[2]}, heard "{r[3]}") | as {r[4]:9s} -> {r[5]}')
    print(f'right word ok {ok}/{len(res)} · other word passed {bad}/{len(res)}')
    b.close()
