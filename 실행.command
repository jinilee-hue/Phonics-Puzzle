#!/bin/zsh
# Phonics Puzzle — 더블클릭 실행: 로컬 서버(5267)를 띄우고 크롬으로 연다.
cd "$(dirname "$0")"
PORT=5267
if ! curl -s -o /dev/null "http://127.0.0.1:$PORT/index.html"; then
  nohup python3 tools/serve.py $PORT >/dev/null 2>&1 &
  sleep 0.8
fi
open -a "Google Chrome" "http://127.0.0.1:$PORT/?v=$(date +%s)"
