# Phonics Puzzle (파닉스 퍼즐) — 레슨팩 m 단어 직소 퍼즐

교재 **FPR K Unit 1 Lesson 1 (Mm)** 레슨팩(`../공통자료/FP.K.U1L1-lesson-pack`)의 m 그림 단어로 만든 직소 퍼즐.
그림은 레슨팩 단어 그림을 놀이방과 같은 밝은 파스텔 장면 안에 앉힌 것(단어마다 다른 장소)이다. 그림이 먼저 보이고 단어를 들려준 뒤 조각으로 흩어져 PIECES 트레이로 날아간다. 흐린 그림 위에 조각을 끌어다 맞추면
색 폭발·별·음표·+100. 다 맞추면 이음새가 사라지고 단어(m은 분홍)와 "/m/ /m/ 단어" 챈트(팩 음성) → 아이가 단어를 말한다
(맞으면 금색 마이크 +300, 두 번 놓쳐도 "잘했어!" 하고 넘어감, 마이크를 누르면 다시 시도) → 다음.

- 단어 18개 = 팩에서 그림·공식 음성이 있는 m 단어 전부: 활동 단어(A-HN.TW·A-IN.SI·A-IP.SW) 12 + 소리 분류(A-SS.SO)
  mail·mask·match·mice·mouth + 문장 단어 mug. `my`(기능어, 소녀 그림)는 제외.
- 3레벨 × 6그림(게임마다 섞음): 레벨1 2×2, 레벨2 3×2, 레벨3 3×3. 6그림마다 LEVEL CLEAR 카드, 3레벨 끝 ALL CLEAR.
- 디자인 = 사용자 목업 2장(`design/ref_title.png`, `ref_game.png`), 모션 = 참고 영상(`design/ref_motion.mp4`):
  로고 낙하·START 반짝임·탭하는 손 → START 섬광 + 나선(분홍·하늘·금 리본 + 반짝이) → 액자 둘레 반짝이 혜성·HUD 팝업·트레이 슬라이드.
- 상단 바 = 파닉스 공통(Toy Catch): 버튼 높이 7.6u, 가장자리 3u. 왼쪽 점수·레벨, 오른쪽 Restart·소리·나가기. 언어 토글은 타이틀에만.

## 실행
`실행.command` 더블클릭 (또는 `python3 tools/serve.py 5267` → http://127.0.0.1:5267/).
URL: `?fast=1`(연출 단축) `?level=2|3`(그 레벨부터) `?words=moon,map,…`(순서 고정).

## 발음 판정 = phonics-api (파닉스 공통 규칙)
- 타이틀 왼쪽 위 열쇠 버튼 → 키 입력(기기·주소마다 한 번, `localStorage.phonics_api_key`). 점: 민트 = 회사 서버 판정, 모래색 = 기기 안 판정.
  키는 코드·저장소에 넣지 않는다. 팀 키 원문은 `../phonics-api 사용 가이드 (팀 키 포함).html`.
- 마이크는 START 뒤 한 번 묻는다. 말한 소리 → `/v1/speech/analyze` → `PhonicsAPI.judge`(kit)로 18단어 기대 소리열과 비교,
  Eye Catch와 같은 규칙(서버가 다른 단어로 들으면 기기 안 whisper도 다른 단어로 들어야 오답). 키 없음·오프라인·혼잡 → 기기 안 whisper.
- 튜터 대사 EN/KO 15쌍(인사·방법·완성·말해 봐·한 번 더·칭찬 3·잘했어·힌트·앗·레벨 통과·전부 완성·마이크·시작) = 통합 튜터 목소리.
  언어는 타이틀 국기 토글. 단어·/m/ 소리는 언제나 팩 음성(영어).
- `?debug` = 들린 소리·기대 소리·판정을 화면에 표시(kit), `?log=1` = 콘솔, `?fake=1` = QA(`__pp.fake.push('ok'|'unclear'|'silence')`).
- `js/mic.js`, `js/stt.js`+`js/stt-worker.js`+`stt/` = Eye Catch 사본, `js/phonics-api.js` = kit 사본(고치지 말고 kit을 고친 뒤 복사).

## 구조 (빌드 없음, Vanilla JS)
| 파일 | 역할 |
|---|---|
| `js/game.js` | 진행(타이틀 → 전환 → 퍼즐 → 단어 → 레벨 클리어), 드래그·스냅·트레이·힌트 |
| `js/jigsaw.js` | 조각 자르기(이웃 조각이 같은 곡선을 공유), 조각/가이드/힌트 그리기 |
| `js/fx.js` | 파티클(반짝이·별·음표·색종이), 액자 혜성, 나선 리본 |
| `js/audio.js` | 팩 음성(단어·/m/), 합성 효과음(스냅은 조각마다 음이 올라감), 배경음악 |

## 생성물 (손으로 고치지 말 것)
- `assets/pics/*.webp`, `js/words.js` ← `uv run --with pillow python tools/build_pics.py`
  (`assets/scenes/<단어>.jpg` 파스텔 장면을 1200×1000으로 맞춰 자른다. 장면 파일은 이 스크립트가 그리지 않는다.)
- `js/voice.js`, `js/voice-data.js`, `assets/voice/*` ← `uv run --with numpy python tools/build_voice.py`
  (단어·/m/ = 팩 공식 음성, 튜터 대사 = phonics-api TTS 통합 목소리 + whisper 되읽기 검사 30/30 통과. 키 `~/.config/phonics-api/key` 필요)
- `assets/img/*` ← `tools/fill_start.py`(LaMa, START 위 손 지우기) → `tools/cut_art.py`(rembg birefnet: 로고·START·손)
  → `tools/clean_bg.py`(LaMa: UI 지운 배경) → `tools/build_art.py`
- `js/bgm-data.js`, `assets/audio/bgm.mp3` ← `uv run --with numpy --with scipy python tools/make_bgm.py` (C장조 120BPM 자체 곡)

## QA (headless, Playwright 1.62)
- `uv run --with playwright==1.62.0 python tools/qa/shot.py <out> [W H]` — 타이틀→전환→퍼즐→드래그→스냅→오답→완성→힌트→클리어 스크린샷
- `uv run --with playwright==1.62.0 python tools/qa/level3.py <out> W H` — 3×3, 트레이 스크롤, 전부 맞추기
- `uv run --with playwright==1.62.0 --with pillow python tools/qa/swirl.py <out>` — START 전환 프레임
- `uv run --with playwright==1.62.0 python tools/qa/judge_check.py [api|device]` — 팩 녹음 18개를 실제 판정 경로로: 자기 단어 ok,
  다른 단어 불통과여야 함 (2026-11-21 api: 18/18 · 0/18)
