import type { WorldEntitySourceType, WorldEntityType } from "@shared/types";

export type CanvasSurfaceTab =
  | "canvas"
  | "timeline"
  | "notes"
  | "entity"
  | "plugins";

/** @deprecated use CanvasSurfaceTab */
export type GraphSurfaceTab = CanvasSurfaceTab;

export type CanvasCreatePreset = {
  entityType: WorldEntitySourceType;
  subType?: WorldEntityType;
  label: string;
};

/** @deprecated use CanvasCreatePreset */
export type GraphCreatePreset = CanvasCreatePreset;

export const CANVAS_SURFACE_TABS: Array<{
  id: CanvasSurfaceTab;
  labelKey: string;
  icon: string;
}> = [
  { id: "canvas", labelKey: "canvas.tab.canvas", icon: "Network" },
  { id: "timeline", labelKey: "canvas.tab.timeline", icon: "CalendarRange" },
  { id: "notes", labelKey: "canvas.tab.notes", icon: "StickyNote" },
  { id: "entity", labelKey: "canvas.tab.entity", icon: "Users" },
  { id: "plugins", labelKey: "canvas.tab.plugins", icon: "Puzzle" },
];
