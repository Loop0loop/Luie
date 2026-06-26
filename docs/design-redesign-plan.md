# Luie 디자인 시스템 재설계 — 원인 분석 & 단계별 실행 계획

> 근거 문서: [design-audit-report.md](./design-audit-report.md)
> 작성일 2026-06-26 · 측정 기준 commit `c3413545`

---

## 0. 한 줄 전제

**토큰 설계와 에디터 타이포그래피는 이미 일류다. 문제는 "새 디자인 부재"가 아니라 "화면이 자기 토큰을 안 믿는 거버넌스 부재"다.**
→ 따라서 이 계획은 *그리기*가 아니라 *강제하기(enforcement)* 중심이다.

---

## 1. 왜 이런 현상이 생기는가 (근본 원인)

### 원인 A — 토큰 어휘가 둘이다 (가장 큰 원인)
- `bg-app/text-fg` 계열(Luie 어휘) 사용 파일 **103개**
- `bg-background/foreground/muted-foreground` 계열(shadcn 어휘) 사용 파일 **43개**
- 둘 다 `global.tokens.css`에서 같은 CSS 변수로 브리지되지만, **개발자가 어느 단어를 쓸지 합의가 없다.**
- 결과: 같은 색을 다른 이름으로 부르며, 레이아웃이 이 선을 따라 갈라짐(GoogleDocs/Focus = shadcn, Main/Scrivener/Editor = Luie).

> **왜 발생했나:** shadcn/ui 컴포넌트를 도입하면서 그 토큰 네이밍(`background/foreground/muted`)이 들어왔고, 기존 Luie 토큰(`app/fg/panel`)을 폐기하지 않은 채 병존시켰다. "둘 다 동작하니까" 누구도 정리하지 않음.

### 원인 B — 토큰을 강제하는 장치가 없다
- arbitrary `[NNpx]` **401건**, raw 팔레트 색(`bg-blue-500` 류) **201건**, raw hex **170건**, arbitrary `[#hex]` **71건**.
- lint 규칙이 없어 토큰 우회가 PR마다 자유롭게 유입됨.

> **왜 발생했나:** 토큰은 "권장"이지 "강제"가 아니었다. 급할 때 `[14px]`, `#00a2e8`를 직접 박는 게 더 빨랐고 막는 게이트가 없었다.

### 원인 C — 기능별로 "다른 앱"을 모방했다
- wiki = 나무위키 코스프레 (`--namu-*` 독자 블루 `#00a2e8`, 독자 테두리/호버)
- analysis = ChatGPT 코스프레 (`PromptComposer`: LLM provider 선택 + 검색모드 + 전송버튼)
- canvas = Obsidian 코스프레 (`BottomInteractiveToolbar` rawHex 41 + 독립 `canvasTokens.ts`)

> **왜 발생했나:** 각 기능을 만들 때 "그 분야 1등 제품"을 레퍼런스로 삼아 **시각까지 통째로 가져왔다.** 기능 차용은 옳지만 시각 어휘를 Luie로 흡수하는 단계를 건너뜀.

### 원인 D — 제품이 자기 외형을 사용자에게 외주
- `AppearanceTab`이 노출하는 시각 변형 축 **8개**: `theme, themeTemp, themeContrast, themeAccent, themeTexture, uiMode, enableAnimations, entityColors`.
- 변형 조합이 폭발하면 "Luie는 어떻게 생겼다"가 정의 불가능해짐.

> **왜 발생했나:** "유연성/커스터마이즈"를 기능으로 추가하다 정체성을 희생. 제품이 정해야 할 것을 옵션으로 떠넘김.

### 원인 E — 패널 개념이 코드에 정의돼 있지 않다
- `manuscript/components`에 Sidebar/BinderSidebar/DocsSidebar/ScrivenerSidebar/FocusHoverSidebar 병존.
- 컨테이너가 `bg-sidebar`/`bg-panel`/`bg-surface`를 제각각 사용, arbitrary px 흩어짐.

> **왜 발생했나:** rail/binder/inspector/modal의 역할-토큰 매핑이 문서·코드 어디에도 없어, 각 컴포넌트가 그때그때 배경을 골랐다.

---

## 2. 지금 무엇이 부족한가 (현재 갭)

| # | 부족한 것 | 현재 상태 | 있어야 할 상태 |
| --- | --- | --- | --- |
| G1 | **단일 토큰 어휘** | 어휘 2종 병존(103 vs 43) | 1종으로 통일 |
| G2 | **토큰 강제 게이트** | lint 규칙 없음 | raw hex/색/arbitrary px 금지 lint |
| G3 | **단일 accent** | 블루 2종(`#2563eb`/`#00a2e8`) | accent 1세트 |
| G4 | **패널 역할 정의** | 암묵적, 매직넘버 | rail/binder/editor/inspector/modal 역할-토큰 표 |
| G5 | **레이아웃 시각 통합** | 4모드가 다른 어휘 | 같은 토큰·트랜지션·핸들 공유 |
| G6 | **자료 패널 단일 언어** | wiki/analysis/canvas 제각각 | inspector 한 언어로 흡수 |
| G7 | **명령 입력 통합** | slash와 analysis 분리 | 단일 팔레트 입력 모델 |
| G8 | **절제된 설정** | 시각 변형 8축 | 3축(테마3 + accent1) |
| G9 | **온보딩 서사** | SaaS 템플릿 마켓 | "서재 입장" 흐름 |

---

## 3. 단계별 실행 계획 (Phase)

각 Phase는 **이전 Phase 없이는 다음이 무의미**하도록 의존 순서로 배치했다.
원칙: **저비용·고정체성 영향(원인 A/B/C/D)을 먼저, 구조 재편은 나중.**

### Phase 0 — 측정 기준선 고정 *(0.5d)*
- **목표:** 회귀 방지용 베이스라인 스냅샷.
- 작업:
  - 현재 위반 카운트를 스크립트로 고정(`raw hex 170 / raw color 201 / arbitrary px 401 / shadcn파일 43 / luie파일 103`).
  - CI에 "위반 수 증가 시 실패" 체크 추가(상한선 = 현재값, 이후 단조 감소만 허용).
- **검증:** 스크립트가 현재 수치를 출력하고, 일부러 raw hex 1개 추가 시 CI 실패.
- **해소 갭:** G2(부분)

### Phase 1 — 토큰 어휘 단일화 *(2~3d)* ★최우선
- **목표:** 원인 A 제거. 어휘 2종 → 1종.
- 결정 필요(아래 4. Decisions 참조): **Luie 어휘(`app/fg/panel`) 유지**를 기본 권장.
- 작업:
  - shadcn alias 사용 43파일을 Luie alias로 codemod(`bg-background`→`bg-app`, `text-foreground`→`text-fg`, `text-muted-foreground`→`text-muted` 등).
  - `global.tokens.css`에서 폐기 alias를 deprecated 주석 처리(후속 제거).
  - `GoogleDocsLayout`/`FocusLayout`의 트랜지션 시간(200/500ms)을 표준값 하나로 통일.
- **검증:** `bg-background|text-foreground|muted-foreground` grep 결과 0. 4개 레이아웃 스크린샷 비교 시 같은 색 체계.
- **해소 갭:** G1, G5(부분)

### Phase 2 — accent·테마 색 단일화 *(1~2d)*
- **목표:** 원인 C(색)·D 부분 제거.
- 작업:
  - `--namu-blue #00a2e8` 및 `--namu-*` 테마를 코어 토큰으로 매핑(위키 → accent/border/surface 사용).
  - `AppearanceTab` 변형 축 8 → 3(라이트/세피아/다크 + accent 1세트). 나머지(temp/contrast/texture/uiMode)는 제거 또는 "고급"으로 격리.
- **검증:** wiki에서 `--namu-` 참조 0. 설정 화면에서 노출 축 3개.
- **해소 갭:** G3, G8

### Phase 3 — 핫스팟 토큰화 *(2~3d)*
- **목표:** 원인 B 본격 회수. 위반 집중 파일부터.
- 대상(위반량 순):
  1. `export/components/ExportPreviewPanel.tsx` (rawColor 70, arbPx 21)
  2. `canvas/components/viewport/BottomInteractiveToolbar.tsx` (rawHex 41) + `canvas/types/canvasTokens.ts` 흡수
  3. `settings/components/tabs/AppearanceTab.tsx` (rounded-big 14, rawHex 11)
  4. `research/components/analysisSection/chat/*` (rawColor 다수)
  5. `research/components/wiki/*`
- 작업: raw 색→토큰, `[NNpx]`→spacing/size 토큰, `rounded-xl/full`/`shadow-lg`→`control/panel` 토큰.
- **검증:** Phase 0 스크립트 수치 대폭 감소(목표: arbitrary px <100, raw color <50).
- **해소 갭:** G2, G6(부분)

### Phase 4 — 패널 역할 시스템 *(3~4d)*
- **목표:** 원인 E 제거. 개념을 코드로.
- 역할-토큰 표 확정 후 강제:

  | 개념 | 배경 | 위치 | 역할 |
  | --- | --- | --- | --- |
  | rail | `bg-sidebar` | 좌 3rem | 모드 전환 아이콘 |
  | binder | `bg-sidebar` | 좌 | 원고 구조 |
  | editor | `bg-app` | 중앙 | 본문(가장 조용) |
  | inspector | `bg-panel` | 우 | 선택 메타/자료 |
  | modal | `bg-surface`+`shadow-modal` | 오버레이 | 일시적 |

- 작업: manuscript sidebar 컴포넌트들이 표를 따르도록 정리, arbitrary px 회수.
- **검증:** 5개 개념이 동일 곡률/구분선/간격 언어 공유. 스크린샷 위계 명확.
- **해소 갭:** G4, G5

### Phase 5 — 자료 패널 & 명령 통합 *(4~5d)*
- **목표:** 원인 C(시각) 마무리 + 입력 모델 정리.
- 작업:
  - research(wiki/analysis/world)를 inspector 언어로 흡수 — 카드/폼/탭 스타일 단일화.
  - analysis 챗 컴포저를 inspector 폭·톤에 맞춰 다운튠(ChatGPT 인상 제거).
  - slash + 참조 + AI를 단일 팔레트 입력 모델로 수렴(`SlashMenu`/`suggestion` 기반 확장).
- **검증:** research 하위 화면들이 동일 폼/카드 스타일. 명령 진입점 1개.
- **해소 갭:** G6, G7

### Phase 6 — 온보딩 & 마감 *(2~3d)*
- **목표:** 첫 인상까지 정체성 일관.
- 작업:
  - project selector를 "서재 입장"(최근작업 + 복구 통합) 서사로 재구성.
  - research 읽기 영역에 Korean long-form 타이포 확장(본문 외에도 행간/keep-all/serif 옵션).
- **검증:** 진입~집필~자료참조 전 구간 동일 시각 언어.
- **해소 갭:** G9 + 전반 마감

---

## 4. 결정 사항 (Decisions) — 확정됨 2026-06-26

| # | 결정 | 확정값 | 이유 |
| --- | --- | --- | --- |
| D1 | 남길 토큰 어휘 | ✅ **Luie(`app/fg/panel`)** | 사용량 우세, 도메인 의미 명확. shadcn long-form → Luie 단축형 변환 |
| D2 | 설정 축 처리 | ✅ **3축으로 제거** | 테마3 + accent1만. temp/contrast/texture/uiMode 제거 |
| D3 | canvasTokens.ts | 코어로 흡수 (Phase 3) | 캔버스만의 색 체계가 분리 원인 |
| D4 | shadcn 곡률/그림자 | 다운튠(radius≤`control`, shadow 2종) | writer-first 상한선 |

### Phase 1 정밀 스코프 (인벤토리 후 수정)
shadcn 어휘 대부분은 `global.tokens.css @theme`에서 Luie 단축형과 **동일 CSS 변수**로 브리지됨 → 변환 시 시각 변화 0.

**안전 변환(동일 변수 검증 완료):**
- `text-muted-foreground` → `text-muted` (105회)
- `text-foreground` → `text-fg` (74회)
- `bg-background` → `bg-app` (26회)
- `*-accent-foreground` → `*-accent-fg` (4회)
- `*-destructive` → `*-danger` (17회, `destructive-foreground` 제외)

**제외:**
- `components/ui/*` 원자(button/badge/scroll-area): shadcn primitive 레이어 → 유지(D4 다운튠만).
- `bg-secondary`/`text-secondary`: Luie 단축형 부재 → 보류.

### ⚠ Phase 2 조사 중 정정된 사실 (중요)
처음엔 `surface`를 "`@theme` vs `tailwind.config.js` 이중 정의 충돌"로 봤으나, 실측 결과 **충돌은 없다**:
- 이 프로젝트는 **Tailwind v4**(`@tailwindcss/postcss` 4.3.1)이고 `global.css`에 **`@config` 디렉티브가 없다.**
- v4는 `@config` 없으면 **`tailwind.config.js`를 로드하지 않는다.** → `tailwind.config.js`는 **통째로 죽은 파일**.
- 따라서 모든 색/유틸은 `global.tokens.css`의 `@theme`에서만 생성. `bg-surface`=`--bg-surface`로 일관 해석됨(충돌 없음). 모든 테마는 `[data-theme]` CSS 변수 재정의로 작동.

**대신 진짜 버그 발견:** `tailwind.config.js`에만 있는 토큰 클래스가 **죽은 클래스**(CSS 미생성):
`rounded-control`(28회), `rounded-panel`(1), `shadow-panel`(2), `z-dropdown`(3), `p-panel-pad`(2), `gap-panel-gap`(1) 등 → 해당 요소들이 의도한 곡률/그림자/간격/z-index를 **조용히 못 받고 있음**.
→ **Phase 2b(신설)**: 사용 중인 config 토큰을 `@theme`로 이관 + `tailwind.config.js` 삭제. 단 `rounded-control` 등 28곳이 의도대로 곡률을 "되살아나" **눈에 보이는 변화**가 생기므로 별도 승인 후 진행.

### 후속 정리 완료 (2026-06-26)
D2에서 inert로 남겼던 `themeTemp`/`themeTexture` 필드를 **완전 삭제** + i18n 미사용 키 제거.
- 스키마: `editorSettingsSchema`를 `z.preprocess`로 감싸 **legacy 키(themeTemp/themeTexture)를 strict 검증 전에 strip** → 기존 사용자의 저장 설정이 reset되지 않고 그대로 파싱됨(strictObject + safeParse-fallback 구조라 필수). strict 검증은 그 외 unknown 키에 대해 유지.
- 필드 제거: `types/settings.ts`(필드+`ThemeTemperature`/`ThemeTexture` 타입), `types/index.ts`(re-export), `constants/editor/defaults.ts`, main `settingsDefaults.ts`, `editorStore`(상태/normalizer/import), `uiModeIntegrity`(스냅샷 3곳).
- i18n: ko/en/ja `Settings.ts`에서 `appearance.texture`/`appearance.atmosphere` 키 제거(3개 로케일 대칭).
- 검증: `tsx` 런타임 테스트로 **legacy 설정 파싱+strip+kept 필드 보존+unknown 거부** 확인 · `tsc` clean · `pnpm build` exit 0 · 가드 green · i18n parity는 기존 144개 diff(무관) 외 신규 0.
- 남은 후속: preprocess strip 셤은 저장 설정에서 legacy 키가 사라진 뒤 제거 가능(주석 표시됨).

### D2 완료 (2026-06-26) — 정정된 범위
**조사 중 정정:** D2 원안은 `temp/contrast/texture/uiMode` 제거였으나, 코드 확인 결과 두 개는 cosmetic 축이 아니었다:
- `uiMode` = **4-레이아웃 선택자**(default/docs/editor/scrivener/focus). 전용 `uiModeIntegrity` 서비스 + dev 무결성 체크 존재. 제거 시 멀티 레이아웃 시스템 붕괴 → **유지**.
- `themeContrast: soft|high` = **접근성(고대비)** 기능 → **유지**.
→ 사용자 승인 하에 **순수 장식 축 `themeTemp`(색온도) + `themeTexture`(종이질감)만 제거**로 정정.

**구현 방식(중요):** zod 스키마가 `z.strictObject`라 필드를 스키마에서 지우면 **기존 사용자의 저장된 설정(themeTemp/themeTexture 키 포함)이 unknown key로 검증 실패**. 따라서:
- 제품에서 제거: AppearanceTab UI(atmosphere/texture 섹션), 적용 레이어(`setup.ts`, `useThemeAttributes.ts`, `App.tsx`), 죽은 CSS(`[data-temp]` 6블록, `[data-texture]` 2블록).
- **inert로 보존**: `types/settings.ts`, `schemas/settings.ts`, `constants/editor/defaults.ts`, main `settingsDefaults.ts`, `editorStore` 필드 → 기존 저장 데이터 호환.
- 완전 필드 삭제는 별도 설정 마이그레이션 필요 → **후속 작업**.

검증: `pnpm build` exit 0 · `tsc` clean · 빌드 CSS에서 data-temp/data-texture 제거 + data-contrast 유지 확인 · 가드 rawHex 332→313, rawColor 201→197, roundedBig 175→170.

### Phase 2b 완료 (2026-06-26)
죽은 `tailwind.config.js` 정리 — 사용 중인 토큰만 `@theme`로 이관 후 config 삭제.
- `@theme`에 `--radius-control/-panel`, `--shadow-panel`, `--spacing-control-x/-y/-panel-pad/-panel-gap` 추가 → `rounded-control`(28곳) 등 **죽은 클래스 부활**(빌드 CSS에서 emit 확인).
- 네임드 z 토큰은 v4 namespace 없음 → `z-overlay→z-20`, `z-dropdown→z-50`, `z-modal→z-[9000]` 변환(6파일).
- `tailwind.config.js` 삭제.
- **dark: 버그 수정**: config의 `darkMode: [selector, data-theme=dark]`가 죽어 있어 `dark:`(72곳)가 OS 설정을 따르던 latent 버그 → `global.css`에 `@custom-variant dark (&:where([data-theme="dark"], ...))` 추가. 빌드 CSS에서 `[data-theme=dark]` 셀렉터로 컴파일 확인.
- 검증: `pnpm build` exit 0 · `tsc --noEmit` 통과 · 빌드 CSS에서 토큰 emit 확인 · 가드 green.
- ⚠ **눈에 보이는 변화**: rounded-control 28곳이 의도한 곡률(10px)을 받기 시작 / dark: 72곳이 앱 테마를 따름. 둘 다 원 의도 복원(정합성 수정).

### Phase 2a 완료 (2026-06-26)
- 위키 `--namu-*` 토큰을 코어 토큰으로 alias(`accent-bg`/`text-accent`/`border-default`/`bg-sidebar`/`bg-surface-hover`/`text-on-accent`). per-theme(dark/sepia) 중복 정의 삭제 → core 변수 cascade로 자동 테마.
- 둘째 accent 블루 `#00a2e8`/`#38bdf8`/`#0ea5e9` 제거 → **accent 단일화**. rawHex 352→332. 컴포넌트 수정 0건(var 이름 유지).

---

## 5. 우선순위 요약

- **당장(P1~P3):** 토큰 어휘 단일화 → accent 단일화 → 핫스팟 토큰화. *코드량 대비 정체성 회복 ROI 최대.*
- **시스템(P4~P5):** 패널 역할 + 자료 패널/명령 통합.
- **나중(P6):** 온보딩 서사 + 타이포 확장.

ROI 1순위는 **Phase 1**(불쾌한 골짜기의 1차 원인 직접 제거).
