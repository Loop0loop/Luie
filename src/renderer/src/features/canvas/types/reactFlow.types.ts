/**
 * reactFlow.types.ts
 *
 * React-Flow specific node/edge data shapes used by the canvas viewport.
 * These are the `data` payloads attached to RF Node<T> / Edge<T>.
 *
 * Kept separate from canvasProjection.types.ts so the projection layer
 * stays framework-agnostic (P7 IPC replacement won't need to change types).
 */

import type { CanvasNodeKind } from "./canvasProjection.types";
import type {
  WorldGraphCanvasEdgeDirection,
} from "@shared/types";

// ─── Entity node (character / event / faction / term / world-entity / chapter) ─

export interface RFEntityNodeData {
  readonly kind: CanvasNodeKind;
  readonly label: string;
  readonly description?: string | null;
  readonly connectionCount: number;
  /** Whether this node is currently selected in canvasViewStore. */
  readonly isSelected: boolean;
}

// ─── Memo block node ──────────────────────────────────────────────────────────

export interface RFMemoNodeData {
  readonly title: string;
  readonly body: string;
  readonly tags: readonly string[];
  readonly color?: string;
}

// ─── Timeline block node ──────────────────────────────────────────────────────

export interface RFTimelineNodeData {
  readonly content: string;
  readonly isHeld: boolean;
  readonly color?: string;
}

// ─── Relation edge (entity ↔ entity from worldBuildingStore.edges) ────────────

export interface RFRelationEdgeData {
  readonly label: string;
  readonly color?: string;
  readonly direction: WorldGraphCanvasEdgeDirection;
}

// ─── Canvas edge (free-drawn edge from worldBuildingStore.canvasEdges) ─────────

export interface RFCanvasEdgeData {
  readonly label: string;
  readonly color?: string;
  readonly direction: WorldGraphCanvasEdgeDirection;
}
