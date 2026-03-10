# Renderer Performance Budget (D1 & D2)

This document establishes the quantitative performance baselines and budgets for the Luie Renderer process. It serves as the standard against which memory leaks, rendering inefficiencies, and blocking operations are measured.

## 1. Core Performance Budgets (D1)

We define three primary metrics for a smooth, app-like user experience.

### A. Typing Latency
- **Target:** `< 50ms` (time from keystroke to visual update).
- **Measurement:** 100,000-character manuscript editing scenario.
- **Enforcement:** Achieved via `useBufferedInput`. Editor state changes must not trigger expensive global React topology re-renders.

### B. UI Responsiveness (Search & Filtering)
- **Target:** `< 100ms` for typical filters, `< 200ms` for massive datasets.
- **Measurement:** Filtering 5,000 World Nodes or searching across 10,000 Memo scraps.
- **Enforcement:** 
  - Debounced input.
  - Web Workers for heavy text searching (if necessary).
  - Virtualization (`react-window` or custom) for all lists > 100 items to prevent DOM bloating.

### C. Memory Baseline
- **Target:** Memory should "converge" after typical usage spikes, not climb infinitely.
- **Measurement:** Opening and closing 10 different documents/tabs sequentially.
- **Enforcement:** Strict enforcement of cleanup functions (`return () => observer.disconnect()`, `removeEventListener`, `clearTimeout`) in `useEffect`.

## 2. Profiling & Observability (D2)

### A. React Profiler & Render Discipline
- Component re-renders are tracked during development using the React Profiler.
- Zustand global stores (`useProjectStore`, `useEditorStore`) **must** use `useShallow` when subscribing to object/array states to prevent cascading renders.

### B. List Virtualization
- By default, massive lists (e.g., Snapshots, Search Results, World Nodes) must employ virtual lists. DOM nodes should remain proportional to the viewport height, irrespective of state size.

### C. Error Boundaries (E Guideline crossover)
- When the budget fails critically (e.g., UI freeze leading to an exception), the `FeatureErrorBoundary` and `GlobalErrorBoundary` step in.
- These boundaries ensure the application recovers gracefully, attempts an emergency auto-save, and prevents data loss.

## 3. Operational Measurement Points

These event names are the baseline instrumentation points that should remain stable across releases.

- `bootstrap.ensure-ready`
  Target: `< 1500ms` on a healthy local DB.
- `persist.rehydrate.ui-store`
  Target: `< 50ms`.
- `persist.rehydrate.project-layout-store`
  Target: `< 50ms`.
- `project-init.startup-loads`
  Target: `< 400ms` for project list + editor settings.
- `project-init.project-switch-loads`
  Target: `< 500ms` for chapters + characters + terms on a typical project.
- `memo-store.load-notes`
  Target: `< 120ms` for a typical project.
- `renderer.startup.setupRenderer`
  Target: `< 300ms`.
- `renderer.startup.initI18n`
  Target: `< 150ms`.

## 4. Regression Rule

- New features must reuse existing event names when extending an existing flow.
- New performance-sensitive flows must emit a structured `performance` event before release.
- If a baseline is exceeded repeatedly in release testing, the PR must either optimize the flow or update this document with an explicit justification.
