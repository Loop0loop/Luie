# Luie 디자인 / UI·UX 심층 진단 보고서

> 근거: 로컬 코드(토큰·레이아웃·컴포넌트 실측) + 외부 레퍼런스(ia.net/writer, literatureandlatte.com/scrivener, ulysses.app) 실측.
> 작성일 2026-06-26.

## 측정된 사실 (먼저 숫자부터)

`src/renderer/src/features` 372개 파일 정적 분석:

| 항목 | 수치 | 의미 |
| --- | --- | --- |
| raw hex (`#rrggbb`) | **170** | 토큰을 우회한 직접 색상 |
| raw 팔레트 색 (`bg-blue-500` 류) | **201** | 디자인 시스템 밖 색 |
| `rounded-xl/2xl/3xl/full` | **171** | SaaS 카드형 곡률 |
| `shadow-lg/xl/2xl` | **38** | 마케팅 그림자 |
| arbitrary `[NNpx]` | **401** | 스케일 무시 매직넘버 |
| arbitrary `[#hex]` | **71** | 인라인 하드코딩 색 |
| Luie 토큰 사용 파일 (`bg-app`/`text-fg`) | **103** | 토큰군 A |
| shadcn 토큰 사용 파일 (`bg-background`/`foreground`) | **43** | 토큰군 B |

핵심: **토큰 시스템은 잘 설계됐는데 화면 코드가 절반만 따른다.** 두 토큰 어휘(A/B)가 공존하고, 위반의 90%가 특정 화면(export, research/analysis, settings, canvas, wiki)에 집중된다. 에디터 본문은 깨끗하다.

위반 집중 파일(핫스팟):
- `export/components/ExportPreviewPanel.tsx` — rawColor 70, arbPx 21 (가장 무질서)
- `canvas/components/viewport/BottomInteractiveToolbar.tsx` — rawHex 41 + 별도 `canvas/types/canvasTokens.ts`(hex 12)
- `settings/components/tabs/AppearanceTab.tsx` — rounded-big 14, rawHex 11
- `research/components/analysisSection/chat/*` — rawColor 다수 (ChatGPT형 컴포저)
- `research/components/wiki/*` — 별도 `--namu-*` 나무위키 테마(블루 `#00a2e8`)

---

## 1. Luie의 현재 디자인 한 문장 정의

> **"조용하고 잘 다듬어진 한국어 집필 에디터 한 채에, 서로 다른 시대·철학의 SaaS 패널들(나무위키 위키, ChatGPT 분석창, Obsidian 캔버스, Linear 설정창)이 증축으로 덧붙은 건물."**

에디터는 단일 철학을 완성했지만, 그 바깥은 기능별로 다른 디자이너가 다른 해에 만든 것처럼 보인다.

## 2. 현재 디자인 철학

### 2-1. 코드에서 확인된 철학 (의도)
- `global.tokens.css`: **Zinc 스케일 + Linear/Vercel 다크**를 명시. 시맨틱 토큰(`bg-app/sidebar/panel/surface/element/active`, `text-primary/secondary/tertiary`)이 정연하게 정의됨.
- `tailwind.config.js`: spacing(`control-x/y`, `panel-pad/gap`, `rail`), radius(`control/panel/shell`), shadow(`panel/modal`), **시맨틱 z-index 레이어**(base→tooltip)까지 토큰화. 설계 의도는 성숙하다.
- `editor.css`: 헤더 주석에 철학이 박혀 있음 — *"CSS가 보이지 않을 때 잘 된 것이다 — 글자만 남아야 한다"*, *"한국어 장문 기준으로 모든 수치를 결정한다"*. line-height 1.9, `word-break: keep-all`, letter/word-spacing, 타이프라이터 스크롤 패딩 42vh. **이건 iA Writer/노벨피아 수준의 진짜 writer-first 타이포그래피다.**

→ 선언된 철학: **"조용한 Zinc 기반 writer-first 도구."**

### 2-2. 실제 화면 구현에서 드러나는 철학 (실태)
- 같은 토큰을 두 어휘로 부른다: `bg-app/text-fg`(103파일) vs shadcn `bg-background/foreground/muted-foreground`(43파일). 브리지는 돼 있어도 화면마다 다른 단어를 쓴다 → 일관성 통제 불능.
- 위반 401건의 arbitrary px, 201건의 raw 팔레트 색이 특정 화면에서 토큰을 통째로 우회.
- `AppearanceTab`이 노출하는 시각 변형 축: `theme, themeTemp, themeContrast, themeAccent, themeTexture, uiMode, enableAnimations, entityColors` — **8축**(코드 상 accent 관련 토큰만 97회 등장). 제품 정체성을 사용자 설정에 외주를 줬다.
- wiki는 나무위키 코스프레, analysis는 ChatGPT 코스프레, canvas는 Obsidian 코스프레.

→ 구현된 철학: **"에디터는 미니멀, 나머지는 기능별 모방 콜라주."**

### 2-3. 둘 사이의 불일치
설계 토큰(의도)은 일관적인데, **화면이 토큰을 신뢰하지 않는다.** 토큰 부족이 아니라 **거버넌스 부재**가 문제다. 그리고 정체성을 사용자 테마 슬라이더(8축)에 위임해버려, "Luie라는 제품이 어떻게 생겼는가"라는 질문에 코드가 답하지 못한다.

## 3. 외부 레퍼런스 비교

### iA Writer / Pensive 계열
- iA Writer 실측: *"Imagine a place where all you can do is write."* — Focus Mode가 **한 문장/구만 강조**하고 나머지를 흐린다. 버튼·타이틀바·팝업 제거가 핵심.
- Luie: `editor.css`의 타이포그래피와 `FocusLayout.tsx`(99줄, 매우 가벼움)는 이 철학을 **실제로 구현**한다. 타이프라이터 패딩 42vh, keep-all, 1.9 행간은 iA Writer보다 한국어에 더 적합.
- 차이: iA Writer는 **앱 전체**가 이 철학인데, Luie는 **에디터 한 화면만** 이 철학이다. FocusLayout은 `bg-background`(shadcn 토큰군)을 쓰고 본문 레이아웃은 `bg-app`(Luie 토큰군)을 써서, 같은 회사 제품 안에서 포커스 모드만 어휘가 다르다.
- ※ "Pensive"는 `editor.css` 주석에 등장하나 명확한 실제 제품/URL 확인 불가 → **비교 불가**로 처리(추측 금지).

### Scrivener
- Scrivener 실측 핵심: **ring-binder 메타포**, Scrivenings(조각을 모아 한 문서처럼 편집), **corkboard 인덱스카드가 원고 구조와 1:1로 묶여 카드 이동 = 원고 재배치**, "research is always within reach"(에디터 4분할), full-screen compose.
- Luie: `manuscript/components`에 `BinderSidebar`, `ScrivenerSidebar`, `DocsSidebar` 등 binder 어휘가 있고 `ScrivenerLayout.tsx`(450줄)에 inspector/ribbon/canvas가 다 들어있다. **구조 관리 의도는 있다.**
- 차이: Scrivener의 binder는 *시각적으로 단일한 ring-binder*인데, Luie는 binder/sidebar/inspector/rail이 **같은 시각 언어로 묶이지 않는다**(아래 4 참조). 또 corkboard처럼 "카드를 옮기면 원고가 재배치"되는 **구조-내용 결합**의 강한 메타포가 없다 — 패널은 많지만 메타포가 약하다.

### Ulysses
- Ulysses 실측: *"The Ultimate Writing App... a pleasant, focused writing experience"*, **단일 라이브러리 + sheet 구조**, 서식 걱정 제거.
- Luie: 프로젝트→챕터→원고 구조는 있으나, 진입점(`ProjectTemplateSelector` + `project-selector/`)이 **템플릿 카드 그리드(SaaS 온보딩)** 형태라 Ulysses 같은 "조용한 라이브러리" 인상이 아니다. `TemplateGrid.tsx`는 카드 나열이지 작가의 서재 느낌이 아니다.

### 웹소설 작가용 SaaS / 한국형 집필 환경
- `editor.css`가 **노벨피아·문피아 본문 기준**을 직접 인용 — 한국 웹소설 가독성 수치를 진지하게 반영. 이건 일반 소설앱이 흉내 못 내는 강점.
- 단, 노벨피아/문피아는 **연재 플랫폼**이지 집필 도구가 아니므로 1:1 UI 비교 대상은 아님. 한국형 전용 집필 SaaS의 단일 표준 레퍼런스는 확정 불가 → 해당 축은 **부분 비교만 가능**.
- ※ 프롬프트의 `muvle` — 실제 제품/URL 확인 불가 → **비교 불가**.
- 회차 관리, 인물 관계, 사건 타임라인, 설정집은 `research/` 안에 다 있으나(아래 5 참조), "반복 업무 축소"보다 "기능 패널 백화점"에 가깝다.

## 4. 불쾌한 골짜기식 디자인 왜곡 원인 (파일 근거)

1. **두 토큰 어휘의 공존** — `bg-app/text-fg`(103) vs `bg-background/text-foreground/muted-foreground`(43). `GoogleDocsLayout.tsx`/`FocusLayout.tsx`는 shadcn 어휘 + `rounded-full` 토글 + `transition duration-200/500`, `MainLayout/Scrivener/EditorLayout`은 Luie 어휘 + `w-1` 리사이즈 핸들. 같은 색을 다른 이름으로 부르니 화면마다 미세하게 다르게 보인다. → 전형적 불쾌한 골짜기.
2. **두 개의 accent 블루** — 앱 accent `#2563eb`(`global.tokens.css`) vs 나무위키 `--namu-blue #00a2e8`(wiki). `research/wiki/Infobox.tsx`가 `border-(--namu-border)`, `bg-(--namu-hover-bg)` 사용. 위키만 다른 브랜드의 파랑.
3. **토큰 우회 핫스팟** — `ExportPreviewPanel.tsx`(rawColor 70/arbPx 21), `BottomInteractiveToolbar.tsx`(rawHex 41 + 독립 `canvasTokens.ts`). 시각 밀도가 화면 단위로 출렁인다.
4. **패널 개념의 시각적 미분화** — `manuscript/components`에 Sidebar/BinderSidebar/DocsSidebar/ScrivenerSidebar/FocusHoverSidebar가 병존. 컨테이너 className이 `bg-sidebar`/`bg-panel`/`bg-surface`로 제각각 → sidebar·binder·inspector·rail이 같은 깊이/곡률/구분선 언어를 공유하지 않음.
5. **정보 밀도 불균형** — editor.css는 침묵(글자만), 반면 `analysisSection/chat/PromptComposer.tsx`는 LLM provider 선택(openai/gemini/ollama), search optimization mode, 전송 버튼까지 **완전한 ChatGPT 컴포저**(rawColor 15). 조용한 본문 옆에 시끄러운 챗봇 SaaS.
6. **설정의 시각 변형 폭발** — `AppearanceTab.tsx` 8축 변형. 제품이 스스로의 외형을 정하지 못하고 사용자에게 떠넘김 → 정체성 희석.
7. **모드 간 정체성 분리** — 4개 layout 중 GoogleDocs/Focus만 shadcn 토큰군·곡률·트랜지션을 쓰고 나머지는 Luie 토큰군. "하나의 제품의 모드"가 아니라 "다른 앱들"로 읽힌다.

## 5. 화면별 진단

### Workspace layouts (`features/workspace/components/layout`)
- `MainLayout`(356L) 표준 3-pane, `ScrivenerLayout`(450L) binder+inspector+ribbon+canvas 풀세트, `EditorLayout`(235L) 미니멀 본문, `FocusLayout`(99L) 순수 집중, `GoogleDocsLayout`(215L) 문서형.
- 모드 의미 자체는 명확(전체작업/구조관리/집필/몰입/문서). 문제는 **시각 언어 분리**: GoogleDocs/Focus(shadcn 어휘) vs 나머지(Luie 어휘). → "한 제품의 4모드"가 아니라 "4개 앱".

### Manuscript sidebar / binder (`features/manuscript/components`)
- 탐색 컴포넌트는 풍부(Binder/Docs/Scrivener/FocusHover + Tabs/PanelBody). 기능적으론 챕터/씬 탐색 가능.
- `Sidebar.tsx`에 arbitrary px 16건 — binder/inspector/rail의 폭·곡률·구분선이 토큰이 아닌 매직넘버로 흩어져 시각적 위계가 흐림. **개념 구분이 코드에 없으니 화면에도 없다.**

### Slash command (`features/editor/components/SlashMenu.tsx`, `suggestion.tsx`, `hooks/useEditorExtensions.ts`)
- 슬래시 입력 모델이 존재(Tiptap suggestion 기반). 본문 흐름 안에서 작동하는 점은 좋음.
- 점검 필요: 삽입/참조/AI/세계관 연결이 **하나의 입력 모델로 통합**되는지 — 현재 analysis(챗 컴포저)와 slash가 별개 입력 경로로 보임. 명령은 하나의 팔레트로 수렴해야 함.

### Settings modal (`features/settings`)
- `SettingsModal.tsx`는 lazy 탭 구조로 깔끔. 그러나 `AppearanceTab`의 8축 변형이 **별도 SaaS 대시보드**처럼 떠 있게 만듦. theme×temp×contrast×accent×texture×uiMode 조합은 제품 정체성을 사용자 설정으로 분산.
- 권고: 변형 축을 2~3개(라이트/세피아/다크 + accent 1세트)로 축소, 나머지는 제거 또는 "고급"으로 격리.

### Research (`features/research`)
- 캐릭터/사건/세력/세계관/위키/분석/메모가 한 폴더에 있으나 **자료 패널로 통일되지 않음**:
  - wiki = `--namu-*` 나무위키 테마(독자 블루/테두리/호버)
  - analysis/chat = ChatGPT형 컴포저(LLM provider, rawColor)
  - world = `DrawingCanvas`/`MindMapBoard`(shadow-lg, rawHex)
- 폼/카드/탭 스타일이 하위 화면마다 다름. 작가가 본문에서 벗어나지 않고 참조하는 흐름이라기보다 **각기 다른 미니앱 모음**.

### Canvas / Graph (`features/canvas`)
- Obsidian Canvas를 `BottomInteractiveToolbar`(rawHex 41)와 독립 `canvasTokens.ts`까지 만들어 차용. 차용 지점은 명확하나 **Luie 토큰과 끊긴다** — 캔버스만 자기 색 체계를 가짐.
- graph/canvas/binder/activity/inspector가 서로 다른 토큰·곡률을 써서 "다른 제품 조각" 인상. 원인 = 캔버스 전용 토큰 파일의 존재 자체.

### Project selector (`ProjectTemplateSelector.tsx`, `project-selector/`)
- `TemplateGrid`(카드 그리드) + category sidebar + `RecentProjectsSection`(rawColor 11) + 복구 흐름.
- 첫 진입이 **SaaS 템플릿 마켓**처럼 보임. 웹소설 작가의 "조용한 서재로 입장"보다 "상품 고르기"에 가까움. onboarding 하나의 서사로 연결 안 됨.

## 6. Luie가 가져야 할 디자인 원칙

1. **writer-first**: editor.css의 침묵을 **앱 전역의 기준선**으로 승격. 모든 화면은 "본문보다 조용해야 한다"가 상한선.
2. **quiet structure**: binder/sidebar/inspector는 구조를 *드러내되 장식하지 않는다*. 곡률·그림자·색 최소화, 위계는 간격과 1px 구분선으로만.
3. **Korean long-form typography**: 이미 강점. 본문 외 영역(research detail, wiki 본문)에도 같은 행간/keep-all/serif 옵션을 확장.
4. **contextual panels, not dashboards**: research/settings/analysis는 "본문 옆 보조 패널"이지 독립 SaaS가 아니다. ChatGPT/나무위키/Obsidian 어휘를 Luie 어휘로 흡수.
5. **focus-first → research-second → command-third**: 시각 강도 위계를 고정. 본문(가장 조용)＜자료 패널＜명령 팔레트(필요할 때만 등장).

## 7. 재설계 방향

### 디자인 토큰 정리
- **단일 어휘로 통일**: shadcn alias(`background/foreground/muted-foreground`)를 Luie alias(`app/fg/muted`)로 흡수하거나 그 역. 둘 중 하나만 남기고 ESLint 규칙으로 강제.
- `--namu-*`, `canvasTokens.ts`, export 패널의 raw 색을 **전부 코어 토큰으로 매핑**. 나무위키 블루 `#00a2e8` 제거 → accent 단일화.
- arbitrary `[NNpx]` 401건을 spacing/size 토큰으로 회수. lint로 신규 유입 차단.

### shadcn/ui 사용 기준
- `components/ui`(button/badge/scroll-area)는 **원자 컴포넌트만**, `shared/ui`(Modal/Toast/Tabs/SearchInput)는 **앱 합성 컴포넌트**로 역할 고정(현재도 대략 이렇게 갈려 있으니 문서화+강제).
- shadcn 기본 곡률/그림자를 writer-first로 다운튠: 기본 radius=`control`(0.625rem) 이하, 그림자는 `panel/modal` 2종 외 금지.

### panel/sidebar/binder/inspector 역할 정의
| 개념 | 배경 토큰 | 위치 | 역할 |
| --- | --- | --- | --- |
| rail | `bg-sidebar` | 최좌측 3rem | 모드 전환 아이콘만 |
| binder | `bg-sidebar` | 좌측 | 원고 구조(챕터/씬) |
| editor | `bg-app` | 중앙 | 본문(가장 조용) |
| inspector | `bg-panel` | 우측 | 현재 선택의 메타/자료 |
| modal | `bg-surface` + `shadow-modal` | 중앙 오버레이 | 설정 등 일시적 |
- 4개를 **동일한 구분선/곡률/간격 언어**로 묶어 시각적으로 구별 가능하게.

### layout별 시각 언어 통합
- 4개 layout이 **같은 토큰군·같은 트랜지션 시간·같은 핸들 스타일**을 공유. 모드 차이는 "무엇을 보여주는가"이지 "어떻게 생겼는가"가 아니어야 함.
- FocusLayout/GoogleDocsLayout의 shadcn 어휘 → Luie 어휘로 교체.

### 작가 몰입을 높이는 구체 UI 규칙
- 본문 영역엔 그림자·곡률·팔레트 색 **0**. (현재 editor.css가 지키는 규칙을 앱 규칙으로)
- 자료 참조는 본문 이탈 없이 inspector/슬래시로. analysis 챗 컴포저는 inspector 폭에 맞춰 톤 다운.
- 명령(slash)·삽입·참조·AI를 **하나의 팔레트 입력 모델**로 수렴.

## 8. 우선순위 높은 개선 목록

### 당장 고칠 것 (정체성 직격, 저비용)
1. **토큰 어휘 단일화** — shadcn vs Luie 둘 중 하나 폐기, lint 규칙 추가. (불쾌한 골짜기 1차 원인)
2. **accent 블루 단일화** — `--namu-blue #00a2e8` 제거, wiki를 코어 토큰으로.
3. **핫스팟 3종 토큰화** — `ExportPreviewPanel`, `BottomInteractiveToolbar`, `AppearanceTab`의 raw 색/arbitrary px 회수.
4. **AppearanceTab 변형 축 축소** — 8축 → 3축(테마3 + accent1세트). 나머지 제거/고급 격리.

### 디자인 시스템으로 묶을 것 (중기)
5. **panel/sidebar/binder/inspector 역할 토큰화** — 위 표를 토큰+컴포넌트로 고정.
6. **4 layout 시각 언어 통합** — 토큰군/트랜지션/핸들 공유.
7. **research를 "자료 패널" 한 언어로** — wiki/analysis/world의 개별 미니앱 스타일을 inspector 언어로 흡수.
8. **명령 입력 모델 통합** — slash + 참조 + AI 단일 팔레트.

### 나중에 해도 되는 것 (장기)
9. **canvas를 코어 토큰에 재편입** — `canvasTokens.ts` 흡수.
10. **project selector를 "서재 입장" 서사로** — 템플릿 마켓 → 최근작업+복구 통합 onboarding.
11. **research 본문에 Korean long-form 타이포 확장** — 본문 외 읽기 영역까지 가독성 통일.

---

### 한 줄 결론
토큰 설계도 좋고 에디터 타이포그래피는 이미 일류다. **문제는 화면이 자기 토큰을 안 믿는 것**이고, 해법은 새 디자인이 아니라 **하나의 어휘로 강제하는 거버넌스**다. 가장 큰 ROI는 1~4번(토큰/accent/핫스팟/설정축)이며, 코드 변경량 대비 정체성 회복 효과가 가장 크다.
