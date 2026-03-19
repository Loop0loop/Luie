# Renderer Graph Refactor Plan (World Graph)

## 1) Objective

Stabilize and scale the renderer-side world graph implementation by separating UI/session state from domain mutations, reducing denormalized update costs, and enforcing i18n/theme/responsive consistency without breaking the existing persisted graph document contract.

## 2) Non-goals

- No rewrite-from-scratch.
- No immediate migration of persisted `.luie`/world graph schema shape.
- No introducing dnd-kit into ReactFlow canvas interactions.

## 3) Scope

### In Scope

- `src/renderer/src/features/research/components/world/graph/**`
- `src/renderer/src/features/research/stores/worldBuildingStore*`
- `src/renderer/src/features/research/stores/worldGraphUiStore.ts`
- Graph-focused renderer tests under `tests/renderer/**`

### Out of Scope (for this plan)

- Main process package IO redesign
- Shared codec contract redesign (`src/shared/world/worldGraphDocument.ts`)

## 4) Success Criteria (Definition of Done)

1. World graph panel UI/session state is store-driven (no direct localStorage in panel components).
2. Auto-layout path is unified (single command path, no duplicated layout algorithm blocks).
3. Graph mutation flow has explicit command boundary and batched update path for node positions.
4. No `any` in graph timeline update APIs (`TimelineTab`/`TimelineView` path).
5. i18n keys applied for graph surface user-facing strings; no new hardcoded mixed locale strings.
6. Theme usage aligns to tokens/semantic mapping; raw ad-hoc colors reduced in graph views.
7. Responsive behavior baseline exists for graph panel/sidebar on narrow widths.
8. Test coverage added for race, layout persistence, and graph command behavior.

## 5) Risk Register

| Risk                                                     | Likelihood | Impact | Mitigation                                                                         |
| -------------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------- |
| Breaking persisted graph load/save compatibility         | Medium     | High   | Keep persisted payload contract unchanged; add compatibility tests before refactor |
| UI regressions due to state move from component to store | Medium     | Medium | Migrate in small slices (tab/selection/sidebar), add DOM behavior tests            |
| Performance regressions during normalization             | Low        | Medium | Add benchmark-style test fixture with medium graph size before/after               |
| Over-refactor scope creep                                | High       | Medium | Strict phase gates and explicit out-of-scope list                                  |

## 6) Phased Execution Plan

Execution mode: **TDD-first ultrawork**.

For every numbered task below, apply this cycle strictly:

1. Write/adjust a failing test for the target behavior.
2. Implement the smallest change to pass.
3. Refactor while keeping tests green.
4. Run task-specific QA scenario (defined under each task).

## Phase 0 — Guardrails First (2-3 days)

### Deliverables

- Add failing-first regression tests for known pain points.
- Freeze behavior contract before structural refactor.

### Tasks

1. Add `tests/renderer/stores/worldBuildingStore.graph-race.test.ts`
   - verifies stale load results do not overwrite newer local mutations
   - verifies persist queue order guarantees latest state wins

   **QA Scenario**
   - Command sequence:
     1. `bunx vitest --run tests/renderer/stores/worldBuildingStore.graph-race.test.ts`
     2. implement race fix
     3. `bunx vitest --run tests/renderer/stores/worldBuildingStore.graph-race.test.ts`
   - Inspect: step (1) is red for known race behavior, step (3) is green after fix.
   - Expected: failing-first signal observed before implementation, then stable pass.

2. Add `tests/renderer/components/worldGraph/autoLayout.persistence.test.tsx`
   - verifies auto-layout does not re-fire on tab re-entry without trigger change
   - verifies auto-layout commit persists node positions

   **QA Scenario**
   - Command: `bunx vitest --run tests/renderer/components/worldGraph/autoLayout.persistence.test.tsx`
   - Inspect: initial layout applies once; re-entry keeps persisted positions.
   - Expected: exit code 0 and assertion that second mount does not mutate positions.

3. Add `tests/renderer/components/worldGraph/canvasEdgeRelation.edit.test.tsx`
   - verifies relation edit flow via UI command path (future dialog path)

   **QA Scenario**
   - Command: `bunx vitest --run tests/renderer/components/worldGraph/canvasEdgeRelation.edit.test.tsx`
   - Inspect: relation value updates through dialog action callback, not prompt APIs.
   - Expected: exit code 0; no `window.prompt` mocking required.

### Exit Criteria

- New tests exist and pass (or reveal current failures that Phase 1 addresses immediately).

## Phase 1 — UI State Consolidation + Quality Debt Cleanup (3-5 days)

### Deliverables

- `WorldGraphPanel` no longer owns local UI/session state directly.
- Dead props and obvious quality debt removed.

### Tasks

1. Expand `worldGraphUiStore.ts` to include:
   - active tab
   - sidebar open/width
   - selected ids (node/timeline/note)
   - auto-layout trigger metadata
   - persisted UI settings via Zustand persist middleware

   **QA Scenario**
   - Command: `bunx vitest --run tests/renderer/stores/worldGraphUiStore.test.ts`
   - Inspect: store rehydrates sidebar state and selected ids correctly.
   - Expected: exit code 0; persisted values restored after simulated reload.

2. Refactor `WorldGraphPanel.tsx` to consume store selectors/actions:
   - remove direct `localStorage.getItem/setItem`
   - remove duplicated local `useState` for above UI session fields

   **QA Scenario**
   - Commands:
     - `bunx eslint src/renderer/src/features/research/components/world/graph/WorldGraphPanel.tsx`
     - `bunx vitest --run tests/renderer/components/worldGraph/worldGraphPanel.uiState.test.tsx`
   - Inspect: panel state transitions work from store dispatch only.
   - Expected: lint passes; tests verify tab/siderbar/selection state via store.

3. Clean `GraphActiveSidebar.tsx` interface:
   - remove dead/unused props from prop contract
   - split tab-specific sidebars into small files (`sidebars/CanvasSidebar.tsx`, etc.)

   **QA Scenario**
   - Commands:
     - `bun run typecheck`
     - `bunx vitest --run tests/renderer/components/worldGraph/graphActiveSidebar.contract.test.tsx`
   - Inspect: no orphan props in component signatures; render behavior unchanged.
   - Expected: typecheck clean, contract test green.

4. Replace `window.prompt` relation editing in `CanvasView.tsx` with shared dialog action path:
   - add a minimal controlled dialog component usage with i18n-ready label keys

   **QA Scenario**
   - Commands:
     - `bunx vitest --run tests/renderer/components/worldGraph/canvasEdgeRelation.edit.test.tsx`
     - `bunx eslint src/renderer/src/features/research/components/world/graph/views/CanvasView.tsx`
   - Inspect: no `window.prompt` references remain in `CanvasView.tsx`.
   - Expected: tests pass and grep check returns zero prompt usage.

5. Remove `any` from timeline update APIs:
   - introduce typed `TimelineEventAttributesPatch` in graph types
   - update `TimelineTab.tsx` + `TimelineView.tsx` signatures

   **QA Scenario**
   - Commands:
     - `bun run typecheck`
     - `bunx vitest --run tests/renderer/components/worldGraph/timelineView.typing.test.tsx`
   - Inspect: timeline update path compiles without `any` escapes.
   - Expected: typecheck clean; typing-focused tests green.

### Exit Criteria

- `WorldGraphPanel` has no direct localStorage usage.
- `TimelineTab`/`TimelineView` no `any` in event update contract.
- Sidebars compile with slimmer, accurate prop signatures.

## Phase 2 — Model/Command Boundary + Batch/Indexed Updates (5-8 days)

### Deliverables

- Graph feature gets explicit internal model layer.
- Expensive multi-step updates moved to command functions.

### Tasks

0. Add failing-first tests for model/command behavior before implementation.
   - Add/extend:
     - `tests/renderer/components/worldGraph/model.selectors-commands.test.ts`
     - `tests/renderer/components/worldGraph/autoLayout.command.test.ts`
     - `tests/renderer/stores/worldBuildingStore.positionBatch.test.ts`
     - `tests/renderer/stores/worldBuildingStore.batchUpdate.performance.test.ts`

   **QA Scenario**
   - Command: `bunx vitest --run tests/renderer/components/worldGraph/model.selectors-commands.test.ts tests/renderer/components/worldGraph/autoLayout.command.test.ts tests/renderer/stores/worldBuildingStore.positionBatch.test.ts tests/renderer/stores/worldBuildingStore.batchUpdate.performance.test.ts`
   - Inspect: tests encode intended command/index behavior and fail before implementation.
   - Expected: non-zero exit code for failing-first baseline.

1. Create `src/renderer/src/features/research/components/world/graph/model/`
   - `selectors.ts` (derived graph slices, memoized where beneficial)
   - `indexes.ts` (id-indexed maps generated from graphData)
   - `commands.ts` (node move batch, edge updates, layout apply)

   **QA Scenario**
   - Command: `bunx vitest --run tests/renderer/components/worldGraph/model.selectors-commands.test.ts`
   - Inspect: selectors are deterministic and commands are side-effect bounded.
   - Expected: exit code 0; same input graph yields stable selector output.

2. Move auto-layout algorithm to one place (`commands.applyAutoLayout`) and reuse from UI.

   **QA Scenario**
   - Commands:
     - `bunx vitest --run tests/renderer/components/worldGraph/autoLayout.command.test.ts`
     - `grep -R "COLS = 4\|ROW_GAP\|OFFSET_X" src/renderer/src/features/research/components/world/graph`
   - Inspect: algorithm constants defined once in command module.
   - Expected: test pass; grep confirms no duplicated algorithm blocks.

3. Replace per-node persistence fan-out after layout with batch position command.

   **QA Scenario**
   - Command: `bunx vitest --run tests/renderer/stores/worldBuildingStore.positionBatch.test.ts`
   - Inspect: one batch persist call per auto-layout operation.
   - Expected: pass with assertion on single batch command invocation.

4. Refactor `worldBuildingStore.actions.ts` batch path to single-pass updates using id-index map.

   **QA Scenario**
   - Command: `bunx vitest --run tests/renderer/stores/worldBuildingStore.batchUpdate.performance.test.ts`
   - Inspect: update call count is O(n) single pass for node list.
   - Expected: pass and no regression against baseline fixture.

5. Keep persistence output contract unchanged:
   - continue using `buildWorldGraphDocument(graphData)`

   **QA Scenario**
   - Command: `bunx vitest --run tests/shared/worldGraphDocument.contract.test.ts`
   - Inspect: serialized payload shape remains backward compatible.
   - Expected: pass with unchanged schema snapshot.

### Exit Criteria

- No duplicate auto-layout algorithm blocks.
- Node position updates use one batch command path.
- Internal indexed path exists; persisted output remains contract-compatible.

## Phase 3 — UX Consistency: i18n / Theme / Responsive (3-5 days)

### Deliverables

- Consistent localization and design system usage on graph surface.

### Tasks

0. Add failing-first UX consistency tests before implementation.
   - Add/extend:
     - `tests/renderer/i18n/graphLocaleKeys.test.ts`
     - `tests/renderer/theme/graphThemeMapping.test.ts`
     - `tests/renderer/components/worldGraph/worldGraphPanel.responsive.test.tsx`

   **QA Scenario**
   - Command: `bunx vitest --run tests/renderer/i18n/graphLocaleKeys.test.ts tests/renderer/theme/graphThemeMapping.test.ts tests/renderer/components/worldGraph/worldGraphPanel.responsive.test.tsx`
   - Inspect: tests fail first with current mixed literals/token gaps/responsive assertions.
   - Expected: non-zero exit code for failing-first baseline.

1. i18n pass in graph surface files:
   - extract mixed literal strings to translation keys
   - add missing locale entries (ko/en)

   **QA Scenario**
   - Commands:
     - `bunx vitest --run tests/renderer/i18n/graphLocaleKeys.test.ts`
     - `grep -R "관계를 입력하세요\|Reload Environment\|Create First Track" src/renderer/src/features/research/components/world/graph`
   - Inspect: literals replaced by `t("...")` keys.
   - Expected: key tests pass; grep returns zero direct literals for migrated strings.

2. Theme token pass:
   - replace hardcoded ad-hoc color values in view-layer components with semantic tokens where possible
   - keep entity-type color map but route through semantic mapping helpers

   **QA Scenario**
   - Commands:
     - `bunx vitest --run tests/renderer/theme/graphThemeMapping.test.ts`
     - `bunx eslint src/renderer/src/features/research/components/world/graph/**/*.{ts,tsx}`
   - Inspect: color decisions come from token/mapping helpers in view files.
   - Expected: tests/lint pass with no new raw color literals in touched views.

3. Responsive baseline:
   - add narrow-width behavior for sidebar collapse/stack
   - ensure graph header and sidebar controls degrade cleanly

   **QA Scenario**
   - Commands:
     - `bunx vitest --run tests/renderer/components/worldGraph/worldGraphPanel.responsive.test.tsx`
     - `bun run build`
   - Inspect: narrow viewport scenarios render usable controls without overflow break.
   - Expected: tests pass and production build succeeds.

### Exit Criteria

- No new hardcoded user-facing strings in graph files.
- Graph panel usable at narrow widths without layout break.

## 7) Execution Order (Strict)

1. Phase 0 tests
2. Phase 1 state consolidation
3. Phase 1 quality debt cleanup
4. Phase 2 model/commands
5. Phase 3 UX consistency

No phase skipping.

## 8) Verification Matrix

After each phase:

- `bun run typecheck`
- targeted renderer tests for modified scope
- `bun run build`
- lints for touched files

Additional phase-specific checks:

- Phase 1: verify no `localStorage` access remains in `WorldGraphPanel.tsx`
- Phase 2: verify auto-layout logic exists in one implementation site only
- Phase 3: verify translation keys exist for graph strings in both locales

## 8.1) Atomic Commit Strategy (TDD-aligned)

Each commit must be atomic and verifiable. Commit sequence template:

1. `test(graph): add failing spec for <single behavior>`
2. `feat(graph): implement <single behavior> to satisfy spec`
3. `refactor(graph): reduce duplication for <single behavior> (no behavior change)`

Rules:

- One behavior per commit (no mixed concerns).
- Every `feat/refactor` commit must reference an already-added or updated passing test.
- Never batch unrelated files in one commit.
- If a commit touches shared contracts, include explicit contract test update in same commit.

Planned commit groups by phase:

- Phase 0: 3 test commits (race/layout/relation).
- Phase 1: 5 behavior groups (ui store expansion, panel migration, sidebar contract cleanup, relation dialog, timeline typing).
- Phase 2: 5 behavior groups (model scaffolding, layout unification, batch persist, single-pass batch update, contract safety).
- Phase 3: 3 behavior groups (i18n, theme mapping, responsive baseline).

## 9) Immediate Sprint-1 Task Batch (Start Now)

1. Add failing-first tests for Sprint-1 targets (race/layout/relation + ui-store + panel + timeline typing)
   - Add/extend:
     - `tests/renderer/stores/worldBuildingStore.graph-race.test.ts`
     - `tests/renderer/components/worldGraph/autoLayout.persistence.test.tsx`
     - `tests/renderer/components/worldGraph/canvasEdgeRelation.edit.test.tsx`
     - `tests/renderer/stores/worldGraphUiStore.test.ts`
     - `tests/renderer/components/worldGraph/worldGraphPanel.uiState.test.tsx`
     - `tests/renderer/components/worldGraph/timelineView.typing.test.tsx`

   **QA Scenario**
   - Command: `bunx vitest --run tests/renderer/stores/worldBuildingStore.graph-race.test.ts tests/renderer/components/worldGraph/autoLayout.persistence.test.tsx tests/renderer/components/worldGraph/canvasEdgeRelation.edit.test.tsx tests/renderer/stores/worldGraphUiStore.test.ts tests/renderer/components/worldGraph/worldGraphPanel.uiState.test.tsx tests/renderer/components/worldGraph/timelineView.typing.test.tsx`
   - Inspect: red baseline is explicit — Phase 0 tests fail for race/layout/relation behavior and Phase 1 tests fail for missing store-driven ownership.
   - Expected: non-zero exit code due to intentional failing-first tests.

2. Implement UI-store migration to satisfy failing tests for state ownership
   - Move `activeTab`, `isSidebarOpen`, `sidebarWidth`, `selectedNodeId` to `worldGraphUiStore`

   **QA Scenario**
   - Command sequence:
     1. `bunx vitest --run tests/renderer/stores/worldGraphUiStore.test.ts tests/renderer/components/worldGraph/worldGraphPanel.uiState.test.tsx`
     2. `bun run typecheck`
   - Inspect: tests from task 1 that were red for UI ownership now pass via store-backed state.
   - Expected: exit code 0 for both commands.

3. Refactor `WorldGraphPanel.tsx` to consume moved state only
   - Remove duplicated local `useState` for moved session fields
   - Keep behavior parity for tab selection/sidebar interactions

   **QA Scenario**
   - Commands:
     - `bunx vitest --run tests/renderer/components/worldGraph/worldGraphPanel.uiState.test.tsx`
     - `bunx eslint src/renderer/src/features/research/components/world/graph/WorldGraphPanel.tsx`
   - Inspect: tab switching, sidebar toggle, and selection changes are driven via store calls.
   - Expected: tests/lint pass and no direct local panel session state regressions.

4. Remove direct `localStorage` calls from `WorldGraphPanel.tsx` and route persistence via store middleware

   **QA Scenario**
   - Commands:
     - `grep -n "localStorage" src/renderer/src/features/research/components/world/graph/WorldGraphPanel.tsx`
     - `bunx vitest --run tests/renderer/components/worldGraph/worldGraphPanel.uiState.test.tsx`
   - Inspect: grep returns no localStorage usage in panel file.
   - Expected: grep outputs zero matches (non-zero grep exit acceptable), and UI-state test remains green.

5. Introduce typed timeline event patch type and replace `any` signatures (TimelineTab/TimelineView)

   **QA Scenario**
   - Commands:
     - `grep -n "Record<string, any>\|as any" src/renderer/src/features/research/components/world/graph/views/TimelineView.tsx src/renderer/src/features/research/components/world/graph/tabs/TimelineTab.tsx`
     - `bun run typecheck`
     - `bunx vitest --run tests/renderer/components/worldGraph/timelineView.typing.test.tsx`
   - Inspect: no `any` signature remains in timeline tab/view API path.
   - Expected: zero grep matches for targeted files, typecheck clean, typing test pass.

### Sprint-1 Atomic Commit Sequence (Mandatory)

1. `test(graph): add failing tests for sprint-1 state and typing goals`
2. `feat(graph-ui-store): migrate panel ui state to worldGraphUiStore`
3. `refactor(graph-panel): remove local state and keep behavior parity`
4. `feat(graph-panel): remove panel localStorage and persist via store middleware`
5. `feat(graph-timeline): replace any-based patch with typed timeline event patch`
6. `refactor(graph): cleanup signatures and dead code touched by sprint-1`

## 10) Rollback Strategy

- Keep refactors behind small commits per phase.
- If a phase introduces instability, revert only that phase’s file set and keep prior tests.
- Preserve persisted payload contract to avoid data migration rollback complexity.
