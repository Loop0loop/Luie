import {
  useLayoutPersist,
  type LayoutPersistEntry,
} from "@renderer/features/workspace/hooks/useLayoutPersist";

const CANVAS_LAYOUT_ENTRIES: LayoutPersistEntry[] = [
  { id: "canvas-activity", index: 0, surface: "canvas.activity" },
  { id: "canvas-binder", index: 2, surface: "canvas.binder" },
];

export function useCanvasLayoutPersist(projectId?: string | null) {
  return useLayoutPersist(CANVAS_LAYOUT_ENTRIES, { projectId });
}
