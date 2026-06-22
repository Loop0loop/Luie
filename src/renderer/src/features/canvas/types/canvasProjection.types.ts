/**
 * CanvasProjection — the view-model fed to CanvasViewport.
 *
 * P5 (Phase 0 adapter): built from worldBuildingStore.graphData.
 * P7 will replace the adapter with an IPC call to the main process.
 */
import type { WorldEntitySourceType } from "@shared/types";

/** Visual kind drives colour + icon in the viewport. */
export type CanvasNodeKind =
  | "chapter"
  | "character"
  | "event"
  | "faction"
  | "term"
  | "world-entity";

export interface CanvasProjectionNode {
  id: string;
  kind: CanvasNodeKind;
  label: string;
  /** Persisted layout position (may be 0,0 if not yet placed). */
  x: number;
  y: number;
  /** Optional short description shown in tooltip / inspector. */
  description?: string | null;
}

export type CanvasEdgeStyle = "solid" | "dashed";

export interface CanvasProjectionEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  style: CanvasEdgeStyle;
}

export interface CanvasProjection {
  nodes: CanvasProjectionNode[];
  edges: CanvasProjectionEdge[];
  /** Source version token — used for stale detection in P7. */
  sourceVersion: string;
}

export type CanvasProjectionStatus =
  | "idle"
  | "loading"
  | "ready"
  | "error";

/** Maps WorldEntitySourceType → CanvasNodeKind */
export const ENTITY_TYPE_TO_NODE_KIND: Record<
  WorldEntitySourceType,
  CanvasNodeKind
> = {
  Character: "character",
  Faction: "faction",
  Event: "event",
  Term: "term",
  Place: "world-entity",
  Concept: "world-entity",
  Rule: "world-entity",
  Item: "world-entity",
  WorldEntity: "world-entity",
};
