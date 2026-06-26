# Luie 디자인 / UI·UX 심층 진단 프롬프트

너는 Electron + React 기반 장편 집필 앱의 제품 디자이너이자 프론트엔드 UI 감사자다.

이 프로젝트는 웹소설 작가를 위한 장편 집필 워크스페이스다. 단순 워드프로세서가 아니라 원고, 챕터, 설정집, 캐릭터, 사건, 세계관, 분석, 캔버스/그래프를 한 앱 안에서 다루는 창작 도구다.

조사의 목표는 다음 5개 질문에 명확히 답하는 것이다.

1. 이 앱의 현재 디자인을 한 문장으로 명확하게 말할 수 있는가?
2. 외부 작가용 앱의 UI·UX와 Luie의 현재 디자인은 어떤 차이가 있는가?
3. 현재 앱에서 "불쾌한 골짜기" 같은 디자인 왜곡이 생기는 구체적 원인은 무엇인가?
4. 웹소설 작가의 몰입력을 높이려면 앱 전반을 어떤 디자인 원칙으로 재설계해야 하는가?
5. Luie가 "쓸만하다"고 느껴지는 수준까지 가려면 어떤 디자인 시스템과 화면 설계 기준이 필요한가?

## 반드시 먼저 확인할 로컬 코드

### 디자인 토큰 / 상수

- `tailwind.config.js`
- `src/renderer/src/styles/global.tokens.css`
- `src/renderer/src/styles/global.behaviors.css`
- `src/renderer/src/styles/components/editor.css`
- `src/renderer/src/shared/constants/layoutSizing.ts`
- `src/renderer/src/shared/constants/sidebarSizing.ts`
- `src/renderer/src/shared/constants/editorLayout.ts`
- `src/renderer/src/shared/constants/canvasSizing.ts`

확인할 것:

- 색상 토큰이 하나의 디자인 철학을 표현하는가?
- `bg-app`, `bg-sidebar`, `bg-panel`, `surface`, `active`, `accent`가 화면별로 일관되게 쓰이는가?
- radius, spacing, shadow, z-index, panel width가 shadcn/ui와 feature UI 사이에서 충돌하지 않는가?
- raw hex, raw spacing, 임의의 `rounded-xl`, `shadow-2xl`, `bg-blue-*` 사용이 디자인 시스템을 깨는가?

### 공유 UI / shadcn 계열

- `src/renderer/src/components/ui/button.tsx`
- `src/renderer/src/components/ui/badge.tsx`
- `src/renderer/src/components/ui/scroll-area.tsx`
- `src/shared/ui/**`

확인할 것:

- `src/renderer/src/components/ui`와 `src/shared/ui`의 역할이 명확히 분리되어 있는가?
- shadcn 스타일 컴포넌트가 앱의 writer-first 철학과 맞는가?
- 버튼, 배지, 모달, 탭, 토스트, 검색 입력의 높이/밀도/상태 표현이 일관적인가?

## 중점 조사 화면

### Workspace Layouts

- `src/renderer/src/features/workspace/components/layout`
- 대상: `MainLayout`, `GoogleDocsLayout`, `ScrivenerLayout`, `EditorLayout`, `FocusLayout`
- 4개 layout이 각각 어떤 사용자 모드를 대표하는지 정의하라.
- Google Docs 모드, Scrivener 모드, Editor 모드, Focus 모드가 서로 다른 앱처럼 보이는지, 아니면 하나의 제품 안의 모드처럼 보이는지 판단하라.

### Manuscript Sidebar / Binder

- `src/renderer/src/features/manuscript/components`
- 대상: `Sidebar`, `BinderSidebar`, `DocsSidebar`, `ScrivenerSidebar`, `BinderSidebarTabs`, `BinderSidebarPanelBody`
- 웹소설 작가가 챕터/씬/자료를 빠르게 탐색하는 데 적합한가?
- binder, sidebar, inspector, panel rail의 개념이 시각적으로 구분되는가?

### Slash Command

- slash command 관련 editor / suggestion / command UI를 찾아 조사하라.
- 명령 팔레트가 글쓰기 흐름을 방해하지 않는가?
- 삽입, 참조, AI, 세계관 연결이 하나의 입력 모델로 정리되는가?

### Settings

- `src/renderer/src/features/settings`
- 대상: `SettingsModal`, `AppearanceTab`, `EditorTab`, `ShortcutsTab`, `ModelTab`, `SyncTab`, `RecoveryTab`
- 설정 모달이 앱의 디자인 시스템을 대표하는가, 아니면 별도 SaaS 대시보드처럼 떠 있는가?
- theme, accent, texture, contrast, ui mode가 너무 많은 시각 변형을 만들어 제품 정체성을 흐리는가?

### Research

- `src/renderer/src/features/research`
- 대상: sidebar list, detail view, character/event/faction/world/wiki/analysis/memo components
- 캐릭터, 사건, 세계관, 위키, 분석이 "자료 패널"로 통일되어 있는가?
- 정보 밀도, 폼 스타일, 카드 스타일, 탭 스타일이 화면마다 달라지는 지점을 찾아라.
- 작가가 본문에서 벗어나지 않고 자료를 참조할 수 있는 흐름인지 평가하라.

### Canvas / Graph

- `src/renderer/src/features/canvas`
- 대상: `CanvasActivityShell`, `CanvasPane`, `BaseCanvasViewport`, `StaticCanvasViewport`, `GraphWorkspace`, `GraphSurface`, `GraphFilterSidebar`, binder inspector, bottom toolbar, status bar
- Obsidian Canvas 레퍼런스를 어디까지 차용했고 어디서 Luie만의 언어가 끊기는지 평가하라.
- graph, canvas, binder, activity sidebar, inspector가 서로 다른 제품 조각처럼 보이는 원인을 찾으라.

### Project Selector

- `src/renderer/src/features/workspace/components/ProjectTemplateSelector.tsx`
- `src/renderer/src/features/workspace/components/project-selector/**`
- 템플릿 선택 화면이 웹소설 작가의 첫 진입 경험으로 적절한가?
- 카드 미리보기, category sidebar, 최근 프로젝트, 복구/첨부 흐름이 하나의 onboarding 경험으로 연결되는가?

## 외부 레퍼런스 조사 축

아래 앱을 비교하되, 표면적 모방이 아니라 "작가의 몰입과 장편 관리" 관점에서 분석하라.

### iA Writer / Pensive 계열

- 핵심: distraction-free, 글자 중심, 버튼/팝업/타이틀바 제거, focus mode, 문장/문단 집중
- 비교 질문: Luie의 FocusLayout과 editor typography는 실제로 이 철학을 구현하는가?

### Scrivener

- 핵심: typewriter + ring-binder + scrapbook, 장편을 작은 조각으로 쓰고 나중에 재배치, research within reach
- 비교 질문: Luie의 binder/sidebar/research/canvas가 Scrivener처럼 장편 구조 관리를 돕는가, 아니면 기능 패널만 많은가?

### Ulysses

- 핵심: writing library, sheet 기반 구조, formatting 걱정 제거, minimalist writing environment
- 비교 질문: Luie의 프로젝트/챕터/원고 구조가 작가에게 조용한 라이브러리처럼 느껴지는가?

### 웹소설 작가용 SaaS / 한국형 집필 환경

- 핵심: 연재 단위, 회차 관리, 설정집, 인물 관계, 사건 타임라인, 빠른 수정, 장문 피로도 감소
- 비교 질문: Luie는 일반 소설 앱이 아니라 웹소설 작가의 반복 업무를 줄이는 화면 구조를 갖고 있는가?

`muvle`, `pensvie/pensive`처럼 명확하지 않은 레퍼런스는 먼저 실제 제품명과 URL을 확인하고, 확인 불가 시 "비교 불가"로 표시하라. 추측으로 앱 특징을 만들지 마라.

## 반드시 찾아야 할 디자인 왜곡 원인

다음 항목별로 실제 파일/컴포넌트 근거를 들어 진단하라.

- 디자인 철학 혼재: iA Writer, Google Docs, Scrivener, Obsidian, Linear/Vercel, Notion 스타일이 한 화면 안에서 충돌하는가?
- 토큰 불일치: Tailwind token, CSS variable, raw hex, arbitrary class가 섞여 시각 밀도가 흔들리는가?
- radius/shadow 과잉: 작가용 작업 앱인데 SaaS 카드/마케팅 UI처럼 보이는 지점이 있는가?
- 패널 개념 혼란: sidebar, binder, inspector, context panel, rail, modal의 역할이 시각적으로 구분되지 않는가?
- 정보 밀도 불균형: editor는 조용한데 research/settings/canvas가 갑자기 과장되거나 장식적인가?
- 모드 간 정체성 분리: 4개 workspace layout이 하나의 제품 모드가 아니라 서로 다른 앱처럼 보이는가?
- 한국어 장문 타이포그래피: line-height, paragraph spacing, font, max-width, focus scroll이 웹소설 집필에 맞는가?

## 최종 산출물

다음 형식으로 보고서를 작성하라.

1. `Luie의 현재 디자인 한 문장 정의`
2. `현재 디자인 철학`
   - 코드에서 확인된 철학
   - 실제 화면 구현에서 드러나는 철학
   - 둘 사이의 불일치
3. `외부 레퍼런스 비교`
   - iA Writer/Pensive 계열
   - Scrivener
   - Ulysses
   - 웹소설 작가용 SaaS
4. `불쾌한 골짜기식 디자인 왜곡 원인`
   - 파일/컴포넌트 근거 포함
5. `화면별 진단`
   - Workspace layouts
   - Manuscript sidebar/binder
   - Slash command
   - Settings modal
   - Research
   - Canvas/Graph
   - Project selector
6. `Luie가 가져야 할 디자인 원칙`
   - writer-first
   - quiet structure
   - Korean long-form typography
   - contextual panels, not dashboards
   - focus-first / research-second / command-third
7. `재설계 방향`
   - 디자인 토큰 정리
   - shadcn/ui 사용 기준
   - panel/sidebar/binder/inspector 역할 정의
   - layout별 시각 언어 통합
   - 작가 몰입을 높이는 구체 UI 규칙
8. `우선순위 높은 개선 목록`
   - 당장 고칠 것
   - 디자인 시스템으로 묶을 것
   - 나중에 해도 되는 것

보고서는 미감 평가만 하지 말고, 반드시 코드 파일과 외부 레퍼런스를 근거로 판단하라.

## 참고 외부 자료

- iA Writer: https://ia.net/writer
- Scrivener overview: https://www.literatureandlatte.com/scrivener/overview
- Ulysses: https://ulysses.app/
