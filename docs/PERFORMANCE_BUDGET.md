# Renderer Performance Budget

> This document defines the three core performance budgets for the Luie renderer.
> All measurements should be taken with React DevTools Profiler and Chrome DevTools Memory tab
> on a mid-range laptop (e.g., Apple M1 base, 8 GB RAM) in production build (`pnpm preview`).

---

## Budget 1 — Typing Input Latency

| Metric | Budget | How to Measure |
|---|---|---|
| Keystroke-to-screen latency (Tiptap editor) | **< 50ms** | Chrome DevTools → Performance tab → record while typing, measure event → paint gap |
| Autosave debounce (idle trigger) | 1000ms (configurable in `EDITOR_AUTOSAVE_DEBOUNCE_MS`) | Currently set, verify not blocking input thread |

**Rationale:** The editor is the core experience. Input lag above 50ms is perceptible and degrades the writing flow.

**Current Architecture:**
- `useBufferedInput.ts` wraps Tiptap with debouncing
- `useEditorAutosave.ts` debounces at `EDITOR_AUTOSAVE_DEBOUNCE_MS` (do not reduce below 500ms)

**Warning signs to watch:**
- Tiptap ProseMirror state updates firing synchronously on every keystroke with expensive node transforms
- Smart-link scanning (`smartLinkService`) running on every input event

---

## Budget 2 — List Scroll Performance

| Metric | Budget | How to Measure |
|---|---|---|
| Chapter list scroll (≤ 1,000 items) | No visible jank (60 fps) | React Profiler → record while scrolling fast |
| Memory baseline per list item | < 2KB average | DevTools → Memory → heap snapshot |

**Current Architecture:** `react-virtuoso` is applied in:
- `Sidebar.tsx` (chapter list)
- `SnapshotList.tsx`
- `MemoSidebarList.tsx`

**Action if budget fails:** Ensure `itemContent` renders use stable `useCallback` and item identifiers are stable (not index-based).

---

## Budget 3 — View-Switch Memory Convergence

| Metric | Budget | How to Measure |
|---|---|---|
| Heap growth after 10 view switches | Converges (does not monotonically increase) | DevTools → Memory → take snapshots before/after 10 switches, compare delta |
| Editor unmount cleanup | All timers cleared, all IPC subscriptions unsubscribed | Manual code audit + memory profiler detached node count |

**Current Architecture:**
- `useEditorAutosave.ts` has `isMountedRef` guard and clears all 3 timers on unmount ✅
- `SmartLinkTooltip.tsx` clears all document event listeners on unmount ✅
- All IPC `onStatusChanged` subscriptions call `unsubscribe()` in `useEffect` cleanup ✅

**Warning signs to watch:**
- `EditorRoot` re-creating `useSplitView` panels without cleaning up old panel state
- Large Tiptap document JSON being retained in memory after chapter switch

---

## Measurement Checklist

Before each major release, verify:

- [ ] Type 200 characters in editor, record Performance trace — no frame > 50ms
- [ ] Scroll chapter list with 200+ items — no dropped frames in Profiler
- [ ] Open 10 chapters sequentially, take heap snapshots — heap is stable ±10%
- [ ] Network disconnect test — `OfflineBanner` renders within 1 second

---

## 측정 일지

| 날짜 | 환경 | Budget 1 | Budget 2 | Budget 3 | 비고 |
|---|---|---|---|---|---|
| (측정 전) | — | TBD | TBD | TBD | 기준선 미수립 |
