/**
 * canvasFlowAdapter.ts
 *
 * Pure conversion: WorldGraphData → React-Flow Node[] / Edge[].
 *
 * Constraints:
 *   - No React, no store access, no IPC, no side-effects.
 *   - Lives in /types because it's a type-level transformation between
 *     domain types (WorldGraphData) and view types (RF Node/Edge data).
 *   - When the projection moves to main process (later phase), this file
 *     becomes a renderer-side fallback / type contract.
 *
 * Maps:
 *   WorldGraphNode          → Node<RFEntityNodeData>
 *   WorldGraphCanvasBlock   → Node<RFMemoNodeData | RFTimelineNodeData>
 *   EntityRelation          → Edge<RFRelationEdgeData>
 *   WorldGraphCanvasEdge    → Edge<RFCanvasEdgeData>
 */

import type { Node, Edge } from "reactflow";
import type { WorldGraphData } from "@shared/types";
import {
  CANVAS_RF_NODE_TYPE_ENTITY,
  CANVAS_RF_NODE_TYPE_MEMO,
  CANVAS_RF_NODE_TYPE_TIMELINE,
  CANVAS_RF_EDGE_TYPE_RELATION,
  CANVAS_RF_EDGE_TYPE_CANVAS,
  CANVAS_ENTITY_NODE_WIDTH_PX,
  CANVAS_ENTITY_NODE_HEIGHT_PX,
  CANVAS_MEMO_NODE_WIDTH_PX,
  CANVAS_MEMO_NODE_MIN_HEIGHT_PX,
  CANVAS_TIMELINE_NODE_WIDTH_PX,
  CANVAS_TIMELINE_NODE_HEIGHT_PX,
  CANVAS_GRID_COLS,
  CANVAS_GRID_GAP_X_PX,
  CANVAS_GRID_GAP_Y_PX,
  CANVAS_GRID_ORIGIN_X_PX,
  CANVAS_GRID_ORIGIN_Y_PX,
} from "@shared/constants/canvasSizing";
import { ENTITY_TYPE_TO_NODE_KIND } from "./canvasProjection.types";
import type {
  RFEntityNodeData,
  RFMemoNodeData,
  RFTimelineNodeData,
  RFRelationEdgeData,
  RFCanvasEdgeData,
} from "./reactFlow.types";

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

// ─── entity nodes ─────────────────────────────────────────────────────────────

function buildEntityNodes(
  graphData: WorldGraphData,
  selectedNodeId: string | null,
): Node<RFEntityNodeData>[] {
  let autoIndex = 0;
  return graphData.nodes.map((node) => {
    const position = hasPersistedPosition(node.positionX, node.positionY)
      ? { x: node.positionX, y: node.positionY }
      : autoGridPosition(autoIndex++);

    return {
      id: node.id,
      type: CANVAS_RF_NODE_TYPE_ENTITY,
      position,
      width: CANVAS_ENTITY_NODE_WIDTH_PX,
      height: CANVAS_ENTITY_NODE_HEIGHT_PX,
      data: {
        kind: ENTITY_TYPE_TO_NODE_KIND[node.entityType] ?? "world-entity",
        label: node.name,
        description: node.description ?? null,
        isSelected: node.id === selectedNodeId,
      } satisfies RFEntityNodeData,
    };
  });
}

// ─── canvas block nodes ───────────────────────────────────────────────────────

function buildBlockNodes(
  graphData: WorldGraphData,
): Node<RFMemoNodeData | RFTimelineNodeData>[] {
  const blocks = graphData.canvasBlocks ?? [];
  return blocks.map((block) => {
    const position = hasPersistedPosition(block.positionX, block.positionY)
      ? { x: block.positionX, y: block.positionY }
      : { x: CANVAS_GRID_ORIGIN_X_PX, y: CANVAS_GRID_ORIGIN_Y_PX };

    if (block.type === "memo") {
      return {
        id: block.id,
        type: CANVAS_RF_NODE_TYPE_MEMO,
        position,
        width: CANVAS_MEMO_NODE_WIDTH_PX,
        height: CANVAS_MEMO_NODE_MIN_HEIGHT_PX,
        data: {
          title: block.data.title,
          body: block.data.body,
          tags: block.data.tags,
          color: block.data.color,
        } satisfies RFMemoNodeData,
      };
    }

    return {
      id: block.id,
      type: CANVAS_RF_NODE_TYPE_TIMELINE,
      position,
      width: CANVAS_TIMELINE_NODE_WIDTH_PX,
      height: CANVAS_TIMELINE_NODE_HEIGHT_PX,
      data: {
        content: block.data.content,
        isHeld: block.data.isHeld,
        color: block.data.color,
      } satisfies RFTimelineNodeData,
    };
  });
}

// ─── relation edges ───────────────────────────────────────────────────────────

function buildRelationEdges(
  graphData: WorldGraphData,
  nodeIds: Set<string>,
): Edge<RFRelationEdgeData>[] {
  return graphData.edges
    .filter((e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId))
    .map((e) => ({
      id: `rel-${e.id}`,
      type: CANVAS_RF_EDGE_TYPE_RELATION,
      source: e.sourceId,
      target: e.targetId,
      data: {
        label: e.relation ?? "",
        color: undefined,
        direction: "unidirectional",
      } satisfies RFRelationEdgeData,
    }));
}

// ─── canvas edges ─────────────────────────────────────────────────────────────

function buildCanvasEdges(
  graphData: WorldGraphData,
  allNodeIds: Set<string>,
): Edge<RFCanvasEdgeData>[] {
  const canvasEdges = graphData.canvasEdges ?? [];
  return canvasEdges
    .filter((e) => allNodeIds.has(e.sourceId) && allNodeIds.has(e.targetId))
    .map((e) => ({
      id: `canvas-${e.id}`,
      type: CANVAS_RF_EDGE_TYPE_CANVAS,
      source: e.sourceId,
      sourceHandle: e.sourceHandle,
      target: e.targetId,
      targetHandle: e.targetHandle,
      data: {
        label: e.relation ?? "",
        color: e.color,
        direction: e.direction ?? "unidirectional",
      } satisfies RFCanvasEdgeData,
    }));
}

// ─── public API ───────────────────────────────────────────────────────────────

export interface CanvasFlowGraph {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Pure conversion: WorldGraphData + selection → React-Flow nodes/edges.
 * Memoise on (graphData, selectedNodeId) at the call site.
 */
export function buildFlowGraph(
  graphData: WorldGraphData | null,
  selectedNodeId: string | null,
): CanvasFlowGraph {
  if (!graphData) return { nodes: [], edges: [] };

  const entityNodes = buildEntityNodes(graphData, selectedNodeId);
  const blockNodes = buildBlockNodes(graphData);
  const nodes: Node[] = [...entityNodes, ...blockNodes];

  const allNodeIds = new Set(nodes.map((n) => n.id));
  const edges: Edge[] = [
    ...buildRelationEdges(graphData, allNodeIds),
    ...buildCanvasEdges(graphData, allNodeIds),
  ];

  return { nodes, edges };
}
