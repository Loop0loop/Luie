
# LUIE Roadmap (Phase-based)

**Priority order**
1) Phase 1 (Data spine) → most important
2) Phase 0 (Urgent UX/dev fixes)
3) Phase 4 (Logging/Error)
4) Phase 2 (Performance)
5) Phase 3 (Optimization)
6) Phase 5 (Main modularization)
7) Phase 6 (Prisma schema)
8) Phase 7 (Dependency cleanup)

## Phase 0 - Baseline + Quick Fixes
- [ ] Fix `Cmd+N` for new chapter (no menu conflict, renderer receives shortcut)
- [ ] Fix current type/lint errors (tsc + eslint clean)
- [ ] Add basic loading UI for snapshot list/preview

**Definition of Done (DoD)**
- `Cmd+N` triggers `chapter.new` reliably on macOS
- `pnpm tsc --noEmit` passes
- Snapshot UI shows loading/empty/error states without blocking UI thread

## Phase 1 - Snapshot/Cache Source of Truth
- [x] Define `.luie` as master and `.db` as cache (doc + code rule)
- [x] Hydration: rebuild `.db` from `.luie` when db missing
- [x] Recovery: if `.luie` corrupted and db exists, export db back to `.luie`
- [x] Conflict policy: choose latest by updatedAt (default to `.luie` on open)
- [x] Snapshot export policy (full vs recent N, configurable)

**DoD**
- App opens with only `.luie` present and rebuilds db automatically
- Corrupted `.luie` + db present triggers recovery + user notice
- Snapshot data survives `.db` deletion

## Phase 2 - Snapshot Loading + UX
- [ ] Move snapshot load to background task/worker
- [ ] Paginate or virtualize snapshot list
- [ ] Add progress indicator and non-blocking UI

**DoD**
- Snapshot list scroll is smooth with large datasets
- No renderer freeze during snapshot load
- Clear loading/progress UI is visible

## Phase 3 - Renderer Performance Audit
- [ ] Profile SettingsModal open and scroll
- [ ] Reduce re-renders (memoization, selectors, derived state)
- [ ] Audit hooks/stores count and remove redundant state
- [ ] Check worker usage (stats.worker) and offload heavy tasks
- [ ] Verify zod/zustand schema guarantees and runtime validation
- [ ] Fix font rendering (contrast, font smoothing, weight)

**DoD**
- Settings modal opens fast and scrolls smoothly
- No unnecessary re-renders in profiler hot paths
- Renderer frame time stable under heavy projects

## Phase 4 - IPC + Error System Hardening
- [ ] Strengthen IPC contracts (typed request/response, timeout, retry)
- [ ] Add error taxonomy in `errorCode` (categories, severity)
- [ ] Expand logger `SYM` usage with structured context

**DoD**
- IPC calls have consistent result envelopes + trace IDs
- Errors are categorized and easy to search in logs

## Phase 5 - Main Process Modularization
- [ ] Split `src/main/index.ts` into lifecycle modules
- [ ] Keep index as orchestrator only
- [ ] Add DoD docs per module

**DoD**
- `index.ts` only wires modules
- Modules are testable and single-purpose

## Phase 6 - Prisma Schema Optimization
- [ ] Optimize snapshot/cache tables (indexes, pruning policy)
- [ ] Separate transient cache models from durable models
- [ ] Document lifecycle of cache vs master data

**DoD**
- Snapshot queries are indexed and fast
- Cache tables can be dropped and rebuilt safely

## Phase 7 - Dependency Cleanup
- [ ] Audit unused packages
- [ ] Remove overlaps and simplify tooling

**DoD**
- `package.json` only contains used dependencies
- Build/test still passes after cleanup

