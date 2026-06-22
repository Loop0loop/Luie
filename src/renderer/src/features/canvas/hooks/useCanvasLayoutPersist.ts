/**
 * useCanvasLayoutPersist — wraps {@link useLayoutPersist} with the canvas
 * panel ids fixed to `canvas-activity` / `canvas-binder`.
 *
 * Same persistence model as ScrivenerLayout / MainLayout: react-resizable-panels
 * fires `onLayoutChanged` after each drag with stable percentages, which we
 * commit to `uiStore.layoutSurfaceRatios["canvas.activity" | "canvas.binder"]`.
 *
 * Caller wires the returned callback to `<PanelGroup onLayoutChanged={...}>`.
 */
import {
  useLayoutPersist,
  type LayoutPersistEntry,
} from "@renderer/features/workspace/hooks/useLayoutPersist";

const CANVAS_LAYOUT_ENTRIES: LayoutPersistEntry[] = [
  { id: "canvas-activity", surface: "canvas.activity" },
  { id: "canvas-binder", surface: "canvas.binder" },
];

export function useCanvasLayoutPersist(projectId?: string | null) {
  return useLayoutPersist(CANVAS_LAYOUT_ENTRIES, { projectId });
}
