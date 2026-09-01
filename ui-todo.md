# UI 디자인 토큰 감사 & 리파인 TODO

> 브랜치: `refactor/ui-system`
> 범위: `src/renderer/src/**` (505 files, 토큰 정의 파일 제외)
> 기준: [`DESIGN.md`](DESIGN.md) · [`scripts/design/tokens-guard.mjs`](scripts/design/tokens-guard.mjs) baseline · **Apple HIG** · **UI/UX Pro Max** 규칙
> 상위 규범: [`docs/quality/frontend-css-agents.md`](docs/quality/frontend-css-agents.md)
>
> ⚠️ **이 문서는 `docs/complete/ui-todo.md`(UI System Refactor 완료 기록)와는 다른 독립 감사 TODO다.**
> `docs/complete/`는 완료된 이전 작업의 이력이고, 이 파일은 **2026-09-01 renderer 전역 정밀 감사**에서
> 발견된 잔존 리파인 작업을 트래킹한다.

---

## 0. 현재 게이트 상태 (2026-09-01 감사 시점)

`node scripts/design/tokens-guard.mjs` — 전 항목 baseline 이하(통과)이나 **개선 여지가 있음**.

| 지표 | 감사 직후 | P2 이후 (작업 트리) | baseline | 판정 |
| --- | --- | --- | --- | --- |
| `rawHex` | 143 | 149 | 143 | ⬆ 병행 세션 변경(`StartupWizard.tsx`) — **내 작업 아님** (P2-3은 스와치 색값 변경이라 hex 수 불변) |
| `rawColor` | 98 | 88 | 98 | ✓ **↓10 (P0 raw 색 제거)** |
| `arbitraryPx` | 414 | 429 | 414 | ⬆ 병행 세션 변경(StartupWizard) — **내 작업 아님** |
| `roundedBig` | 155 | 155 | 155 | ✓ (내 P2-1 −9지만 병행 세션 +9 상쇄) |
| `shadowBig` | 21 | 11 | 21 | ✓ **↓10 (P2-2 그림자 tint화)** |
| `shadcnVocab` | 0 | 0 | 0 | ✓ |

> ⚠️ **병행 세션 주의**: 작업 트리에 `refactor/ui-system` 위를 진행하는 **다른 세션의 미커밋 변경**이 상시 존재한다
> (`StartupWizard.tsx` 리워크, `global.tokens.css`, i18n, main/window 등). guard의 `rawHex`/`arbitraryPx`/`roundedBig` 수치는 이 병행
> 변경과 엮여 있어 **이 리파인 작업의 실제 기여도는 `rawColor` -10 + 토큰화(아래 P별)로 판정**한다.

---

## P0 — 렌더 버그 (즉시 처리) ✅ 완료 (2026-09-01)

### P0-1 `shadow-full`이 CSS 미생성 (조용한 스타일 실패)

Tailwind v4 기본 shadow 스케일(`2xs`~`2xl`)과 `global.tokens.css` 어디에도 `--shadow-full`이 없다.
빌드 산출물 `out/renderer/assets/styles/index-*.css`에 `.shadow-full` **0회 생성 확인** → 설정 모달과 복구 섹션이
의도한 그림자 없이 렌더되는 상태다. (`global.tokens.css` NOTE가 이미 두 번 겪어 기록해둔 "매핑 없음 = 렌더 실패" 패턴)

- [x] `features/settings/components/SettingsModal.tsx:122` — `shadow-full` → `shadow-panel` → (사용자 확인 후) **`shadow-modal`**
- [x] `features/settings/components/tabs/RecoveryTab.tsx:122` — `shadow-full` → `shadow-panel` → (사용자 확인 후) **`shadow-modal`**
- [x] 검증: 재빌드 후 `shadow-full` **0회** · `shadow-modal`(↓ 전용, y+20px spread-16) 생성 확인 · `shadow-panel`은 다른 소비처 위해 유지
- [x] **사용자 피드백 반영 (2026-09-01)**: 「settings 그림자가 위로도 보인다」 → `--shadow-modal` 토큰 신설(`0 20px 40px -16px var(--elevation-tint), 0 6px 12px -6px …`)로 **아래 방향 전용** 그림자 적용

### P0-2 프로젝트 sync/attachment 상태 배지 — dark 전용 색이 light/sepia에서 보이지 않음

`features/workspace/components/project-selector/RecentProjectsSection.tsx` (~line 178-202)
`text-emerald-300`/`text-amber-300`/`text-red-300`은 dark용 파스텔이라 light/sepia 배경에서 대비 약 **1.6:1** (AA 4.5:1 미달).
의도된 semantic token(`--color-success`/`warning`/`danger` + `bg-*-/15` 패턴)이 이미 존재한다 — `LlmfitCard.tsx`·`ModelTab.tsx`가 동일 패턴 사용.

- [x] `syncBadge` 분기: `bg-emerald-500/15 text-emerald-300` → `bg-success/15 text-success`, amber → `bg-warning/15 text-warning`, red → `bg-danger/15 text-danger`
- [x] `attachmentBadgeKey` 분기: `bg-muted/15 text-muted` / `bg-warning/15 text-warning` / `bg-danger/15 text-danger`로 교체
- [x] 결과 `rawColor` 98 → 88 (↓10), `RecentProjectsSection` raw color 0건

> **P0-2 대비 검증 (WCAG AA 4.5:1)**:
> - dark: success 7.63 · warning 8.09 · danger 4.62 ✅
> - light: warning 4.76 · danger 4.58 ✅ · **success 3.13 ⚠️ 미달**
> light `--success-fg`(#16a34a)가 종이(#f9f9f7) 위에서 AA에 미달한다. 이는 **기존 토큰 값의 특성**이고
> 다른 배지(LlmfitCard·ModelTab)도 같은 값을 쓰는 원래 존재하던 문제라 **P0 스코프에서 제외**한다.
> 세계 영향(전역 토큰 값 변경)이 있는 별도 리파인으로 추적 → P2-4 신설(아래).

### P0 후속 — light `--success-fg` 대비 리파인 (2026-09-01 ✅ 완료)

- [x] light `--success-fg`: `#16a34a`(3.13:1 ❌) → `#15803d`(green-700, **4.76:1 ✅**) — `global.tokens.css:278`
- [x] 대비 검증: light 4.76 · sepia(기존 `#2e7d32`) 4.61 · dark(기존 `#22c55e`) 7.63 — **전 theme AA 통과**
- [x] `#16a34a` 잔존: `--editor-ink-green` anchor(`color-mix` 60%) + `constants.ts:26` — editor 글자색 팔레트로 별도 경로, 대비 4.70~8.37 검증됨 → 유지
- [x] 검증: 스타일 테스트 98건 · build · typecheck 전부 통과, CSS 산출물에 `15803d` 반영 확인

---

## P1 — 접근성 / Apple HIG 최소 텍스트 & 포커스 ✅ 완료 (2026-09-01)

### P1-1 텍스트 8~9px 제거 (HIG 데스크톱 최소 10pt)

`typography.md`: Desktop minimum **10 pt**. `text-[8px]`·`text-[9px]`·`text-[9.5px]` **35건 / 14파일** → 전부 `text-[10px]`로 승격.

- [x] `PromptComposer.tsx:101,278,287,292` — `text-[9px]` → `text-[10px]` (카테고리 라벨·스니펫)
- [x] `NarrativeSummaryStatusPanel.tsx:60-94` — `text-[9px]` 6곳 → `text-[10px]`
- [x] `CharacterVisualPanel.tsx:255` — `text-[8px]` → `text-[10px]` ("+" 기호)
- [x] `EntityNode.tsx:40` — `text-[9px]` → `text-[10px]` (kind 라벨)
- [x] `TemplateGrid` · `SidebarPeekContent` · `SidebarCollapseStrip` · `GraphNodeInspector` · `GraphFilterSidebar` · `TreeNode` · `PensiveNode` · `GraphLegendModal` · `GraphHoverCard` · `ExportSidebar` — 잔여 24건 모두 → `text-[10px]`
- [x] 검증: 8/8.5/9/9.5px 잔존 **0건** · build · typecheck · 스타일 테스트 98건 통과
- [ ] (보류) `global.tokens.css` 텍스트 크기 래더 토큰(`--text-caption/small/body`) — 값 승격은 완료, 토큰 정의는 P2 토큰 수렴과 함께 평가

### P1-2 임의 z-index → 명명 스케일 ✅

- [x] `global.tokens.css` — `--z-index-quit: 9999` 신설 + `@utility z-quit` (종료 오버레이는 modal(1000) 위 최상위가 필요)
- [x] `app/shell/QuitOverlay.tsx:22` — `z-[9999]` → `z-quit`
- [x] `features/workspace/components/layout/MainLayout.tsx:499,527` — `z-[110]` → `z-toolbar`(120) (사이드바/컨텍스트 토글 플로팅 버튼. 위치가 툴바와 달라 충돌 없음)
- [x] 검증: 임의 `z-[N]` 잔존 **0건** · CSS 산출물에 `.z-quit`·`.z-toolbar` 생성 확인

### P1-3 `text-white` → `text-on-accent` (커스텀 accent 색상 호환) ✅

accent 색상이 사용자 지정(`--accent-bg` 변환)될 때 하드코딩 흰 텍스트는 대비를 깬다. `bg-accent`가 포함된 라인의 `text-white` 13건 → `text-on-accent`.

- [x] `app/shell/BootstrapGate.tsx:41`
- [x] `features/settings/components/tabs/RecoveryTab.tsx:227`
- [x] `features/settings/components/tabs/SyncTab.tsx:117,126`
- [x] `features/settings/components/SyncConflictResolverModal.tsx:244`
- [x] `features/workspace/components/UpdaterNotification.tsx:152,171,183`
- [x] `features/workspace/components/project-selector/ProjectActionDialogs.tsx:44` (101행 `bg-red-500` danger 버튼은 accent가 아니므로 유지)
- [x] `features/workspace/components/project-selector/RestoreBackupDialog.tsx:129`
- [x] `features/export/components/ExportSidebar.tsx:249,331`
- [x] `features/export/components/ExportPreviewPanel.tsx:91`
- [x] `features/startup/components/StartupWizard.tsx:352,483`
- [x] 검증: `bg-accent`+`text-white` 동일 라인 **0건** · 잔존 `text-white`는 전부 정당(크래시 화면·이미지 오버레이·danger 버튼·HWP/Word 목업 — P3 대상) · CSS 산출물 `text-on-accent` 반영
- [x] **사용자 피드백 반영 (2026-09-01)**: 「rose accent에서 Google 연동 버튼(accent 배경) 안 구글 G 로고가 안 보인다」 → SVG를 `bg-white rounded-full` 칩 안에 배치(상단 연결됨 프로필 아이콘과 통일). 채도 높은 accent(rose `#e11d48`/`#f43f5e`)에서도 브랜드 로고 가시성 확보.
- [ ] (후속 기록) dark rose(`#f43f5e`) 위 흰 텍스트 대비 3.67 — 본문 4.5:1 미달. 기존 `--accent-fg:#ffffff` 고정값 특성. accent별 fg 값 도입은 P2-3(accent 팔레트)과 함께 평가

---

## P2 — 토큰 수렴 ✅ 완료 (2026-09-01)

### P2-1 `rounded-3xl`(=24px) → `rounded-editor-shell`(1.5rem/24px, 동일값 교체) ✅

- [x] `features/settings/components/SettingsModal.tsx:122,151` — `rounded-3xl` → `rounded-editor-shell`
- [x] `features/research/components/AnalysisSection.tsx:177` — `rounded-3xl` → `rounded-editor-shell`
- [x] `features/canvas/components/shell/CanvasPane.tsx:39` — `rounded-3xl` → `rounded-editor-shell`
- [x] `rounded-2xl`(16px) 5건(AnalysisSection 437·450·459·468·477) → **`rounded-panel`(14px)로 수렴 결정** (2px 차이, 카드 일관성 우선). `--radius-2xl` 토큰 대신 기존 래더로 통일.
- [ ] (병행 세션 소유) `StartupWizard.tsx:456` `rounded-2xl` — 병행 세션 변경이라 보류

### P2-2 검정 그림자 유틸 → 테마 tint 그림자 ✅

`shadow-lg`·`shadow-md` 등 Tailwind 기본 검정 그림자는 light/sepia 종이 위 회색 얼룩이 된다. **정적(static)** 그림자만 `shadow-panel`/`shadow-control`로 교체하고, 의도적인 `hover/group-hover/active` 승격·캔버스 노드 선택·시뮬레이션 종이는 **유지**했다(과도한 무차별 수렴은 시각 회귀 우려).

- [x] `shadow-lg`→`shadow-panel`: BootstrapGate:21 · QuitOverlay:23 · NarrativeSummaryStatusPanel:30 · DrawingCanvas:56 · ProjectContextMenu:44 · SidebarHoverStrip:44 · SidebarCompactHover:354 · MindMapBoard:157,197
- [x] `shadow-md`→`shadow-control`: PromptComposer:341 · RuntimeStatusPanel:17 · SettingsModal:138 · ProjectCategorySidebar:42 · CanvasMarkdownEditor:177
- [x] accent 배경 버튼: ExportSidebar:331 `shadow-lg shadow-accent/20`→`shadow-control shadow-accent/20` · EntityGallery:311 `shadow-xs`→`shadow-control`
- [x] **유지(의도)**: hover:shadow-lg/md/xl(TermCard·PlotBoard·RecentProjectsSection·PensiveNode·MindMapBoard:45·TemplateGrid) · PensiveNode 선택 shadow-lg · canvas 컨트롤/카드 미세 shadow-xs·2xs · ExportPreviewPanel 종이(→P3) 
- [x] 결과 `shadowBig` baseline 21 → **11 (↓10)**

### P2-3 accent/entity 색상 선택 팔레트 → 토큰 연동 ✅

- [x] `features/settings/components/tabs/AppearanceTab.tsx:45-49` — **accent 스와치 색이 실제 token과 불일치던 버그 수정.** 스와치 hex를 `global.tokens.css [data-accent]`의 `--accent-bg`(light)와 일치시킴(blue `#3b82f6`→`#2563eb`, emerald→`#059669`, violet→`#7c3aed`, rose→`#e11d48`, amber→`#d97706`). 값은 data 계약이라 hex 유지 + NOTE로 정합 근거 기록
- [x] `features/research/components/wiki/types.ts:27-38` — `CHARACTER_COLOR_PRESETS`는 **사용자 데이터(hex)로 저장**되고, canvas entity 종류색(chapter/character/…)과 성격이 달라 **단일 소스 통합하지 않음** 판정. anchor로 분류(예외 유지)

---

## P3 — 시뮬레이션/모의 표면 → scoped emulation token

외부 앱 목업(HWP/Word), 종이 시뮬레이션, 기기 프레임은 **의도적 하드코딩**이다. DESIGN.md 골든룰("절대 하드코딩 금지")과
충돌하므로 `global.tokens.css`에 **역할 토큰**으로 정의하고 소비처는 토큰을 참조하게 한다.

- [ ] `features/export/components/ExportPreviewPanel.tsx` (rawColor 70건 / hex 10건) — `--hwp-titlebar-bg`,`--hwp-toolbar-bg`,`--hwp-menu-fg`, `--sim-tool-border` 등 emulation token 신설
- [ ] `features/export/components/ExportPreview.tsx` (hex 7건) — `--paper-bg`, `--paper-text` 토큰
- [ ] `features/editor/components/Editor.tsx:330` — 모바일 프레임 `border-[#2c2c2e]`/`rounded-[48px]`/`shadow-[...]` → `--device-frame-bg`, `--device-frame-radius`, `--device-frame-shadow`
- [ ] `features/research/components/world/DrawingCanvas.tsx:51` — `bg-[#f4f1ea] dark:bg-zinc-900` → `--drawing-bg` (theme별 값)
- [ ] 잉크 팔레트 hex 8건은 색상 선택 데이터이므로 anchor로 분류 (예외 유지)
- [ ] 결과 `rawHex` 143 → ~105, `rawColor` 98 → ~28 목표

---

## P4 — 가드 스크립트 정확성 개선

`scripts/design/tokens-guard.mjs`가 오탐지/미탐지를 일으켜 baseline 신호가 흐려진다.

- [ ] `roundedBig` 패턴에서 `rounded-full` 분리 — 원형(아바타·배지·진행링) ~144건은 위반이 아님, 실질 대형 라운드만 계수
- [ ] `rawHex`에 예외 분류 도입 — anchor hex(픽커 파싱) · 브랜드(Google 로고) · emulation token은 별도 카운터로 분리
- [ ] `arbitraryPx`에서 시뮬레이션 고정 폭(`[700px]`,`[450px]` 등) 예외 처리 여부 결정
- [ ] shadow arbitrarily(`shadow-[0_0_15px_rgba(...)]`) 패턴 추가 계수

---

## 완료 후 baseline 하향 목표 (완료 시 갱신)

| 지표 | 현재 baseline | 예상 감소 |
| --- | --- | --- |
| `rawHex` | 143 | → ~105 |
| `rawColor` | 98 | → ~28 |
| `arbitraryPx` | 414 | → ~390 |
| `roundedBig` | 155 | → ~144 |
| `shadowBig` | 21 | → ~8 |

---

## 검증 체크리스트 (항목 완료 시)

- [ ] `node scripts/design/tokens-guard.mjs` 통과 + baseline 갱신 전 개선 수치 기록
- [ ] `pnpm run typecheck` 통과
- [ ] 변경 파일에서 `!important`, 하드코딩 hex, `rgba(`, `z-[`, 동적 class 생성 재검색
- [ ] `data-theme` 3종 × `data-temp` 2종 × `data-contrast` 2종(9조합) 대비 확인
- [ ] Apple HIG 체크: 텍스트 최소 10pt / 포커스 링 노출 / 감소 모션 존중