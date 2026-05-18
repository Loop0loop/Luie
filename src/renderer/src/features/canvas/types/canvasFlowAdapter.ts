/**
 * canvasFlowAdapter.ts
 *
 * Pure conversion: CanvasProjection → React-Flow Node[] / Edge[].
 *
 * Constraints:
 *   - No React, no store access, no IPC, no side-effects.
 *   - Input is CanvasProjection (scope/mode-filtered view-model),
 *     NOT raw WorldGraphData — so scope filtering is always applied.
 *
 * Maps:
 *   CanvasProjectionNode → Node<RFEntityNodeData>
 *   CanvasProjectionEdge → Edge<RFRelationEdgeData>
 */

import type { Node, Edge } from "reactflow";
import {
  CANVAS_RF_NODE_TYPE_ENTITY,
  CANVAS_RF_EDGE_TYPE_RELATION,
  CANVAS_ENTITY_NODE_WIDTH_PX,
  CANVAS_ENTITY_NODE_HEIGHT_PX,
  CANVAS_GRID_COLS,
  CANVAS_GRID_GAP_X_PX,
  CANVAS_GRID_GAP_Y_PX,
  CANVAS_GRID_ORIGIN_X_PX,
  CANVAS_GRID_ORIGIN_Y_PX,
} from "@shared/constants/canvasSizing";
import type { CanvasProjection } from "./canvasProjection.types";
import type { RFEntityNodeData, RFRelationEdgeData } from "./reactFlow.types";

// ─── helpers ──────────────────────────────────────────────────────────────────

const hasPersistedPosition = (x: number, y: number): boolean =>
  x !== 0 || y !== 0;

function autoGridPosition(index: number): { x: number; y: number } {
  const col = index % CANVAS_GRID_COLS;
  const row = Math.floor(index / CANVAS_GRID_COLS);
  return {
    x: CANVAS_GRID_ORIGIN_X_PX + col * CANVAS_GRID_GAP_X_PX,
    y: CANVAS_GRID_ORIGIN_Y_PX + row * CANVAS_GRID_GAP_Y_PX,
  };
}

// ─── nodes ────────────────────────────────────────────────────────────────────

function buildNodes(
  projection: CanvasProjection,
  selectedNodeId: string | null,
): Node<RFEntityNodeData>[] {
  let autoIndex = 0;
  return projection.nodes.map((node) => {
    const position = hasPersistedPosition(node.x, node.y)
      ? { x: node.x, y: node.y }
      : autoGridPosition(autoIndex++);

    return {
      id: node.id,
      type: CANVAS_RF_NODE_TYPE_ENTITY,
      position,
      width: CANVAS_ENTITY_NODE_WIDTH_PX,
      height: CANVAS_ENTITY_NODE_HEIGHT_PX,
      data: {
        kind: node.kind,
        label: node.label,
        description: node.description ?? null,
        isSelected: node.id === selectedNodeId,
      } satisfies RFEntityNodeData,
    };
  });
}

// ─── edges ────────────────────────────────────────────────────────────────────

function buildEdges(
  projection: CanvasProjection,
  nodeIds: Set<string>,
): Edge<RFRelationEdgeData>[] {
  return projection.edges
    .filter((e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId))
    .map((e) => ({
      id: `rel-${e.id}`,
      type: CANVAS_RF_EDGE_TYPE_RELATION,
      source: e.sourceId,
      target: e.targetId,
      data: {
        label: e.label ?? "",
        color: undefined,
        direction: "unidirectional",
      } satisfies RFRelationEdgeData,
    }));
}

// ─── public API ───────────────────────────────────────────────────────────────

export interface CanvasFlowGraph {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Pure conversion: CanvasProjection + selectedNodeId → React-Flow nodes/edges.
 *
 * Projection is already scope/mode-filtered by useCanvasProjection.
 * Memoize on (projection, selectedNodeId) at the call site.
 */
export function buildFlowGraph(
  projection: CanvasProjection,
  selectedNodeId: string | null,
): CanvasFlowGraph {
  const nodes = buildNodes(projection, selectedNodeId);
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = buildEdges(projection, nodeIds);
  return { nodes, edges };
}
