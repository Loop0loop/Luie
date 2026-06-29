# Luie 디자인 / UI·UX 심층 진단 보고서

> 작성일 2026-06-26 · 대상 브랜치 `feat/design` (HEAD `5fcf5b59`) · 근거: 코드 파일 + 외부 레퍼런스 실제 URL 검증

---

## 1. Luie의 현재 디자인 한 문장 정의

> **"Scrivener의 3-패널 뼈대에 iA Writer의 조용한 에디터를 얹었지만, 레이아웃마다·기능마다 서로 다른 앱의 스킨을 벗겨다 붙인, 철학이 5개로 갈린 하이브리드 워크스페이스."**

에디터 한가운데는 조용한 집필 도구이지만, 그 에디터를 둘러싼 4개 레이아웃·연구 패널·캔버스·그래프·프로젝트 셀렉터가 각각 Obsidian · Figma · SaaS 대시보드 · 인쇄용 소설 표지 등 출처가 다른 시각 언어를 함께 쓰고 있다. "한 제품의 여러 모드"가 아니라 "여러 앱의 파편이 한 창에 붙어 있는" 상태.

---

## 2. 현재 디자인 철학

### 2.1 코드에서 확인된 철학 (의도된 철학)

- **Zinc 중성회색 + 단일 액센트 컬러 시스템.** `global.tokens.css`의 `@theme`는 `#ffffff/#f4f4f5/#18181b`(light), `#09090b/#121214/#18181b`(dark)의 단일 스케일 위에 `--color-app/sidebar/panel/surface/canvas/element`의 역할별 배경 토큰을 정의한다. 의도 자체는 Linear/Vercel 류의 절제된 토큰 시스템.
- **역할별 표면 분리.** `bg-app`(캔버스/루트) · `bg-sidebar`(좌측 탐색) · `bg-panel`(우측 인스펙터) · `bg-surface`(헤더/카드) · `bg-canvas`(무한 캔버스) — 5개의 역할이 이름으로 구분되어 있다. 이는 Scrivener의 Binder|Editor|Inspector 3-패널 철학을 토큰 수준에서 구현하려 한 흔적.
- **Dense 컨트롤 스케일.** `button.tsx`는 `default h-8(32px) / xs h-6 / sm h-7`, `badge.tsx`는 `h-5 px-2 text-xs`. Notion/Docs의 h-10(40px)보다 작다. Linear/iA Writer 류의 "조용하고 조밀한 작업 도구"를 지향.
- **한국어 장문 타이포그래피 의도.** `editor.css` 헤더 주석은 line-height 1.9(노벨피아/문피아 기준), letter-spacing 0.02em, word-spacing 0.04em을 명시하고, `--font-serif`를 "KoPub Batang / Noto Serif KR / Nanum Myeongjo" 한국어 우선 체인으로, 타입라이터 스크롤 `scroll-padding-top/bottom: 42vh`를 정의한다.

### 2.2 실제 화면 구현에서 드러나는 철학 (실행된 철학)

의도와 정반대 방향으로 코드가 출혈하고 있다.

- **토큰 우회가 구조화된 영역까지 침식.** `features/research/components/analysisSection/*`(AI 채팅) 전체가 토큰을 무시하고 Tailwind `bg-neutral-800/-850/-900`와 임의 hex `bg-[#2a2a2a]/80`, `bg-[#1a1a1a]/95`를 쓴다. AI 패널 하나가 토큰 시스템에서 통째로 이탈.
- **raw hex / Tailwind 기본 팔레트가 전역에 500+건.** `bg-{color}-{N}` 75건, `border-{color}-{N}` 34건, `text-{color}-{N}` 72건, 임의 hex 336건. 활성 상태(`BinderTabButton.tsx:26` `bg-blue-100 text-blue-600`), diff(`SnapshotDiffModal.tsx:64,68` `bg-red-500/20`), 스플래시(`App.tsx:380` `bg-[#333]`) 등 핵심 상태 표현이 토큰 밖.
- **radius·shadow·z-index는 토큰이 사실상 무력화.** `--radius-control/-panel` `--shadow-sm/md/lg`가 정의되어 있으나 코드는 `rounded-lg ×135, rounded-xl ×49, rounded-md ×95`와 `shadow-xl ×24, shadow-[…] ×24`를 직접 사용. z-index는 토큰이 아예 없고 `z-[9999] ×7`, `z-[10000]`, `z-[9000] ×3`가 경쟁.
- **패널 폭 소스가 2개.** `layoutSizing.ts`(레이아웃 비율 기반)와 `sidebarSizing.ts`(픽셀 기반)가 병존하고, `LEGACY_WIDTH_KEYS_BY_LAYOUT_SURFACE` 마이그레이션 맵이 두 진실을 이어주고 있다.

### 2.3 둘 사이의 불일치 (핵심 간극)

| 축 | 의도(코드 선언) | 실행(실제 사용) | 간극 |
|---|---|---|---|
| 색 | Zinc + 단일 액센트 | 분홍/초록/파랑/인디고 혼용, 5개 액센트 swatch | 철학 붕괴 |
| 표면 역할 | 5개 역할 토큰 | 같은 역할에 `bg-app`/`bg-sidebar`/`bg-surface`/`bg-panel` 뒤섞임 | 경계 모호 |
| 형태 | `--radius-control/-panel` | 5개 라디우스 스케일 무작위 사용 | 시각 밀도 흔들림 |
| 한국어 타이포 | line-height 1.9, 0.02em | **실제 fallback은 1.4, 0.05em, 0.06em** | 헤더 주석과 본문이 모순 |
| 모드 정체성 | "하나의 제품, 4개 모드" | 모드마다 핸들 색·라디우스·로고가 다름 | 4개의 다른 앱 |

**가장 치명적인 불일치**: `editor.css:29` 헤더는 "line-height 1.9"를 선언하지만, `editor.css:94` 실제 fallback은 `1.4`다. 같은 파일 안에서 의도(한국어 장문 줄간격)와 구현(라틴 문서 줄간격)이 26% 간극을 가지고 충돌하고 있다.

---

## 3. 외부 레퍼런스 비교

### 3.1 iA Writer / Pensive 계열 — distraction-free

**검증 URL**: https://ia.net/writer · https://ia.net/writer/support/editor/focus-mode

iA Writer의 철학은 "No buttons, no popups, no title bar"로 요약된다. 핵심 기법: ① 커서가 있는 문장/단락만 밝게 하고 나머지를 dim하는 **Focus Mode**(sentence → paragraph 단위 토글), ② **타입라이터 스크롤**(커서 항상 수직 중앙), ③ 자체 서체 3종(Mono/Duo/Quattro)만 허용하는 **제한적 선택**, ④ 형용사/명사/동사 색 구분 **Syntax Highlight**, ⑤ "메스(scalpel)" 메타포 — 기능 수 자체를 의도적으로 적게 설계.

**Luie와의 차이**: Luie의 `FocusLayout`은 크롬 제거(stealth top bar `opacity-0`/`pointer-events-none`)와 1-패널 구조는 구현했지만, **타입라이터 스크롤이 활성화되지 않는다.** `editor.css`에 `scroll-padding: 42vh`가 정의되어 있으나 FocusLayout은 `data-editor-scroll-container` 속성을 세팅하지 않아 이 규칙이 발화하지 않고, 대신 `flex items-center justify-center`로 수직 중앙 정렬만 한다(이것은 타입라이터 스크롤이 아니다). 또한 **포커스 전용 타이포그래피가 없다** — `font-serif`, `leading-[1.9]`, `tracking-` 등 focus-specific 타입 스케일이 하나도 없고 전역 `editor.css`에 전적으로 위임한다. **문장/단락 dim 기능은 존재하지 않는다.** iA Writer 철학의 "타이포그래피 중심 글쓰기 도구" 부분이 구현되지 않았다.

### 3.2 Scrivener — 장문을 조각으로 관리

**검증 URL**: https://www.literatureandlatte.com/scrivener/overview

Scrivener는 Typewriter + Ring-binder + Scrapbook 세 메타포의 결합이다. 핵심: ① **Binder**로 원고를 임의 크기의 section으로 분해·드래그 재배치, ② **Corkboard/Outliner**로 section마다 인덱스 카드(synopsis)를 1:1 연결해 카드만으로 원고를 재배열, ③ **Scrivenings**로 분리 section을 하나의 연속 문서로 편집, ④ **Inspector**(synopsis/notes/labels/status/keywords/snapshots), ⑤ **Research within reach**(이미지/PDF/웹을 프로젝트 안에 import, 에디터 split), ⑥ **Snapshots + Compare**, ⑦ **Compile**(취향 폰트로 쓰고 제출 폰트로 export). "See the forest or the trees" — 개요와 디테일의 1-클릭 전환.

**Luie와의 차이**: Luie는 Scrivener의 3-패널 뼈대(Binder|Editor|Inspector, `ScrivenerLayout`에 가장 충실)는 갖췄지만, **"조각 관리"의 핵심 기능이 빠져 있다.** ① 사이드바에 **검색이 없다** — 200회차 원고에서 텍스트 필터를 찾을 수 없다. ② **tree/depth/들이켜가 없다** — 모든 챕터 행이 `px-4 py-1.5 pl-9`로 동일 평면(`Sidebar.tsx:130,165,346`). scene/episode 단위의 계층 구조가 존재하지 않는다(types은 `chapter`/`research-item`뿐, `scene` 없음). ③ **씬 메타데이터가 없다** — 워드카운트·상태 배지·synopsis 미리보기·라벨 색이 행에 표시되지 않는다. ④ **코르크보드/아웃라이너 부재.** 결과적으로 Luie의 binder는 "Scrivener처럼 장편 구조 관리를 돕는" 도구가 아니라 "평면적인 챕터 리스트 + 기능 패널 다수"에 그친다.

### 3.3 Ulysses — 조용한 라이브러리

**검증 URL**: https://ulysses.app/ · https://help.ulysses.app/en_US/the-library/ulysses-library

Ulysses는 Library → Groups → Sheets 3계층 구조. 핵심: ① **sheets**는 "제목/파일명이 필요 없는" 가벼운 의미 단위, 분할/병합 자유, ② **Markdown XL**(포맷팅 제거가 아니라 markup으로 치환, "Write first, style later"), ③ **Goals & Deadlines**(sheet/group별 글자수 목표·세션 목표·마감), ④ **Keywords & Filters**, ⑤ **Style Sheet(ulss)**로 export 스타일을 코드처럼 정의. "미니멀한 글쓰기 환경 + 강력한 백엔드 관리"의 결합(Apple Design Award).

**Luie와의 차이**: Luie의 프로젝트/챕터/원고 구조는 "조용한 라이브러리"라기보다 "바쁜 워크스페이스"다. sheet처럼 가벼운 조각 단위가 아니라 챕터가 무거운 파일처럼 취급되고, Markdown XL 식의 "작성과 스타일 분리"보다는 리치 서식 블록(slash command가 h1/h2/quote/callout 등 10개 블록 포맷팅에만 쓰임)이 노출되어 있다. Goals/Keywords/스마트 필터 같은 "라이브러리 관리" 계층이 보이지 않는다.

### 3.4 웹소설 작가용 SaaS / 한국형 집필 환경

**검증 결과 요약** (실제 URL로 확인된 것만):

| 앱 | URL | 핵심 | Luie와의 차이 |
|---|---|---|---|
| **Muvel(뮤블)** | https://muvel.app/info | 에피소드·위키·메모 3계층 + **위젯 시스템**(집중도 측정, 유턴 금지, 속도계, 회차/위키 참조 사이드뷰, 단락 분석-대사/묘사 비, TTS, 상용구) + "불필요한 것은 작업 환경에 두지 마라" | Luie는 **회차 단위 연재 지원·피로/집중 관리 위젯이 전무**. 가장 큰 차별 포인트를 놓침 |
| **Pensive(펜시브)** | https://pensiv.so/ko | 독스·플롯보드·캐릭터·캔버스·폴더 파일타입 분리 + 그래프 뷰 + AI(Ask/Plan/Agent/Review, 프로젝트 단위) + 한국어 맞춤법 + AES/SOC2 | Luie의 캐릭터/사건/세계관은 **"하나의 자료 패널"로 통일되지 않고** EntityManagerShell vs Memo/TermManager로 쪼개짐. 파일타입 분리 철학이 약함 |
| **Novela** | https://novela.so/ko | 모바일 뷰어 모드(독자 화면 미리보기) + 2D 플롯 + 맞춤법 연동 | Luie에 **독자 화면 미리보기/플랫폼별 프리뷰 부재** |
| **Glit(글틴)** | MS Store | "불필요한 도구 걷어내고 글 쓰는 일에만 집중" — 한국형 iA Writer | Luie의 에디터는 조용하지만 주변 패널이 시끄러워 정체성이 상쇄됨 |
| **시공노트 / 불의 검** | — | **비교 불가**. 시공노트는 건설 시공 관리 앱(`com.surtech.sigongnote`)으로 집필 무관. "불의 검"은 프로그램 명칭으로 확인 불가(작품명과 혼동) | — |

**핵심 시사점**: 한국 웹소설 앱의 차별점은 **"연재 작가의 일일 루틴/피로/집중 관리"(Muvel의 위젯 카테고리)** 와 **"독자 화면 미리보기"(Novela)** 다. Luie는 서양 미니멀리즘 앱(iA/Scrivener/Ulysses)의 철학은 부분적으로 차용했지만, 정작 한국 웹소설 작가의 반복 업무를 줄이는 화면 구조(회차 참조 사이드뷰, 집중도/속도계, 단락 분석, 모바일 뷰어)는 전무하다. 이것이 "웹소설 작가용"이라는 제품 포지셔닝과 가장 크게 충돌하는 지점이다.

---

## 4. 불쾌한 골짜기식 디자인 왜곡 원인 (파일 근거)

### 4.1 디자인 철학 혼재 — 한 화면에 5개 출처의 스킨

- **Obsidian 카드보드**: `CanvasActivityShell.tsx:1-2`가 주석으로 "Obsidian 스타일"을 선언, `EntityNode.tsx:3`도 동일. dot grid(`BackgroundVariant.Dots`) 사용.
- **Figma 클론**: `BottomInteractiveToolbar.tsx:5-7`이 주석으로 "Figma 스타일의 세그먼트 모드 토글"을 선언하고, `bg-[#f5f5f5]/95`, `bg-[#0c8ce9]`(Figma 블루) hex를 그대로 사용(`:50-51,69`).
- **Twitch/Discord 네온 분석 대시보드**: `GraphSurface.tsx`의 별자리 등급(prime/major/minor), `PensiveNode.tsx:41-42`의 `shadow-[0_0_22px_rgba(248,113,113,0.7),0_0_10px_rgba(248,113,113,0.4)]` 2중 네온 글로우, `hover:scale-125`, 에지 `animated: true` 흐름 효과.
- **SaaS 글래스모피즘**: `GraphHoverCard.tsx:23`의 `bg-panel/85 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.25)]` + 그라데이션 top-rail.
- **인쇄용 소설 표지**: `TemplateGrid.tsx` NOVEL 프리뷰의 `font-serif text-lg` + `❦` 장식, `group-hover:-translate-y-1.5 group-hover:shadow-xl` 마케팅 호버 리프트.

→ 캔버스 기능 하나 안에 Obsidian + Figma + 네온 대시보드 + 글래스모피즘이 공존. 작가가 한 창에서 느끼는 정체성이 계속 전환된다.

### 4.2 토큰 불일치 — 시각 밀도가 픽셀 단위로 흔들림

같은 "사이드바 리스트 크롬" 역할에 **4개의 다른 토큰**이 사용된다:
- `DocsSidebar.tsx:14` → `bg-app`
- `ScrivenerSidebar.tsx:51,53` → `bg-sidebar`
- `BinderSidebarTabs.tsx:17,30` → `bg-surface`
- `FocusHoverSidebar.tsx:249` → `bg-panel`

같은 "인스펙터 헤더" 역할에 **2개 패딩 토큰** + **2개 라벨 사이즈**:
- `CanvasNodeInspector.tsx` → `px-panel-pad`, `text-[10px] uppercase tracking-widest`
- `GraphNodeInspector.tsx:31,34` → `px-4.5 py-3.5`, `text-[11px] font-black tracking-widest uppercase`

텍스트 토큰도 분기: `CanvasActivityShell.tsx:103`은 `text-fg`, `GraphFilterSidebar.tsx:45`는 `text-sidebar-foreground` — 같은 사이드바 role에 서로 다른 텍스트 토큰.

### 4.3 radius/shadow 과잉 — 작업 앱인데 마케팅 UI처럼

- `AnalysisSection.tsx:189` → `shadow-[0_24px_70px_-15px_rgba(0,0,0,0.7)]` — 앱 전체에서 가장 무거운 70px elevation. SaaS 히어로 카드 수준.
- `PensiveNode.tsx:41-42` → 노드 하나에 2중 네온 글로우(22px + 10px).
- `GraphHoverCard.tsx:23` → 40px 글래스 그림자.
- `TemplateGrid.tsx:62-74` → 카드 호버 시 `-translate-y-1.5 + shadow-xl` 리프트 — 랜딩 페이지 장식.
- 전역 통계: `shadow-xl ×24`, `shadow-[…] ×24`, `rounded-xl ×49`. 토큰(`--shadow-sm/md/lg`)은 사실상 0회 참조.

→ **장식 예산이 반전**되어 있다: 작가가 시간을 보내는 에디터는 무그림자·무그라데이션으로 절제되어 있는데, 참조용 뷰인 그래프가 가장 화려하고 발광하고 애니메이션된다.

### 4.4 패널 개념 혼란 — sidebar/binder/inspector/rail/modal이 시각적으로 안 갈림

코드는 4개 이름을 의도적으로 구분하나 토큰이 겹친다:
- "binder"(`ScrivenerSidebar`)와 "sidebar"(`Sidebar.tsx`)가 같은 `DraggableItem` + `pl-9` 행 패턴 → 사용자가 외관으로 구분 불가.
- `bg-panel`이 Scrivener 인스펙터(`ScrivenerLayout.tsx:399`)와 Focus 호버 사이드바(`FocusHoverSidebar.tsx:249`) 두 무관한 역할에 모두 쓰임.
- 3개 사이드바 bg 처리가 한 캔버스 기능 안에 공존: `CanvasActivityShell`은 `bg-sidebar`, `CanvasStatusBar`는 `bg-sidebar/95`, `GraphFilterSidebar`는 `bg-sidebar`(solid) — 같은 영역에 3种 투명도/솔리드 처리.

### 4.5 정보 밀도 불균형 — 에디터는 조용한데 주변이 갑자기 과장

- 에디터: blockquote `border-left: 3px`, 코드 `border-radius:4px`, 무그림자·무그라데이션.
- Research/Analysis: 사이드바 + 디테일 + 그룹 헤더 + 2단 resizable + 갤러리 그리드 + infobox + 차트. `bg-neutral-900/55`, 70px shadow, `z-[9999]`.
- Graph: 네온 글로우 + `hover:scale-125` + animated edges + emerald pulse.

→ 에디터에서 벗어나는 순간 시각 볼륨이 급등. "조용한 글쓰기 → 시끄러운 자료실" 단차가 너무 크다.

### 4.6 모드 간 정체성 분리 — 4개 레이아웃이 4개 앱

| 단서 | GoogleDocs | Scrivener | Editor | Focus |
|---|---|---|---|---|
| 사이드바 bg | `bg-app`(:146) | `bg-sidebar`(:268) | `bg-sidebar`(:129) | — |
| 콘텐츠 bg | `bg-secondary/30`+`bg-sidebar` | `bg-canvas`(:291) | `bg-app`(:184) | `bg-app` |
| 리사이즈 핸들 hover | **`bg-blue-500/50`**(:159) | `bg-accent` | `bg-accent` | — |
| 크롬 형태 | **`rounded-full` FAB**(:119) | `rounded-md` | rect | `rounded-full` pill |
| 브랜드 로고 | **raw `bg-blue-500`/`bg-white` 바**(Header:69-72) | 없음 | 없음 | 없음 |

GoogleDocs 모드만 **브랜드 blue + 원형 FAB + 인공 로고**를 가져와 다른 앱(구글 docs 모방)처럼 보인다. 같은 "에디터 콘텐츠" 역할이 Editor 모드에선 `bg-app`, Scrivener 모드에선 `bg-canvas` — 다크/세피아 테마에서 드리프트가 발생한다. 모션 타이밍도 GoogleDocs `duration-200` vs Focus `duration-500`으로 다르다.

### 4.7 한국어 장문 타이포그래피 — 선언과 구현의 직접 충돌

`editor.css` 한 파일 안에서:
- **line-height**: 헤더 주석 `:29` = **1.9**, 실제 fallback `:94` = **1.4** (26% 간극)
- **letter-spacing**: 헤더 주석 = **0.02em**, 실제 fallback `:48` = **0.05em**
- **word-spacing**: 헤더 주석 = **0.04em**, 실제 fallback `:49` = **0.06em**

`--font-sans`는 Latin-first(`-apple-system` 우선, 한국어 fallback이 중간)이지만 `--font-serif`/`--font-mono`는 한국어 우선(의도적). max-width는 `.ProseMirror`에 선언되지 않고 컨테이너에 전적으로 위임. 타입라이터 dead-zone(42vh)은 강력한 writer-first 신호이지만, FocusLayout이 `data-editor-scroll-container`를 세팅하지 않아 발화하지 않는다.

---

## 5. 화면별 진단

### 5.1 Workspace Layouts

- **GoogleDocsLayout**: 3-컬럼. 유일하게 `bg-app` 사이드바 + `bg-blue-500` 핸들 + `rounded-full` FAB + 인공 문서 로고(`GoogleDocsHeader.tsx:69-72`). **다른 3모드와 시각 언어가 가장 멂.** 구글 docs 모방이 "하나의 제품 모드"로 통합되지 않았다.
- **ScrivenerLayout**: 3-패널 binder. `bg-sidebar`/`bg-canvas`/`bg-panel`/`bg-surface` 역할 분리가 가장 충실(`:228-407`). 4모드 중 **가장 토큰 일관성이 높음.** 인스펙터 헤더(`:407`)만이 유일한 명명된 "inspector" 개념.
- **EditorLayout**: 2-패널 미니멀. 사이드바 `bg-sidebar`, 콘텐츠 `bg-app`(`:184`). 같은 역할을 Scrivener는 `bg-canvas`로 처리 → 일관성 깨짐. 에디터 카드 `bg-transparent`에 paper/max-width 제약 없음.
- **FocusLayout**: 1-패널 distraction-free. 크롬 제거는 잘 됨(stealth bar `opacity-0`/`pointer-events-none`). **그러나 타입라이터 스크롤 미작동, 포커스 전용 타이포그래피 부재, 문장/단락 dim 없음.** iA Writer 철학의 "껍데기"만 있고 "알맹이(타이포그래피 중심)"는 없다.

**진단**: 뼈대(PanelGroup + `w-1` 핸들)는 공유하나 표면 처리가 4개로 분기. **"하나의 제품 모드"가 아니라 "4개 앱의 모드"로 보인다.** 특히 GoogleDocs 모드가 이질적이다.

### 5.2 Manuscript Sidebar / Binder

- 4개 변형(Sidebar/DocsSidebar/ScrivenerSidebar/BinderSidebar)이 존재하나 **binder ≠ sidebar가 외관으로 안 갈림** — 같은 행 패턴.
- **검색 없음, tree/depth 없음, 씬 개념 없음, 메타데이터 없음, 전용 드래그 핸들 없음.** 200+ 회차 웹소설 탐색에 부적합.
- `ScrivenerSidebar.tsx` CollapsibleSection이 `hover:bg-white/5` raw escape를 쓰는 반면 `DocsSidebar.tsx:22`는 `bg-surface-hover` 토큰 사용 — 같은 기능에 다른 토큰.

**진단**: 웹소설 작가의 "빠른 탐색" 요구에 가장 미달한 영역. Scrivener의 코르크보드/아웃라이너, Muvel의 회차 참조 사이드뷰와 비교하면 구조 관리 기능이 빈약하다.

### 5.3 Slash Command

- `suggestion.tsx`는 캐럿 고정 popup(body append, `zIndex = SUGGESTION_POPUP_Z_INDEX`), 백드롭/스크롤락 없음. **흐름 방해는 낮음.**
- 그러나 **블록 포맷팅 전용**(h1/h2/h3, bullet/number/check/toggle, quote/callout/divider 10개). **삽입/참조/AI/세계관 연결 항목이 없다.** `@mention`, 캐릭터/사건 cite 노드, 인라인 AI 노드가 전부 부재(`editor/`에서 `Extension.create|Node.create` with mention/reference/ai/cite = 0건).

**진단**: "하나의 입력 모델"이 아니다. 삽입/참조/AI/세계관이 slash popup · analysis chat · 우측 ResearchPanel **3개 UI로 흩어져 있다.** 작가가 글쓰기 흐름 안에서 자료를 끌어오는 진입점이 없다.

### 5.4 Settings Modal

- 셸 토큰은 시스템 부합(`SettingsModal.tsx:62-67`: `bg-panel border-border shadow-full rounded-xl`, 좌측 레일 `bg-sidebar w-64`, 활성 탭 `bg-accent text-accent-fg`). **별도 SaaS 대시보드처럼 뜨지는 않음 — 양호.**
- **변형 축이 너무 많음**: theme(3) × themeContrast(2) × themeAccent(5) × uiMode(5) × enableAnimations(2) = 수십~수백 가지 시각 조합. 단일 제품 정체성을 희석.
- `themeTexture/themeTemp`는 commit `e1b48f8b`로 완전 제거됨. 유일한 잔류는 `settings.ts`의 `z.preprocess` 호환 shim(저장된 설정 파싱 방어용) — **기능적 잔류 아님, 의도된 compat.**

**진단**: 모달 자체는 잘 만들어졌으나, **AppearanceTab이 노출하는 변형 축이 제품 정체성의 적(敵)**. uiMode 5개 + theme 3개 조합이 "불쾌한 골짜기"의 근원 중 하나.

### 5.5 Research

- **부분 통일만**: 캐릭터/사건/팩션은 `EntityManagerShell`(`wiki/EntityManagerShell.tsx`)로 하나의 셸을 공유. **그러나 MemoSection과 world/TermManager는 별도 `PanelGroup`+고유 storage key로 이탈** — "자료 패널"이 2가족으로 쪼개짐.
- radius 3종 혼재: research 전역 `rounded-lg ×36 / rounded-xl ×16 / rounded-md ×13`.
- 토큰 누수: `CharacterSidebarList.tsx:38`이 `bg-accent text-white font-bold`(raw `text-white`).
- **에디터보다 시끄러움** — list/detail + 사이드바 + 그룹 헤더 + 갤러리 + infobox + 차트.
- **우측 도킹 흐름은 존재**(`ResearchPanel`이 `GoogleDocsRightPanel`/`WorkspacePanels`의 `rightPanel` region에 마운트, detach 시 `FloatingAnalysisPanel`). 본문을 떠나지 않고 자료 열람은 가능. **그러나 본문 안에서 인라인으로 자료를 인용하는 진입점(`@character`)은 없음** — 자료 참조가 "우측 패널로 시선 이동"을 요구.

**진단**: "자료 패널" 통일이 절반만 됨. 인플레이스 참조는 읽기 전용이고 쓰기(인용) 흐름이 끊김.

### 5.6 Canvas / Graph

- **Obsidian 차용은 얕음**: `CanvasActivityShell` + `EntityNode` + dot grid에만 국한. Graph 모드는 Obsidian의 "잔잔한 카드 보드" 정체성을 완전히 버리고 별자리/네온/Figma 하이브리드로 전환.
- **5개 배경 토큰**(`bg-sidebar/canvas/panel/element/app`) · **3개 라디우스 스케일** · **3개 섀도우 철학**(none / shadow-inner / shadow-xl+blur) · **2개 컬러 시스템**(CSS var vs raw hex `#0c8ce9`)이 한 기능에 공존.
- **장식 반전의 극점**: 정적 캔버스는 앱에서 가장 잔잔한 표면(dot grid + 평면 `bg-canvas` + 무그림자). 그래프 모드는 가장 화려함(2중 네온 글로우, `hover:scale-125`, animated edges, emerald pulse, 글래스모피즘, `Quote opacity-5` 워터마크).

**진단**: 캔버스는 "Obsidian 카드보드 + 별자리 분석 대시보드 + Figma 툴바" 3개 제품 파편이 중첩. 작가용 참조 뷰가 가장 발광한다는 것이 핵심 왜곡.

### 5.7 Project Selector

- **웹소설 첫 진입으로 부적합**: 카테고리가 `novel/script/misc`(서구식 일반). 회차 연재/본편·외전/설정집 분리/1인칭 전개 같은 웹소설 컨벤션 부재. 템플릿은 `novel_basic` 하나 + essay/script/doc뿐.
- **카드가 마케팅 페이지 장식**: `aspect-3/4 rounded-md border border-white/5 shadow-sm group-hover:-translate-y-1.5 group-hover:shadow-xl` — 호버 리프트 + raw white-alpha 보더. NOVEL 프리뷰는 `font-serif` + `❦` 인쇄용 소설 표지 미학. 한국어 샘플/웹소설 훅 없음.
- **3개 스타일링 시스템 혼재**: (1) proper 토큰(`bg-app/sidebar/surface`) (2) raw white-alpha(`border-white/5`) (3) 임의 CSS var(`var(--bg-secondary)`, `--bg-tertiary`, `--border-subtle`). `p-12` 패딩으로 워크스페이스보다 훨씬 공중에 뜬 느낌.
- **온보딩 단절**: 템플릿 선택·최근 열기·복구·첨부가 한 화면의 4개 독립 위젯. **최초 사용자(프로젝트 0개) 경로가 가장 약함** — 복구/첨부 행동이 최근 프로젝트 행의 컨텍스트 메뉴에 숨겨져 있어, 행이 없으면 진입점이 사라진다.

**진단**: 웹소설 작가의 첫 인상이 "일반 소설/대본/문서 작가용 런처"로 들린다. 제품 포지셔닝 불일치.

---

## 6. Luie가 가져야 할 디자인 원칙

### 6.1 Writer-first
에디터가 앱의 주(主) 표면이다. 모든 부차 표면(research/canvas/settings)의 시각 볼륨은 에디터 이하이어야 한다. **장식 예산의 방향을 뒤집어라**: 현재 그래프가 가장 화려한데, 에디터만이 (타이포그래피를 통해) 화려하고 나머지는 평면적이어야 한다. 에디터에 없는 그림자/글로우/그라데이션은 다른 어떤 표면에도 없어야 한다.

### 6.2 Quiet structure
구조(binder/sidebar/inspector)는 존재하되 시각적으로 소리 내지 않는다. **3-패널은 업계 표준**(Scrivener, Muvel, Ulysses 모두 좌=탐색/중=작성/우=메타)이므로 이 뼈대를 따되, 표면 토큰을 단일 소스로 고정한다. 같은 역할 = 같은 토큰. 핸들 색, 라디우스, 크롬 형태가 모드마다 달라지는 일을 없앤다.

### 6.3 Korean long-form typography
한국어 장문은 라틴과 다른 줄간격/자간/어간/폭을 요구한다. **`editor.css`의 주석-구현 모순을 먼저 해결**: line-height 1.9, letter-spacing 0.02em, word-spacing 0.04em으로 선언과 fallback을 일치시킨다. `--font-sans`의 한국어 폰트 우선순위를 올리고, 에디터 max-width를 ch 단위 한국어 최적값으로 고정한다. FocusLayout에 `data-editor-scroll-container`를 세팅해 42vh 타입라이터 스크롤을 실제 발화시킨다.

### 6.4 Contextual panels, not dashboards
자료·설정·분석은 "대시보드"가 아니라 "현재 작성 중인 노드의 맥락 패널"이어야 한다. Research를 `EntityManagerShell` 하나로 완전히 통합하고(Memo/TermManager 이탈을 제거), 글래스모피즘·70px shadow·네온 글로우를 전면 제거한다. 패널의 정보 밀도는 에디터 이하로.

### 6.5 Focus-first / Research-second / Command-third
- **Focus-first**: 작성이 최우선. FocusLayout에 타입라이터 스크롤 + 문장/단락 dim + 포커스 전용 타입 스케일을 추가(iA Writer의 메스).
- **Research-second**: 자료는 우측 맥락 패널로, 에디터를 떠나지 않고.
- **Command-third**: slash command를 **단일 입력 모델**로 확장 — 삽입/참조/AI/세계연결을 한 팔레트에. `@character`/`@event` 인라인 cite 노드를 추가해 글쓰기 흐름 안에서 자료 인용이 가능하게.

---

## 7. 재설계 방향

### 7.1 디자인 토큰 정리
1. **토큰을 소수의 역할로 압축**: `bg-app`(루트/에디터 캔버스), `bg-sidebar`(좌측 탐색), `bg-panel`(우측 인스펙터/패널). `bg-surface`/`bg-element`/`bg-canvas`/`bg-bg-primary`/`bg-bg-secondary` 중복 역할을 하나로 병합. `editor-bg`/`accent-primary` 별칭층 제거.
2. **라디우스 토큰을 2종으로 고정하고 강제**: `--radius-control`(버튼/배지/칩), `--radius-panel`(카드/패널/모달). `rounded-lg/md/xl/sm` Tailwind 직접 사용(135/95/49/30건)을 토큰 참조로 일괄 치환.
3. **섀도우 토큰을 사용하거나 삭제**: 현재 `--shadow-sm/md/lg`가 0회 참조. 작가용 앱이므로 **섀도우를 극소화** — `shadow-panel`(panel용 얕은 것) 1종만 남기고 `shadow-xl/2xl/[…]` 70+건을 제거 또는 토큰화.
4. **z-index 토큰 레이어 신설**: `--z-base/content/overlay/popover/modal/toast` 6단계. `z-[9999]`/`z-[10000]`/`z-[9000]` 난립을 종료.
5. **패널 폭 소스 단일화**: `layoutSizing.ts`와 `sidebarSizing.ts` 둘 중 하나를 진실로 삼고 `LEGACY_WIDTH_KEYS_BY_LAYOUT_SURFACE` 마이그레이션을 완료해 폐기.
6. **액센트 단일화**: 5개 swatch(violet/green/amber/rose/slate)를 기본 1개로 수렴. `global.behaviors.css`의 다중 액센트 정의를 제거.

### 7.2 shadcn/ui 사용 기준
- `components/ui`(shadcn 원자)와 `shared/ui`(앱 복합체)의 분리는 이미 clean — 유지.
- shadcn 원자의 높이/밀도(h-8/h-5)는 writer-first에 부합 — 유지.
- **상태 표현을 토큰으로 강제**: `bg-blue-100 text-blue-600`(BinderTabButton), `bg-red-500/20`(SnapshotDiffModal) 같은 Tailwind 기본 팔레트를 `bg-accent text-accent-fg` / semantic 토큰으로 치환.
- `badge.tsx:12`의 비표준 `rounded-4xl`을 표준 토큰으로 정정.

### 7.3 panel/sidebar/binder/inspector 역할 정의
| 역할 | 위치 | 토큰 | 책임 |
|---|---|---|---|
| **Binder(탐색)** | 좌 | `bg-sidebar` | 챕터/씬/자료 트리 + 검색 + 드래그 재배치 + 메타데이터 |
| **Editor(작성)** | 중 | `bg-app` | 조용한 산문 캔버스, 한국어 장문 타이포 |
| **Inspector(맥락)** | 우 | `bg-panel` | 현재 노드의 메타·연관 자료·인용 |
| **Modal** | 오버레이 | `bg-panel` + `shadow-panel` | 설정/명령 — 드물게, 얕게 |
| **Rail** | 우측 끝 | `bg-sidebar` | 뷰 모드 전환 아이콘 |

현재 `bg-panel`이 인스펙터와 Focus 호버 사이드바(무관 역할)에 모두 쓰이는 혼란, `bg-app`/`bg-sidebar`/`bg-surface`가 같은 사이드바 역할에 뒤섞이는 혼란을 이 표로 수렴.

### 7.4 layout별 시각 언어 통합
- **GoogleDocs 모드의 이질성 제거**: `bg-blue-500` 핸들 → `bg-accent`, 인공 `bg-blue-500/bg-white` 로고 → 제거, `rounded-full` FAB → `rounded-control` 직사각. 사이드바 `bg-app` → `bg-sidebar`.
- **콘텐츠 bg 단일화**: 4모드 모두 에디터 콘텐츠를 동일 토큰(권장 `bg-app`)으로. Editor `bg-app` vs Scrivener `bg-canvas` 분기 제거.
- **크롬 형태 단일화**: 모든 플로팅 버튼을 `rounded-control`(직사각)로. `rounded-full` FAB를 Focus stealth pill 1곳으로 한정.
- **모션 타이밍 통합**: 테마 전환 `duration-200` 하나로.

### 7.5 작가 몰입을 높이는 구체 UI 규칙
1. **FocusLayout에 iA Writer 알맹이 추가**: 타입라이터 스크롤 활성화(`data-editor-scroll-container` 세팅), 문장/단락 dim 토글, 포커스 전용 `font-serif`+`leading-[1.9]` 타입 스케일.
2. **Binder에 웹소설 탐색 추가**: 검색 입력, 씬/회차 depth 트리, 행 메타데이터(워드카운트/상태 배지/synopsis), 전용 `GripVertical` 드래그 핸들.
3. **Slash를 단일 입력 모델로**: `/캐릭터`, `/사건`, `/AI`, `/설정` 항목 추가 + `@character` 인라인 cite 노드.
4. **장식 예산 반전**: 그래프 네온 글로우(`PensiveNode.tsx:41-42`)·animated edges·emerald pulse·`hover:scale-125`·글래스모피즘 전면 제거. 그래프를 평면 dot+line 다이어그램으로.
5. **프로젝트 셀렉터 웹소설화**: 카테고리를 웹소설 컨벤션(연재/본편·외전/설정집)으로, 한국어 샘플 프리뷰, 마케팅 호버 리프트 제거, 최초 사용자 경로에 복구/첨부 가시 진입점 추가.
6. **한국어 피로/루틴 위젯(Muvel 차용)**: 회차 참조 사이드뷰, 글자수 목표, 집중도/속도계, 단락 분석(대사/묘사 비), 독자 화면 미리보기(Novela 차용).

---

## 8. 우선순위 높은 개선 목록

### A. 당장 고칠 것 (high impact · low effort)
1. **`editor.css` 주석-구현 모순 해결** — line-height `1.4→1.9`, letter-spacing `0.05→0.02em`, word-spacing `0.06→0.04em` fallback 정정. (한국어 장문 가독성에 직격)
2. **FocusLayout 타입라이터 스크롤 활성화** — `data-editor-scroll-container` 속성 세팅 한 줄. (이미 42vh 규칙이 존재, 발화만 안 됨)
3. **GoogleDocs 모드 이질성 제거** — `bg-blue-500` 핸들→`bg-accent`, 인공 로고 제거, `rounded-full` FAB→직사각. (4모드 정체성 통합의 최대 효과)
4. **`bg-blue-*`/`bg-red-500`/`bg-green-500` raw 팔레트 치환** — BinderTabButton, SnapshotDiffModal 등 핵심 상태를 토큰으로. (토큰 시스템 회복의 가시적 신호)
5. **AnalysisSection 토큰 이탈修正** — `bg-neutral-*`/`bg-[#2a2a2a]`/70px shadow를 토큰으로. (한 영역이 통째로 시스템 이탈한 것 복귀)

### B. 디자인 시스템으로 묶을 것 (high impact · medium effort)
1. **라디우스·섀도우·z-index 토큰 레이어 신설 + 전역 치환** (`rounded-lg/md/xl` 300+건, `shadow-xl/[…]` 70+건, `z-[9999]` 난립).
2. **패널 폭 소스 단일화** — `layoutSizing` vs `sidebarSizing` 둘 중 하나로.
3. **표면 역할 토큰 압축** — `bg-app/sidebar/panel` 3종으로 수렴, `surface/element/canvas/bg-primary/bg-secondary` 중복 병합.
4. **사이드바 bg 통일** — `DocsSidebar`(bg-app)·`ScrivenerSidebar`(bg-sidebar)·`BinderSidebarTabs`(bg-surface)·`FocusHoverSidebar`(bg-panel)를 단일 토큰으로.
5. **Research 패널 통일** — Memo/TermManager를 `EntityManagerShell`로 흡수.
6. **액센트 5→1 수렴** + AppearanceTab 변형 축 축소(theme × uiMode 조합 최소화).
7. **Graph 장식 제거** — 네온 글로우·animated edges·scale-125·글래스모피즘·`Quote opacity-5` 워터마크 전면 삭제, 평면 다이어그램으로.

### C. 나중에 해도 되는 것 (product-level · high effort)
1. **Binder 웹소설 탐색 기능** — 검색·씬 depth 트리·행 메타데이터·코르크보드/아웃라이너 (Scrivener 차용).
2. **Slash 단일 입력 모델 + `@character` 인라인 cite 노드** — 글쓰기 흐름 안 자료 인용.
3. **FocusLayout 문장/단락 dim + 포커스 전용 타입 스케일** (iA Writer 알맹이).
4. **한국어 루틴/피로 위젯** — 회차 참조 사이드뷰·속도계·단락 분석·독자 화면 미리보기 (Muvel/Novela 차용). **이것이 "웹소설 작가용" 포지셔닝의 실질적 차별점이 됨.**
5. **프로젝트 셀렉터 웹소설 온보딩 재설계** — 카테고리·템플릿·최초 사용자 경로 전면 개편.

---

## 부록: 검증된 외부 자료 출처

- iA Writer: https://ia.net/writer · https://ia.net/writer/support/editor/focus-mode · https://ia.net/writer/how-to/write-with-focus
- Scrivener: https://www.literatureandlatte.com/scrivener/overview
- Ulysses: https://ulysses.app/ · https://help.ulysses.app/en_US/the-library/ulysses-library
- Muvel(뮤블): https://muvel.app/info · https://github.com/KimuSoft/muvel-public
- Pensive(펜시브): https://pensiv.so/ko · https://pensiv.so/ko/blog/writing-program-comparison
- Novela: https://novela.so/ko · Glit: MS Store `9n19p02fc7rf` · Typetak: https://www.typetak.com/ko/blog/webnovel_program
- **비교 불가**: "시공노트"(건설 앱, 집필 무관), "불의 검"(프로그램 명칭 확인 불가)
