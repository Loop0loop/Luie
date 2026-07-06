# Settings UI/UX 수정안

> 대상: `src/renderer/src/features/settings/`
> 기준: `DESIGN.md` · 루트 `AGENTS.md` · Vercel Web Interface Guidelines · SaaS 레퍼런스
> 작성: 2026-07-01

---

## 0. 공통 진단 (왜 지금 이렇게 보이는가)

Settings 전체가 **"내부 서브시스템을 그대로 노출한 다이어그램"**이다. 각 탭이
사용자의 과제가 아니라 개발자의 아키텍처를 그대로 옮겨놓았다:

- 글꼴 탭 = 에디터 스토어의 타이포그래피 필드 5개를 +/- 스텝퍼로 나열
- 모델 탭 = 로컬 LLM·HF 라이브러리·임베딩·llmfit·메모리 큐·API키 를 6개 카드로 평탄화
- 복원 탭 = WAL/DB 복구 상태 머신의 현재 상태 한 장면
- 언어 탭 = 버튼 3개 (탭 하나를 차지할 이유가 없음)

DESIGN.md의 북스타("write surface is sacred; chrome recedes")와 **충돌하지는 않지만**
그 원칙이 *에디터*에만 적용되고, 설정 크롬은 다른 앱의 부품을 답습한 느낌이다.
특히 단축키/모델 탭은 "진짜 앱의 표면"을 흉내만 낸 모방형 UI다.

**SaaS 레퍼런스 축:**
- 폰트/타이포그래피 → Google Docs, Notion, Figma (폰트 콤보박스 + 라이브 프리뷰)
- 단축키 레코더 → Linear, Raycast, Obsidian, VS Code (press-to-record + 충돌 검출)
- 버전/복원 → Notion page history, Google Docs version history, Time Machine
- 모델 선택 → Cursor, LM Studio, Ollama Library, Raycast AI (친근한 이름 + 태그 + 고급 분리)
- 테마 → VS Code color theme, Obsidian, GitHub (큐레이션 프리셋 + 스왓치)

---

## 1. 글꼴 탭 (EditorTab.tsx, 485줄)

### 1.1 왜 나쁜가
1. **타이포그래피 값 5개가 +/- 스텝퍼.** 자간 0.01em 단위 버튼 클릭 → 최대치까지
   수십 번 클릭. 연속값에 이산 스텝퍼는 가장 번거로운 입력 방식. 슬라이더가 표준.
2. **시스템 폰트 = 평범한 스크롤 리스트.** "Aa" 한 글자만 렌더, 한글 폰트가 섞임,
   추천/최근 사용 없음, 한글 지원 여부 필터 없음. 한국 웹소설 작가에게 "한글 폰트"
   선택이 폰트 선택의 90%인데 그걸 도와주지 않음.
3. **커스텀 폰트 = CSS font-family 문자열 입력.** 작가는 CSS를 모른다.
4. **미리보기 없음.** 폰트/크기/자간을 바꿔도 "Aa"만 보고, 실제 원고 단락이 어떻게
   보이는지 알 수 없음. 글쓰기 도구에서 가장 중요한 피드백 루프 결여.
5. **구조 파편화.** 프리셋 3장 → "옵션 폰트(Inter)" → 시스템 폰트 → 커스텀 → 맞춤법 →
   스텝퍼 5개로 끝없이 스크롤.

### 1.2 수정안
- **단일 폰트 피커(콤보박스)**로 통합. 폰트명 자체를 해당 폰트로 렌더 +
  "가나다abc 123" 미리보기 표시. 검색 내장. 그룹: `추천(웹소설용 한글)` · `최근` ·
  `시스템`. 추천 그룹에 KoPub Batang / Noto Serif KR / Noto Sans KR / Pretendard /
  나눔명조 등 큐레이션. (SaaS: Notion/Google Docs 폰트 메뉴)
- **라이브 프리뷰 패널**: 현재 타이포그래피로 실제 원고 단락 렌더링. 폰트·간격·크기
  변경이 즉시 반영. **단일 최대 개선 포인트.**
- **슬라이더로 교체**: 크기(12–32px), 행간(1.2–2.4), 자간/어간/문단간격 = `<input type="range">`
  + 수치 표시 + "기본값" 리셋. 스텝퍼는 제거.
- **타이포그래피 프리셋**: "본문용 / 검교정 / 원고지" 1클릭 번들 (폰트+크기+행간+자간 세트).
- **커스텀 폰트 입력은 "고급"으로 강등** 또는 제거(`useSystemFonts`가 이미 설치 폰트를
  스캔하므로 CSS 문자열 입력은 불필요).

### 1.3 우선순위
P0 — 라이브 프리뷰 + 슬라이더 (가장 큰 체감 개선)
P1 — 한글 폰트 추천 그룹이 포함된 통합 피커
P2 — 타이포그래피 프리셋 번들

---

## 2. 단축키 탭 (ShortcutsTab.tsx)

### 2.1 왜 나쁜가
"UI 자체는 나쁘지 않은데 따라하는 느낌"의 정체: **단축키를 텍스트 인풋에 손으로 타이핑**한다.
진짜 단축키 설정 UI는 어디나 press-to-record다. 타이핑 방식은:
- "Mod+K"를 손으로 쳐야 함 (사용자가 문법을 암기)
- 검증 없음 (쓰레기값 입력 가능)
- 충돌 검출 없음 (같은 조합 두 액션에 걸쳐도 조용함)
- blur 시 자동 커밋 (저장 버튼/변경 표시 없음, 예측 불가)

### 2.2 수정안
- **키 캡처 레코더**: 행 클릭 → "단축키를 누르세요…" 캡처 상태 → `onKeyDown`에서
  `e.key` + 보조키를 정규화(`Mod+K` 형식). Esc = 취소, Backspace = 클리어.
- **충돌 검출**: 이미 사용 중인 조합이면 인라인 경고 + "해당 액션으로 이동".
- **행 단위 UX**: ✕(큰 값 지움) · "기본값에서 변경됨" 점 · hover 시 "기본값으로" 버튼.
- 전역 "변경사항 저장/되돌리기" 대신 즉시 적용이면 충돌 표시로 충분.
- SaaS: Linear Shortcuts, Raycast Hotkey, Obsidian, VS Code Keyboard Shortcuts.

### 2.3 우선순위
P0 — press-to-record 캡처 (모방형 → 진짜 기능)
P1 — 충돌 검출

---

## 3. 파일 복원 탭 (RecoveryTab.tsx)

### 3.1 왜 나쁜가
"뭘 제공해주는지조차 모른다." 현재 뷰는 **"지금 복구 가능한 백업이 있는가" 한 장면**이다:
- 무엇이, 언제, 얼마나 자주 백업되는지 안내 없음
- 백업 히스토리/목록 없음 (최신 1개 미리보기만)
- WAL/DB가 뭔지 모르는 작가에게 hero 카피만으로는 역부족
- "기술 세부정보"는 접혀 있는데, 정작 기본 질문("복원이 뭘 해주는가?")이 본문에 없음

### 3.2 수정안
- 탭을 **"백업 및 복원"**으로 리프레임 + 상단 설명 스트립:
  "Luie는 원고를 자동으로 저장합니다. 매 N분마다 / 보관 N일 / 위치: ~/..."
- **백업 타임라인(목록)**: 각 항목 = 타임스탬프 + 프로젝트/챕터 + 발췌 + "이 지점으로 복원".
  최신 1개가 아니라 Time Machine처럼 여러 지점. (SaaS: Notion page history,
  Google Docs version history)
- **현재 문서 vs 선택 복원 지점** 비교 패널 (좌: 현재 / 우: 복원 지점 발췌).
- 자동백업 on/off + 주기 설정 노출 (현재는 불투명).
- 기술 경로/상태머신은 "고급" 그대로 유지.

### 3.3 우선순위
P0 — "무엇이 백업되는가" 설명 스트립 + 백업 목록
P1 — 비교 뷰, 복원 지점 선택

---

## 4. 모델 탭 (ModelTab.tsx + modelTabSections/, **가장 심각**)

### 4.1 왜 나쁜가 — 6개 카드 평탄화의 문제
현재 구조: `LocalLlm` → `ModelLibrary`(HF 검색) → `Embedding` → `Llmfit` → `RebuildMemory` → `ApiKeys`.

1. **웹소설 작가에게 부적합.** 작가가 `cyburn/Qwen3.6-35B-A3B-Claude-4.7-Opus-Reasoning-Distilled-PrismaQuant-4.75bit-vllm`, `mlx-4bit`, `21.36B`, `약 24.5 토큰/초`, `메모리 10.9GB` 를 읽고 모델을 고를 수 없다. 모델 ID·파라미터·퀀트·tok/s·메모리가 전부 노출 원문.
2. **메모리 제구성(RebuildMemoryCard)은 큐 텔레메트리를 인라인으로 덤프.**
   `pending/running/paused/failed/cancel_requested/canceled/RECOVERED_STALE_RUNNING_JOB`
   칩 + jobType/targetType/target 항목이 본문에 깔림. 내부 큐 상태를 그대로.
   → 상세보기 드로어로 빼야 함.
3. **클라우드 API = OpenAI/Gemini 키 입력만.** 커스텀 엔드포인트(OpenAI 호환) 없음,
   사전/고급 분리 없음.
4. **의미검색(EmbeddingCard)이 "이게 뭐지?"**. 임베딩 모델 다운로드 + 상태 점만 있고
   기능 설명이 없음. 작가는 "내 소설에서 비슷한 장면 찾기"를 기대하지 "임베딩/의미검색"을 기대하지 않음.
5. **오프라인 모델 찾기(ModelLibrary + Llmfit)** = HF 리포 검색 + 추천 리스트. 무엇이
   "추천"인지, 내 PC에 돌아가는지 판단이 어려움. → 고급으로.
6. **아이콘이 시바AI 스럽다.** 사이드바 `Bot` 아이콘이 "generic AI 클리셰".

### 4.2 수정안 — 2계층(기본/고급) 재구성
탭명을 **"AI"**로 변경, 아이콘 `Bot` → 작가 문맥 중립 아이콘(`Sparkles`/`Wand2` 또는
`Cpu`). 상단에 **"현재 사용 중인 AI" 요약 배너** (예: "현재: Gemini 2.5 Pro · 클라우드" + 변경).

**기본(Standard) — 안내형 카드 1장:**
> "AI를 어떻게 사용하시겠어요?"
- ☁️ **클라우드(권장)** — 제공자 선택(OpenAI / Google / Anthropic / …) → 키 입력 →
  친근한 모델명 선택("GPT-4o", "Gemini 2.5 Pro") + 한국어 한 줄 설명 + 장점 태그.
- 💻 **내 PC에서 실행(오프라인)** — "추천 모델 설치" 1클릭 (큐레이션 디폴트, 사람 말로
  표현: "Luie 추천 모델 · 약 6GB 필요 · 한글 잘함"). 수동 HF 검색은 고급으로 이동.

**고급(Advanced, 접힘):**
- 커스텀 OpenAI 호환 엔드포인트(base URL + key + model)
- HF 모델 라이브러리 검색(ModelLibraryCard 이전)
- llmfit 추천(LlmfitCard 이전, 여전히 상세 지표는 여기서만)
- 퀀트/파라미터 세부 설정

**메모리 제구성**: 본문엔 진행률 1줄 + "상세보기" 드로어. 현재 상태 칩/큐 텔레메트리는
전부 드로어 안으로 이동.

**의미검색**: "내 소설에서 유사 장면 찾기"로 네이밍 + on/off + 평문 설명.
임베딩 모델 다운로드는 오프라인 설치 흐름에 흡수.

SaaS: Cursor(친근한 모델 선택 + 고급 커스텀 키), LM Studio·Ollama Library(태그/설명
있는 모델 카드), Raycast AI.

### 4.3 우선순위
P0 — 기본/고급 2계층 분리 + 현재-AI 배너 + 친근한 모델 선택
P0 — 아이콘·탭명 교체 (5분짜리, 인지 영향 큼)
P1 — 메모리 제구성 상세 드로어 분리
P1 — 의미검색 네이밍/설명
P2 — 커스텀 엔드포인트

---

## 5. 언어 탭 (LanguageTab.tsx)

### 5.1 왜 나쁜가
탭 전체가 버튼 3개(한/En/日). 1000px 모달의 `p-10` 영역에 3개 버튼 = 공백 과잉.
탭 하나를 차지할 가치가 없음.

### 5.2 수정안
- **사이드바 탭 삭제**. 언어 선택은 Appearance(또는 새 "일반/General" 탭)의 컴팩트
  행으로 흡수. 또는 설정 헤더/푸터에 작은 셀렉터.
- SaaS: Linear(Preferences 한 스크롤 내 언어), Notion(Account 내 언어).

### 5.3 우선순위
P1 — 탭 제거 + Appearance 흡수

---

## 6. 테마 탭 (AppearanceTab.tsx)

### 6.1 왜 나쁜가
"좋긴 한데 애매하다." 컨트롤 자체는 정상이나:
- **조합이 프리셋으로 보이지 않음.** theme × tone × contrast 가 행렬인데 사용자가 머릿속에서
  조합해야 함. "톤 — 쿨/뉴트럴/웜" 버튼에 **색 스왓치가 없어** "웜"이 시각적으로 무엇인지 모름.
- 대비(soft/high)도 마찬가지.
- `uiMode`(레이아웃 5종)가 테마 탭에 섞여 있음 — 이건 appearance가 아니라 레이아웃.
- `entityColors`의 `<input type=color>`가 오프셋 해킹으로 폴리싱 부족.
- 전체 프리뷰 없음.

### 6.2 수정안
- **큐레이션 테마 프리셋** 상단 배치: 명명된 조합을 실제 색 스왓치 카드로.
  예: "Tokyo Night"(dark+cool), "오늘의 원고지"(sepia+warm), "흑백 집중"(dark+high contrast).
  미니 프리뷰 동봉. 세부 토글은 그 아래. (SaaS: VS Code color theme, Obsidian, GitHub)
- tone/contrast 버튼에 **색 점 스왓치** 추가 — 시각적 의미 부여.
- 현재 조합 요약 칩("지금: Dark · 웜 · 일반 대비").
- `uiMode` → 별도 "레이아웃" 탭(또는 Editor 탭)으로 이동. appearance가 아님.

### 6.3 우선순위
P1 — 테마 프리셋 카드 + 스왓치
P2 — uiMode 분리

---

## 7. 교차: Vercel Web Interface Guidelines 위반 (Settings 전체)

DESIGN.md §11이 이미 이 가이드를 프로젝트 규칙으로 채택하고 있으나 설정쪽은 누락 다수:

| 위치 | 위반 | 수정 |
|---|---|---|
| `SettingsModal.tsx:152` 닫기(X) 버튼 | 아이콘 전용 버튼 `aria-label` 없음 | `aria-label={t("close")}` + `title` |
| `LocalLlmCard` 토글, `EditorTab` 스텝퍼/토글, `AppearanceTab` 토글 | `focus:outline-none` without `focus-visible:ring` (일부는 `focus:ring`이라 click에도 발생) | `focus-visible:ring-2 focus-visible:ring-ring` + `outline-none` |
| `EditorTab` 모든 폰트/커스텀 인풋 | `type="text"` + `autocomplete`/`name` 없음 | 적절한 `autocomplete="off"`, 의미있으면 `name` |
| `ApiKeysCard` 인풋 | password 인풋이나 `autocomplete` 없음 | `autocomplete="off"` (비인증 필드 규칙) |
| `ModelLibraryCard` HF 검색 인풋 | placeholder가 `…` 없음, `inputmode` 없음 | `"…"` 종료, 검색이므로 `inputmode="search"` |
| 타양 스텝퍼 +/- 버튼 | 아이콘 전용, `aria-label` 없음, `aria-disabled` 미사용 | 라벨 추가 + `disabled` 시 `aria-disabled` |
| `EditorTab` `transition: color`(명시됨) | OK, 그러나 스텝퍼 교체시 슬라이더는 `transform`/`opacity` 위반 주의 | 슬라이더 도입 시 색상 트랜지션만, 레이아웃 트랜지션 X |
| 색상/타이포그래피 수치 | `tabular-nums` 미사용 | 수치 열에는 `font-variant-numeric: tabular-nums` (가이드: 타이포그래피) |
| 불러오기/저장 상태 | `aria-live` 없음 | 다운로드/복구 진행 영역 `aria-live="polite"` |
| `prefers-reduced-motion` | DESIGN.md §8이 지적한 갭 — OS MQ 미대응 | `@media (prefers-reduced-motion: reduce)` 보강 |

---

## 8. 추진 순서 (권장)

1. **P0 (인지/가치 최대)**: 모델 탭 2계층화 + 아이콘·탭명 / 글꼴 라이브 프리뷰+슬라이더 /
   단축키 press-to-record.
2. **P1 (완성도)**: 복원 백업 목록+설명 / 언어 탭 흡수 / 테마 프리셋+스왓치 /
   모델 메모리 드로어 · 의미검색 네이밍.
3. **P2 (정리)**: 커스텀 엔드포인트 / uiMode 분리 / 타이포그래피 프리셋.
4. **교차(P0~P1)**: Vercel 가이드라인 위반(aria/ring/autocomplete/tabular-nums) 일괄 정리.

각 단계는 DESIGN.md 토큰(`bg-surface`, `rounded-control`, `text-fg`, `z-modal` 등)을
그대로 소비 — 색/반경/폰트 하드코딩 금지 규칙 유지.
