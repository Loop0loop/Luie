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

## Phase 0 — Guardrails First (2-3 days)

### Deliverables

- Add failing-first regression tests for known pain points.
- Freeze behavior contract before structural refactor.

### Tasks

1. Add `tests/renderer/stores/worldBuildingStore.graph-race.test.ts`
   - verifies stale load results do not overwrite newer local mutations
   - verifies persist queue order guarantees latest state wins
2. Add `tests/renderer/components/worldGraph/autoLayout.persistence.test.tsx`
   - verifies auto-layout does not re-fire on tab re-entry without trigger change
   - verifies auto-layout commit persists node positions
3. Add `tests/renderer/components/worldGraph/canvasEdgeRelation.edit.test.tsx`
   - verifies relation edit flow via UI command path (future dialog path)

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
2. Refactor `WorldGraphPanel.tsx` to consume store selectors/actions:
   - remove direct `localStorage.getItem/setItem`
   - remove duplicated local `useState` for above UI session fields
3. Clean `GraphActiveSidebar.tsx` interface:
   - remove dead/unused props from prop contract
   - split tab-specific sidebars into small files (`sidebars/CanvasSidebar.tsx`, etc.)
4. Replace `window.prompt` relation editing in `CanvasView.tsx` with shared dialog action path:
   - add a minimal controlled dialog component usage with i18n-ready label keys
5. Remove `any` from timeline update APIs:
   - introduce typed `TimelineEventAttributesPatch` in graph types
   - update `TimelineTab.tsx` + `TimelineView.tsx` signatures

### Exit Criteria

- `WorldGraphPanel` has no direct localStorage usage.
- `TimelineTab`/`TimelineView` no `any` in event update contract.
- Sidebars compile with slimmer, accurate prop signatures.

## Phase 2 — Model/Command Boundary + Batch/Indexed Updates (5-8 days)

### Deliverables

- Graph feature gets explicit internal model layer.
- Expensive multi-step updates moved to command functions.

### Tasks

1. Create `src/renderer/src/features/research/components/world/graph/model/`
   - `selectors.ts` (derived graph slices, memoized where beneficial)
   - `indexes.ts` (id-indexed maps generated from graphData)
   - `commands.ts` (node move batch, edge updates, layout apply)
2. Move auto-layout algorithm to one place (`commands.applyAutoLayout`) and reuse from UI.
3. Replace per-node persistence fan-out after layout with batch position command.
4. Refactor `worldBuildingStore.actions.ts` batch path to single-pass updates using id-index map.
5. Keep persistence output contract unchanged:
   - continue using `buildWorldGraphDocument(graphData)`

### Exit Criteria

- No duplicate auto-layout algorithm blocks.
- Node position updates use one batch command path.
- Internal indexed path exists; persisted output remains contract-compatible.

## Phase 3 — UX Consistency: i18n / Theme / Responsive (3-5 days)

### Deliverables

- Consistent localization and design system usage on graph surface.

### Tasks

1. i18n pass in graph surface files:
   - extract mixed literal strings to translation keys
   - add missing locale entries (ko/en)
2. Theme token pass:
   - replace hardcoded ad-hoc color values in view-layer components with semantic tokens where possible
   - keep entity-type color map but route through semantic mapping helpers
3. Responsive baseline:
   - add narrow-width behavior for sidebar collapse/stack
   - ensure graph header and sidebar controls degrade cleanly

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

## 9) Immediate Sprint-1 Task Batch (Start Now)

1. Add Phase 0 tests (race/layout/relation edit skeletons)
2. Move `activeTab`, `isSidebarOpen`, `sidebarWidth`, `selectedNodeId` to `worldGraphUiStore`
3. Refactor `WorldGraphPanel.tsx` to consume moved state
4. Remove direct `localStorage` calls from `WorldGraphPanel.tsx`
5. Introduce typed timeline event patch type and replace `any` signatures

## 10) Rollback Strategy

- Keep refactors behind small commits per phase.
- If a phase introduces instability, revert only that phase’s file set and keep prior tests.
- Preserve persisted payload contract to avoid data migration rollback complexity.
