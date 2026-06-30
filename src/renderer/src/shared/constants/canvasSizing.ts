/**
 * canvasSizing.ts
 *
 * Canvas feature sizing constants and React-Flow type keys.
 * Follows the same pattern as layoutSizing.ts / sidebarSizing.ts —
 * numbers and string keys only, no colour tokens (those live in
 * /features/canvas/types because they reference a renderer-only enum).
 *
 * Rules:
 *   - No React, no store imports — pure constants only.
 *   - React-Flow node/edge type keys are string literals defined here
 *     so every file that registers or references them uses the same value.
 */

// ─── Node geometry (px) ───────────────────────────────────────────────────────
// Document-style canvas cards: enough height for title, summary, and link count.

export const CANVAS_ENTITY_NODE_WIDTH_PX = 240 as const;
export const CANVAS_ENTITY_NODE_HEIGHT_PX = 132 as const;
export const CANVAS_MEMO_NODE_WIDTH_PX = 220 as const;
export const CANVAS_MEMO_NODE_MIN_HEIGHT_PX = 90 as const;
export const CANVAS_TIMELINE_NODE_WIDTH_PX = 240 as const;
export const CANVAS_TIMELINE_NODE_HEIGHT_PX = 64 as const;

// ─── Auto-layout grid (px) ────────────────────────────────────────────────────

export const CANVAS_GRID_COLS = 5 as const;
export const CANVAS_GRID_GAP_X_PX = 280 as const;
export const CANVAS_GRID_GAP_Y_PX = 170 as const;
export const CANVAS_GRID_ORIGIN_X_PX = 80 as const;
export const CANVAS_GRID_ORIGIN_Y_PX = 80 as const;

// ─── Viewport zoom ────────────────────────────────────────────────────────────

export const CANVAS_ZOOM_MIN = 0.15 as const;
export const CANVAS_ZOOM_MAX = 3 as const;
export const CANVAS_ZOOM_STEP = 0.15 as const;
export const CANVAS_FIT_VIEW_PADDING = 0.12 as const;

// ─── React-Flow node type keys ────────────────────────────────────────────────
// Single source of truth — used in nodeTypes map and node.type field.

export const CANVAS_RF_NODE_TYPE_ENTITY = "entity" as const;
export const CANVAS_RF_NODE_TYPE_MEMO = "memo" as const;
export const CANVAS_RF_NODE_TYPE_TIMELINE = "timeline" as const;

export const CANVAS_RF_EDGE_TYPE_RELATION = "relation" as const;
export const CANVAS_RF_EDGE_TYPE_CANVAS = "canvas" as const;

// ─── Workspace resizable layout config ────────────────────────────────────────

export const CANVAS_ACTIVITY_LAYOUT_CONFIG = {
  role: "sidebar" as const,
  defaultRatio: 18,
  minPx: 220,
  maxPx: 380,
};

export const CANVAS_BINDER_LAYOUT_CONFIG = {
  role: "inspector" as const,
  defaultRatio: 19,
  minPx: 220,
  maxPx: 420,
};
