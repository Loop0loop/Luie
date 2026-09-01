# Border soft / high 2단 분리 Implementation Plan

> **상태: Task 1~4 완료 (2026-09-01).** SSOT는 `ui-todo.md` §4다. 이 문서는 실행 기록으로 남긴다.
>
> 실행 순서는 사용자 승인으로 **Task 1 전역 → Task 3(soft) → Task 2(고대비) → Task 4(회귀 방어)**로 바꿨다. soft가 기본 모드 인상을 결정하므로 먼저 확인받았다.

**Goal:** `--border-default`를 soft(기본) / high(`data-contrast="high"`) 2단으로 분리해, §4 알파 수렴으로 과해진 light·sepia 테두리를 dark가 이미 쓰던 강도에 맞춘다. 알파 방언 제거라는 성과는 되돌리지 않는다.

**Architecture:** dark는 이미 `8% → 20%` 2단을 갖고 있고 light·sepia만 단일 단계였다. 그 구조를 light·sepia로 확장한다. 단 soft는 `--bg-element` 위에서 대비 1.02~1.05로 사실상 보이지 않으므로, **대화형 control 경계를 `--border-strong`으로 먼저 옮긴 뒤에** soft를 적용한다. 순서가 뒤집히면 입력 필드 테두리가 사라진다.

**Tech Stack:** Tailwind CSS 4.3.1 (`@theme` + `data-*` 속성 테마), Vitest, pnpm

## Global Constraints

- 설계 SSOT: `ui-todo.md` §4 "`--border-default` soft / high 2단 분리".
- 상위 규범: `DESIGN.md`, `docs/quality/frontend-css-agents.md`. 토큰 단일 출처: `src/renderer/src/styles/global.tokens.css`.
- 현재 branch `refactor/ui-system`, 현재 workspace 사용. worktree 금지.
- **§4 1~3단계의 알파 수렴을 되돌리지 않는다.** 알파 방언 복구는 이 플랜의 해법이 아니다.
- **다른 세션 작업을 건드리지 않는다.** `chapterService.ts` · `chapterStore.ts` · `core.contract.ts` · `useChapterManagement.ts` · `WorkspacePanels.tsx` · `SplitViewEditor.tsx` · `renderer-Optimization-result.md` · 루트 md 삭제 7건은 렌더러 최적화 세션 것이다. 수정·stage 금지.
- 신규 토큰 최소화. `--border-strong`은 §1에서 이미 7개 조합에 정의돼 있으므로 신설하지 않는다.
- `--bg-app`·`--bg-panel`·`--bg-surface`·`--bg-sidebar`·`--bg-element` 값은 건드리지 않는다. §1-A·§2·§3에서 확정한 표면 계단을 유지한다.
- dark 3개 조합의 `--border-default`는 변경하지 않는다. 이미 목표 강도다.
- 각 Task는 값 산출 → 적용 → 대비 전수 실측 → `typecheck` + `build` + 테스트 → `ui-todo.md` 동기화 → **사용자 UI 확인 및 승인** → 커밋 1개다.
- 형광펜(`--highlight-default`) · `rounded-[24px]` · bare 입력 focus 표시는 이 플랜 범위 밖이다.

## Review Decisions

`ui-todo.md` §4 기록에서 확정한 것과 이 플랜에서 정한 것.

- soft 목표는 dark의 현재 강도 **panel 대비 1.277**이다. 임의 수치가 아니라 이미 쓰이고 있는 값이다.
- 강도 축은 새 속성(`data-border`)을 만들지 않고 기존 `data-contrast`에 얹는다. 설정 UI·persist·i18n 확장을 피한다. 사용자 요구가 갈리면 그때 분리한다.
- 대화형 control 경계는 Radix step 8 / M3 `outline` / WCAG 1.4.11에 따라 `--border-strong`(3.03~3.09)으로 옮긴다. soft 도입 때문에 하는 우회가 아니라 원래 규범이다.
- `[data-contrast="high"]`의 특이도 버그(§1에서 알고도 롤백)를 이번에 해결한다. `--border-default`를 high 경로에 실으면 우회할 수 없다.
- 고대비 텍스트의 순검정(`#000000`)·중성 회색(`#333333`)은 §1이 "대비가 과했다"고 롤백한 방향과 충돌하므로 theme 색조를 유지한 값으로 교체한다.

---

### Task 1: 대화형 control 경계를 `--border-strong`으로 이관

soft 적용의 **선행 조건**이다. 이 Task 없이 Task 3을 하면 입력 필드 테두리가 사라진다.

**Files:**

- Modify: `src/renderer/src/features/export/components/ExportSidebar.tsx` (7)
- Modify: `src/renderer/src/features/settings/components/tabs/modelTabSections/OllamaEndpointCard.tsx` (3)
- Modify: `src/renderer/src/features/canvas/components/shell/canvasActivityShellParts/GraphFilterSidebar.tsx` (3)
- Modify: `src/renderer/src/features/research/components/world/TermManager.tsx` (3)
- Modify: `src/renderer/src/features/settings/components/tabs/modelTabSections/ApiKeysCard.tsx` (2)
- Modify: `src/renderer/src/features/settings/components/tabs/EditorTab.tsx` (2 입력 + 토글 2)
- Modify: `src/renderer/src/features/editor/components/InspectorPanel.tsx` (2)
- Modify: `src/renderer/src/features/workspace/components/project-selector/ProjectActionDialogs.tsx` (입력 + checkbox)
- Modify: `src/renderer/src/features/canvas/components/viewport/edges/RelationEdge.tsx` (1)
- Modify: `src/renderer/src/features/canvas/components/viewport/nodes/EntityNode.tsx` (1)
- Modify: `src/renderer/src/features/editor/components/toolbar/menus.tsx` (1)
- Modify: `src/renderer/src/features/research/components/SynopsisSection.tsx` (1)
- Modify: `src/renderer/src/features/research/components/analysisSection/chat/PromptComposer.tsx` (1)
- Modify: `src/renderer/src/features/research/components/wiki/EntityGallery.tsx` (1)
- Modify: `src/renderer/src/features/research/components/wiki/visual/EntityVisualPanel.tsx` (1)
- Modify: `src/renderer/src/features/research/components/world/MindMapBoard.tsx` (1)
- Modify: `src/renderer/src/features/settings/components/tabs/modelTabSections/ModelLibraryCard.tsx` (1)
- Modify: `src/renderer/src/features/settings/components/tabs/AppearanceTab.tsx` (토글 1)
- Modify: `src/renderer/src/features/settings/components/tabs/SyncTab.tsx` (토글 1)
- Modify: `src/shared/ui/Modal.tsx` (1)
- Modify: `src/shared/ui/SearchInput.tsx` (1)
- Modify: `ui-todo.md`

**Interfaces:**

- 대화형 control의 rest 경계: `border border-border` → `border border-border-strong`.
  - 대상: `<input>` · `<textarea>` · `<select>` · 토글 트랙 · checkbox.
  - 비대상: 카드 · 패널 · 목록 행 · 구분선 · alert. 이들은 Radix step 6이므로 `border-border` 유지.
- 밑줄형 입력(`border-b`)은 제외한다. 테두리 색 전환이 focus 표시이고 경계선이 아니다.
- 토글 off 트랙 `bg-border` → `bg-element` + `border border-border-strong`. `--color-border`는 선 색이지 면 색이 아니다(§5의 `bg-muted` 오용과 같은 범주).
- `focus:border-accent focus:ring-2 focus:ring-ring`(§4에서 확정)은 그대로 유지한다.

**측정 기준선** — **정정됨.** 최초 기준선은 `--bg-element` 기준이었으나, 컨트롤은 실제로 카드(`--bg-panel` = `--bg-surface`) 위에 놓인다. WCAG 1.4.11은 "인접 색" 대비를 요구하므로 실제 맞닿는 면으로 기준을 옮겼다.

| panel 위 대비 | light 계열 | sepia 계열 | dark 계열 |
| --- | --- | --- | --- |
| `border-border` (이전 control 경계) | 1.44~1.45 | 1.45 | 1.28 |
| `--border-strong` — 기준면 이동 **전** | 3.76~3.96 | 3.72~3.74 | 3.20~3.23 |
| `--border-strong` — 기준면 이동 **후** | **3.05** | **3.06~3.07** | 변경 없음 |

기준면 이동 후 값은 `ui-todo.md` §4 "`--border-strong` 기준면 이동" 표를 SSOT로 한다. dark는 알파라서 가장 밝은 면이 최악이고 이미 3.04~3.07이므로 변경하지 않는다.

**Task 1 파일럿 — 완료 (Settings modal 범위)**

- [x] 입력 8곳 `border-border-strong` 이관 (`EditorTab:236,305` · `ApiKeysCard:51,74` · `OllamaEndpointCard:51,65,80` · `ModelLibraryCard:111`)
- [x] 토글 4곳 트랙·노브 교정 + `SyncTab` focus ring 보강
- [x] `--border-strong` 기준면 이동 6개 조합 (사용자 "과하다" 판단 반영)
- [x] `typecheck` · `build` · 빌드 CSS 확인 · `tests/renderer/styles` 6/6 · `tests/dom` 210/213(잔여 3건은 §1-B가 기록한 기존 실패)
- [x] `editorReadyCleanup.test.tsx:247` 클래스 계약 단정을 `outline-hidden`으로 갱신
- [x] **사용자 UI 재확인** — 3.05가 약하다는 판단으로 **3.30으로 상향**. 3.76(과함) → 3.05 → 3.30으로 수렴

**Task 1 전역 확장 — 완료 (파일럿 승인 후)**

- [x] **대상 확정 및 이관** — 입력 계열 20건(GraphFilterSidebar 3 · InspectorPanel 2 · ExportSidebar 7 · RelationEdge · EntityNode · SynopsisSection · PromptComposer · EntityVisualPanel · MindMapBoard · ProjectActionDialogs · Modal · SearchInput) + EntityGallery 검색 wrapper 1 → `border-border-strong`. 대화형 컨트롤의 무알파 `border-border` 전역 잔여 0건
- [x] **토글 전수** — ExportSidebar(줄간격) · LocalLlmCard 2곳 추가 발견. 트랙 `bg-border` → `bg-element` + `border-border-strong`, 노브 `bg-white`/`bg-surface` → `bg-on-accent`, `shadow-sm` → `shadow-control`, 누락 focus ring 보강. 트랙 `bg-border` 전역 잔여 0건
- [x] **checkbox** — ExportSidebar `border-border` → `border border-border-strong` + `focus:ring-2`. ProjectActionDialogs는 className 없는 네이티브라 범위 밖
- [x] **ring 두께** — EntityGallery `focus-within:ring-1` → `ring-2`
- [x] **`bg-element` fill 컨트롤 판단** — MindMapBoard·PromptComposer는 부모가 `bg-panel`이라 바깥 경계 3:1 만족. GraphFilterSidebar·SearchInput·SynopsisSection·EntityGallery는 fill·부모 모두 element라 경계 대비 2.35~2.51(3:1 미달)이지만 이전 1.16보다 크게 개선. fill을 올리면 §2의 "파인 면" 설계와 충돌하므로 **경계 강도 우선으로 두고 기록만 남긴다**
- [x] **검증** — `typecheck` · `lint`(export/research/canvas/shared) · `build` · 빌드 CSS 확인 · `tests/renderer/styles` 6/6 · `tests/dom` 210/213(잔여 3건 §1-B 기존 실패). 20개 파일 순수 클래스 치환(WorkspacePanels는 다른 세션 것이라 미포함)
- [x] **사용자 UI 확인** — 강도 승인됨

---

### Task 2: theme별 `[data-contrast="high"]` 블록 신설 — 특이도 해결

Task 3에서 `--border-default`를 high 경로에 실으므로, 그 경로가 실제로 걸리게 만들어야 한다.

**Files:**

- Modify: `src/renderer/src/styles/global.tokens.css`
- Modify: `ui-todo.md`
- Modify: `DESIGN.md` (`data-contrast` 행 설명 갱신)

**Interfaces:**

현재 선언 순서와 특이도.

```
201  :root                                     (0,1,0)
359  [data-theme="dark"]                       (0,1,0)
440  [data-theme="dark"][data-temp="cool"]     (0,2,0)
466  [data-theme="dark"][data-temp="warm"]     (0,2,0)
483  [data-theme="light"][data-temp="cool"]    (0,2,0)
499  [data-theme="light"][data-temp="warm"]    (0,2,0)
517  [data-theme="sepia"][data-temp="cool"]    (0,2,0)
533  [data-theme="sepia"][data-temp="warm"]    (0,2,0)
560  [data-theme="sepia"]                      (0,1,0)
612  [data-contrast="high"]                    (0,1,0)
617  [data-theme="dark"][data-contrast="high"] (0,2,0)
```

신설할 블록 5개. 모두 기존 `[data-contrast="high"]` 뒤에 둔다.

```
[data-theme="sepia"][data-contrast="high"]                    (0,2,0)
[data-theme="light"][data-temp="cool"][data-contrast="high"]  (0,3,0)
[data-theme="light"][data-temp="warm"][data-contrast="high"]  (0,3,0)
[data-theme="sepia"][data-temp="cool"][data-contrast="high"]  (0,3,0)
[data-theme="sepia"][data-temp="warm"][data-contrast="high"]  (0,3,0)
```

- light 기본은 기존 `[data-contrast="high"]`(0,1,0)가 `:root`(0,1,0)를 뒤 선언으로 이기므로 신설하지 않는다.
- dark 3종은 기존 `[data-theme="dark"][data-contrast="high"]`(0,2,0)가 dark+cool/warm(0,2,0)을 뒤 선언으로 이긴다. 신설하지 않는다.

**텍스트 값 교체 규칙** (§1이 "대비가 과했다"고 롤백한 방향 반영)

- `--text-primary`: 순검정(`#000000`) 금지. **해당 theme·색온도의 색조를 유지한 한 단계 진한 값**으로 한다. 목표는 최악 표면 대비 AA 이상이면서 현재 기본값보다 진할 것.
- `--text-secondary`: 중성 회색(`#333333`) 금지. 같은 규칙.
- `--text-tertiary`: 최악 표면 대비 **4.5:1**(AA 완전 준수). 이것이 이 모드의 존재 이유다 — 기본 모드는 4.0:1로 정렬돼 있다(§2 확정).
- 값은 Step 1에서 산출한다. 이 문서에 값을 미리 박지 않는다.

- [x] **Step 1: 값 산출** — 6개 조합의 고대비 텍스트를 **채널 균등 감산**으로 산출했다. 곱셈(명도 스케일)은 `b − r`을 압축해 sepia 축이 −37 → −23으로 색조를 잃었으므로 폐기했다. 감산은 축을 정확히 보존하고 lean(`r−g : g−b`)도 유지한다
- [x] **Step 2: 블록 5개 신설** — `[data-theme="sepia"][data-contrast="high"]`(0,2,0) + 색온도 변형 4개(0,3,0). 순검정 `#000`·중성 회색 `#333` 제거(빌드 CSS 잔여 0건)
- [x] **Step 3: 특이도 검증** — 선택자 특이도와 선언 순서를 파싱해 **9개 조합 × normal/high 실효값 전수 비교**. 전 조합에서 `--text-tertiary`·`--border-default`가 실제로 바뀌는 것을 확인했다. §1부터 남아 있던 "4개 색온도 조합에서 고대비가 아예 안 걸린다" 버그 해소
- [x] **Step 4: 검증** — `typecheck` · `build` · 신설 선택자 6개 생성 확인 · 괄호 균형 46/46 · `tests/dom`+`tests/renderer/styles` 214/217(잔여 3건 §1-B 기존 실패)

**확정값 및 실측** (기준면은 각 조합의 가장 불리한 표면)

| 조합 | primary | secondary | tertiary | border | 축 보존 |
| --- | --- | --- | --- | --- | --- |
| light | `#1c1c1e` 13.73(유지) | `#4b4b53` 4.88→**6.97** | `#686864` 4.01→**4.52** | `#d7d7d3` 1.27→1.44 | ○○○ |
| light + cool | `#1d2330` 12.66(유지) | `#424c5c` 5.12→**6.99** | `#626874` 4.01→**4.51** | `#d1d6df` | ○○○ |
| light + warm | `#262016` 12.28(유지) | `#534635` 4.79→**6.96** | `#6e6255` 4.00→**4.51** | `#e0d3c3` | ○○○ |
| sepia | `#362511` 8.36→**12.02** | `#5b4936` 5.22→**7.01** | `#766653` 4.27→**4.53** | `#dfceb0` | ○○○ |
| sepia + cool | `#2f271c` 8.06→**12.00** | `#534b3e` 5.21→**7.01** | `#6e685c` 4.25→**4.51** | `#d8cfc0` | ○○○ |
| sepia + warm | `#37250d` 9.11→**11.93** | `#5e4929` 5.18→**6.95** | `#7b6543` 4.26→**4.52** | `#e6cd9c` | ○○○ |
| dark 3종 | `#ffffff` 유지 | `#e4e4e7` 유지 | `#a1a1aa` 2.55→**4.98** | 20% white 1.89 | — |

- light 계열 primary는 이미 12:1 이상이라 **건드리지 않았다.** 순검정으로 올리면 §1이 롤백한 "과함"으로 되돌아간다
- border는 3:1이 아니라 기본 soft보다 한 단계 진한 수준(1.44)이다. §1의 "테두리는 `--border-strong`이 아니라 `--border-active` 수준으로" 방향을 따른다
- dark `--text-tertiary`는 §2에서 "muted를 밝히면 글레어"라는 이유로 기본 모드 2.55를 유지했다. 그 격차를 이 모드가 메운다

- [x] **Step 5: SSOT 동기화** — `ui-todo.md` §1 "고대비 — 롤백함" 항목 해소 표기, §4 "현재 상태" 표 갱신, `DESIGN.md` reduced-motion·치트시트 갱신
- [x] **Step 6: 사용자 UI 확인** — "된듯 과하진않는듯"으로 승인됨

---

### Task 3: `--border-default` soft 적용 + 현재 값을 high로 이동 — 기본 모드 완료

> 실행 순서 변경(사용자 승인): Task 1 전역 → **Task 3 soft** → Task 2 고대비. soft가 기본 모드 인상을 결정하므로 먼저 확인받는다. Task 2(고대비 블록) 전까지 색온도 변형의 고대비는 기존 특이도 버그 상태로 남는다(신규 퇴행 아님).

**컨트롤 경계 대비 상향 (2026-08-31, 사용자 "대비 좀 더" 요청)**

`--border-strong` panel 목표를 3.05 → **3.30**으로 올렸다. element-fill 컨트롤 4곳도 2.35~2.51 → 2.54~2.71로 함께 개선됐다.

| 조합 | 이전(3.05) | 신규(3.30) | panel | element |
| --- | --- | --- | --- | --- |
| light | `#94948f` | `#8e8e89` | 3.29 | 2.66 |
| light + cool | `#8f939c` | `#898d97` | 3.29 | 2.68 |
| light + warm | `#979289` | `#918c82` | 3.29 | 2.54 |
| sepia | `#a18b6e` | `#9c8567` | 3.30 | 2.71 |
| sepia + cool | `#968d81` | `#91877b` | 3.30 | 2.70 |
| sepia + warm | `#a08c65` | `#9a865d` | 3.32 | 2.71 |

**Interfaces:**

`ui-todo.md` §4에서 확정한 soft 값. 기본 모드 적용 완료.

| 조합 | soft (기본) | panel 대비 | high (현재 값 이동) | panel 대비 |
| --- | --- | --- | --- | --- |
| light | `#e4e4e1` | 1.274 | `#d7d7d3` | 1.443 |
| light + cool | `#dfe3e9` | 1.276 | `#d1d6df` | 1.445 |
| light + warm | `#eae1d5` | 1.274 | `#e0d3c3` | 1.449 |
| sepia | `#e9dbc4` | 1.280 | `#dfceb0` | 1.450 |
| sepia + cool | `#e3dccf` | 1.277 | `#d8cfc0` | 1.446 |
| sepia + warm | `#eedbb6` | 1.278 | `#e6cd9c` | 1.453 |
| dark 3종 | 변경 없음 (1.277~1.281) | | 변경 없음 (1.911~1.921) | |

기존 `[data-contrast="high"]`의 `--border-default: #d4d4d8`(중성 회색)은 제거하고 theme별 값으로 대체한다.

**단조성 통과 조건**

- soft < `--border-active`(panel 1.99~2.00) < `--border-strong`(3.03~3.09)
- high < `--border-active` — high(1.44~1.45)는 여전히 장식선이며 3:1을 목표로 하지 않는다(§2 확정)

**부수 영향**

- `--grid-line: var(--border-default)`가 함께 옅어진다. canvas 그리드가 의도보다 약해지면 `--grid-line`을 high 값에 고정하는 분기를 둔다. Step 3에서 판단한다.
- `--canvas-node-border: var(--border-default)` · `--canvas-chrome-border` · `--canvas-divider`도 같은 경로다. canvas는 `[data-contrast="high"]`에서 `--canvas-node-border: var(--border-active)`로 이미 승격하고 있어 고대비 경로는 영향이 없다.

- [x] **Step 1: 값 재실측** — soft 6개 값이 panel 대비 1.274~1.280, element 위 1.016~1.048 확인 완료
- [x] **Step 2: soft 적용** — 6개 조합 `--border-default` soft 교체. 고대비값 보존을 NOTE로 남김
- [x] **Step 3: high 블록에 현재 값 이동** — Task 2의 블록 5개 신설과 함께 처리. 기존 base의 중성 회색 `#d4d4d8`은 theme별 값으로 대체
- [x] **Step 4: 대비 실측** — 3단 계단 default 1.27 < active 1.99 < strong 3.29~3.32 단조 확인. dark 3종 `#ffffff14`(8%) 불변 확인
- [x] **Step 5: 검증** — `typecheck` · `build` · `canvasThemeTokens` 6/6 · 빌드 CSS 6개 조합 반영 확인
- [x] **Step 6: SSOT 동기화** — 완료
- [x] **Step 7: 사용자 UI 확인** — 승인됨. **canvas 그리드가 soft를 따라 옅어진 것은 미확인 항목으로 남아 있다**
- [x] **Step 5: 검증** — 완료
- [x] **Step 6: SSOT 동기화** — 완료. 치트시트 BORDER 행에 soft/strong/고대비 명시
- [x] **Step 7: 사용자 UI 확인** — 승인됨. 남은 미확인: canvas 그리드가 soft를 따라 옅어진 것

---

### Task 4: 회귀 방어 — border 계단 정적 검사

`ui-todo.md` §8의 첫 두 항목("테마 토큰 전반으로 확장", "테마별 대비 임계값 정적 검사")을 border 범위에서 먼저 해소한다. 이 Task가 없으면 다음 팔레트 작업에서 같은 붕괴가 재발한다.

**Files:**

- Create: `tests/renderer/styles/borderLadderContrast.test.ts`
- Modify: `ui-todo.md`

**Interfaces:**

- `global.tokens.css`를 파싱해 9개 조합 × `data-contrast` 2단의 **실효값**을 해석한다. alias(`var(--x)`)를 따라가고, 선택자 특이도와 선언 순서로 승자를 고른다(CSS cascade와 같은 규칙). 값을 테스트에 하드코딩하지 않는다.
- 임계값은 `THRESHOLD` 상수 한곳에 모아 둔다. 의도적 변경 시 그 상수만 고친다.

**단정 항목 (65 케이스)**

| 검사 | 내용 |
| --- | --- |
| 3단 계단 단조 | 조합별 `default < active < strong` |
| WCAG 1.4.11 | `border-strong`이 control 표면에서 **3:1 이상**(반올림 금지) |
| 장식선 상한 | `border-default`가 상한(1.6)을 넘지 않는다 — grid prison 방지 |
| **특이도 회귀** | 9개 조합에서 `data-contrast="high"`가 **실제로 값을 바꾼다** |
| **base 폴백 금지** | 고대비 값이 자기 조합 블록에서 온다. 색온도 변형이 base의 회색 램프를 물려받는 것을 잡는다 |
| 고대비 border | 기본보다 진하다 |
| 고대비 tertiary | 최악 표면에서 **4.5:1**(AA 완전 준수) |
| 색조 보존 | 고대비 텍스트의 축(`b − r`) 부호가 기본 모드와 같다 — 순검정 회귀 방지 |
| dark 상속 | dark+cool·warm의 `border-default`가 dark와 같다 |

- [x] **Step 1: RED** — 4종 회귀를 인위적으로 만들어 전부 검출됨 확인. ① light+warm 고대비 블록 제거 → 4 failed ② `border-strong` 3:1 위반 → 2 failed ③ `border-default` 상한 초과 → 3 failed ④ 계단 역전 → 1 failed
- [x] **Step 2: GREEN** — 65/65 통과
- [x] **Step 3: 회귀 확인** — `tests/renderer/styles` + `tests/dom` **279/282**(잔여 3건 §1-B 기존 실패) · `typecheck` · `lint` · `build` 통과
- [x] **Step 4: SSOT 동기화** — §8의 "대비 임계값 정적 검사"·"guard script 연결"·"tokens-guard 결함" 3건 해소
- [x] **커밋** — `global.tokens.css`와 `borderLadderContrast.test.ts`는 `72eb33f8 feat:tailwind v4 syntax migration`에 들어갔다. *2026-09-01 확인: 이 항목이 "아직 커밋하지 않았다"로 남아 있었으나 낡은 기록이었다.*

> **아직 커밋되지 않은 것 (2026-09-01)**: `global.animations.css`(untracked) · `global.css`(+1 import) · `canvas.css`(중복 reduced-motion 제거) · `DESIGN.md` · `ui-todo.md` · 이 문서. **세 파일은 하나로 묶여야 한다** — `global.css`의 import가 빠지면 파일이 있어도 로드되지 않고, HEAD 상태로 돌아가면 21개 파일 90건의 `animate-in`/`slide-*`/`fade-*`가 다시 죽은 클래스가 된다.

#### 이 테스트가 실제로 잡아낸 버그 (작성 중 발견)

**sepia 계열 고대비 `tertiary`·`secondary`가 목표 미달이었다.** 내가 값을 산출할 때 기준면을 `--bg-sidebar`로 잡았는데, §3에서 sepia 표면 계단을 바로잡은 뒤로는 **`--bg-element`가 가장 어두운 면**이다. `ui-todo.md` §2의 "sepia는 element가 가장 밝으므로 `--bg-sidebar`다"라는 기록이 §3 이후로 낡았고 내가 그것을 그대로 따랐다.

| 조합 | tertiary 이전 → 교정 | secondary 이전 → 교정 |
| --- | --- | --- |
| sepia | `#766653` 4.23 → **`#72624f` 4.51** | `#5b4936` 6.58 → **`#574532` 7.01** |
| sepia + cool | `#6e685c` 4.23 → **`#696357` 4.56** | `#534b3e` 6.57 → **`#4e4639` 7.11** |
| sepia + warm | `#7b6543` 4.25 → **`#77613f` 4.51** | `#5e4929` 6.54 → **`#594424` 7.06** |

축은 전부 보존됐다(−35 · −18 · −56). **정적 검사가 없었으면 고대비 모드가 목표를 못 채운 채로 남았을 것이다.** §8의 존재 이유가 이 한 건으로 증명된다.

---

## 실행하지 않을 것 (명시적 범위 밖)

- 알파 방언 복구. §4 1~3단계 결과를 유지한다
- `--border-focus` 이름 정리. 소비처가 `--canvas-handle-bg` 하나뿐이라는 기록만 유지한다
- bare 입력 20여 곳의 focus 표시 추가. 표현 결정이 먼저다
- 형광펜 · `rounded-[24px]` · `ENTITY_KIND_TINT` · active/selected 방언 수렴
- Tailwind가 문서·스킬 마크다운을 스캔하는 문제. §8에서 다룬다
- v3 잔재(`shadow-sm` 51 · `rounded-sm` 18 · `backdrop-blur-sm` 13 · 죽은 클래스 2). 별도 플랜으로 분리한다

## 리스크

| 리스크 | 완화 |
| --- | --- |
| Task 1 없이 Task 3을 하면 입력 테두리가 사라진다 | Task 순서를 강제. Task 3 Step 1에서 `--border-strong` 이관 완료를 선행 확인 |
| `--border-strong` 3:1이 입력에서 과하게 보일 수 있다 | Task 1 Step 6에서 별도 승인 지점을 둔다. 과하면 `--border-active`(2.00)로 한 단계 낮추는 선택지를 남긴다 — 단 WCAG 1.4.11 미달을 감수하는 결정이 된다 |
| 고대비 텍스트 값이 또 과할 수 있다 | §1에서 한 번 롤백한 이력이 있으므로 Task 2를 독립 커밋으로 분리해 되돌리기 쉽게 한다 |
| soft가 canvas 그리드를 너무 옅게 만든다 | Task 3 Step 3에서 `--grid-line` 분기 필요 여부를 판단 지점으로 명시 |
| 다른 세션과 커밋이 섞인다 | Global Constraints에 파일 목록을 고정. `WorkspacePanels.tsx`는 이 플랜에서 건드리지 않는다 |
