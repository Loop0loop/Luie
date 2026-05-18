/**
 * Canvas feature core types.
 *
 * Phase 1 surface — view-model only. Projection/IPC types arrive in P5/P7.
 */

/** Visualization mode for the canvas viewport. */
export type CanvasMode =
  | "flow-map"
  | "scene-board"
  | "timeline"
  | "character-map"
  | "memory-map";

/** Modes that have a real implementation today. Other modes show "coming soon". */
export const CANVAS_AVAILABLE_MODES = ["flow-map", "scene-board"] as const;

export type CanvasAvailableMode = (typeof CANVAS_AVAILABLE_MODES)[number];

/**
 * Canvas type — determines which viewport is rendered.
 *
 * "dynamic" — scope-filtered view of a chapter's connected entities.
 *             Driven by useCanvasProjection (scope + mode).
 *
 * "static"  — free-form world-building canvas.
 *             Shows all project entities; nodes are draggable.
 *             Editing features (add/connect/delete) wired in a later phase.
 */
export type CanvasType = "dynamic" | "static";

/** Range of source data the canvas should render. */
export type CanvasRange =
  | "current-chapter"
  | "three-chapters"
  | "current-part"
  | "whole-project";

/** Layer toggles applied on top of the active mode/range. */
export type CanvasLayer =
  | "scene"
  | "character"
  | "event"
  | "memo"
  | "ai-hint";

/** Activity panel currently shown inside the canvas Sidebar. */
export type CanvasActivityPanel =
  | "explorer"
  | "canvas"
  | "entities"
  | "memory"
  | "search";

/**
 * Scope describes which subset of the project feeds the canvas viewport.
 *
 * `null` means the user has not chosen a scope yet — typically right after
 * switching into canvas mode without selecting a chapter. The empty-state UI
 * is responsible for showing the scope picker.
 */
export type CanvasScope =
  | { kind: "single-chapter"; chapterId: string }
  | { kind: "three-chapters"; centerChapterId: string }
  | { kind: "current-part"; partId: string }
  | { kind: "whole-project"; projectId: string };

/** Viewport pan/zoom state. */
export type CanvasViewport = {
  zoom: number;
  pan: { x: number; y: number };
};

/** Selected node/edge in the viewport. */
export type CanvasSelection =
  | { kind: "none" }
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string };
