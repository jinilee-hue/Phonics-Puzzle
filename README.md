# Phonics Puzzle (파닉스 퍼즐) — 레슨팩 m 단어 직소 퍼즐

교재 **FPR K Unit 1 Lesson 1 (Mm)** 레슨팩(`../공통자료/FP.K.U1L1-lesson-pack`)의 m 그림 단어로 만든 직소 퍼즐.
그림은 레슨팩 단어 그림을 놀이방과 같은 밝은 파스텔 장면 안에 앉힌 것(단어마다 다른 장소)이다. 그림이 먼저 보이고 단어를 들려준 뒤 조각으로 흩어져 PIECES 트레이로 날아간다. 흐린 그림 위에 조각을 끌어다 맞추면
색 폭발·별·음표·+100. 다 맞추면 이음새가 사라지고 단어(m은 분홍)와 "/m/ /m/ 단어" 챈트(팩 음성) → 아이가 단어를 말한다
(맞으면 금색 마이크, 두 번 놓쳐도 "잘했어!" 하고 넘어감, 마이크를 누르면 다시 시도) → 다음.

## 별과 스티커북 (점수 대신, 2026-11-22 사용자 선택)
- 레벨: 퍼즐판 왼쪽 위 LEVEL 탭(레벨-그림 번호 + 조각 격자 + ⌄)을 누르면 레벨을 고른다(깬 레벨 다음까지 열림). 타이틀은 START만 — 저장된 레벨부터 이어 한다(사용자 2026-11-22).
- 그림마다 별 최대 3개: ① 완성 ② 틀린 자리 없이 ③ 단어를 맞게 말함(판정할 수 없으면 ③은 없음). 왼쪽 위 점수판에 합계와 이 그림의 3칸이 함께 있다 — 받으면 칸이 켜지고 합계가 바로 오른다(사용자 2026-11-22: "별 획득은 위에 점수판이랑 합칠수 없어?").
- 결과 카드: 큰 별 = 레벨 18개 중 16+ → 3개, 10+ → 2개, 그 밖 1개. 그림마다 받은 별 표시.
- 완성한 그림 = 타이틀 왼쪽 위 '스티커북'(n/18)의 스티커. 별 3개면 금테, 누르면 "/m/ /m/ 단어". 기기에 저장(`localStorage.ppStickers`, 최고 별 수).

- 단어 18개 = 팩에서 그림·공식 음성이 있는 m 단어 전부: 활동 단어(A-HN.TW·A-IN.SI·A-IP.SW) 12 + 소리 분류(A-SS.SO)
  mail·mask·match·mice·mouth + 문장 단어 mug. `my`(기능어, 소녀 그림)는 제외.
- 3레벨 × 6그림(게임마다 섞음): 레벨1 2×2, 레벨2 3×2, 레벨3 3×3. 6그림마다 LEVEL CLEAR 카드, 3레벨 끝 ALL CLEAR.
- 디자인 = 사용자 목업 2장(`design/ref_title.png`, `ref_game.png`), 모션 = 참고 영상(`design/ref_motion.mp4`):
  로고 낙하·둥실거림·빛줄기, 배경 별 반짝임·느린 드리프트(마우스 시차), START 반짝임·탭하는 손 → START 금색 반짝이 + 로고가 떠오르며 퇴장
  (색 회오리는 사용자 요청으로 뺌) → 액자 둘레 반짝이 혜성·HUD 팝업·트레이 슬라이드.
- 버튼 = 사용자 시트 `design/puzzle_assets.png`를 `tools/cut_buttons.py`로 잘라 그대로(`assets/img/ui`): LEVEL 배지·위/아래. 점수 = 시트 트로피(`tools/cut_trophy.py`) + 둥근 상자,
  소리·나가기·키는 시트의 빈 분홍 젤리 + 같은 아이콘 그림체. 점수·레벨 글자는 빈 리본 위에 실시간으로 쓴다.
  게임: 왼쪽 레벨·점수, 오른쪽 소리·나가기 / 타이틀: 왼쪽 키, 오른쪽 언어 토글(파닉스 공통 토글, 분홍)·소리·나가기.
  높이 7.6u, 가장자리 3u(파닉스 공통). 시트의 Home·Restart·뒤로·일시정지·설정·국기는 잘라만 둠.
- 튜터 = 사용자 토끼(`design/puzzle_tuter.png`). `tools/build_tutor.py`가 몸통·두 귀·두 눈썹으로 나눈다(무손실, 원래 눈·입·눈썹
  자리는 피부로 채움). 눈·입은 SVG(index.html .face): 눈 깜빡임·조각 따라보기, 입은 음성 크기를 따라 벌어짐.
  표정 6가지(smile·happy·wow·wink·cheeky·oops) — 대사마다 바뀌고, 맞히면 happy, 틀리면 oops, 힌트는 cheeky.
  QA: `uv run --with playwright==1.62.0 --with pillow python tools/qa/tutor_faces.py <out>`
- 손 = 파닉스 공통 흰 손(`../Toy-Catch/assets/img/hand.webp`, Croco·Match·Magic Block과 같은 파일, 손끝 38%·2%).
  액자 별 = `assets/img/ui/frame_star.svg`(둥근 볼록 별), 모서리 별은 둥근 모서리 안쪽으로.

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
  → `tools/build_art.py`. 배경·로고 = 사용자 파일 `design/puzzle_bg.png`·`design/puzzle_logo.png`(다운로드, 2026-11-21 교체;
  전에는 `tools/clean_bg.py`로 목업에서 UI를 지운 배경과 목업에서 자른 로고)
- `js/bgm-data.js`, `assets/audio/bgm.mp3` ← `uv run --with numpy --with scipy python tools/make_bgm.py` (C장조 120BPM 자체 곡)

## QA (headless, Playwright 1.62)
- `uv run --with playwright==1.62.0 python tools/qa/shot.py <out> [W H]` — 타이틀→전환→퍼즐→드래그→스냅→오답→완성→힌트→클리어 스크린샷
- `uv run --with playwright==1.62.0 python tools/qa/level3.py <out> W H` — 3×3, 트레이 스크롤, 전부 맞추기
- `uv run --with playwright==1.62.0 --with pillow python tools/qa/swirl.py <out>` — START 전환 프레임
- `uv run --with playwright==1.62.0 --with pillow python tools/qa/ui_check.py <out>` — 타이틀·전환·HUD·소리 꺼짐·클리어 카드·4:3
- `uv run --with playwright==1.62.0 python tools/qa/word_match.py [url]` — 18판 전부: 보이는 단어 = 판 위 그림 = 들려준 단어
- `uv run --with playwright==1.62.0 python tools/qa/judge_check.py [api|device]` — 팩 녹음 18개를 실제 판정 경로로: 자기 단어 ok,
  다른 단어 불통과여야 함 (2026-11-21 api: 18/18 · 0/18)
