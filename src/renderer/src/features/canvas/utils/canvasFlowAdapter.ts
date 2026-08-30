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
} from "@renderer/shared/constants/canvasSizing";
import type { CanvasProjection } from "../types/canvasProjection.types";
import type { RFEntityNodeData, RFRelationEdgeData } from "../types/reactFlow.types";

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

function buildNodes(
  projection: CanvasProjection,
): Node<RFEntityNodeData>[] {
  let autoIndex = 0;
  const connectionCounts = new Map<string, number>();
  for (const edge of projection.edges) {
    connectionCounts.set(edge.sourceId, (connectionCounts.get(edge.sourceId) ?? 0) + 1);
    connectionCounts.set(edge.targetId, (connectionCounts.get(edge.targetId) ?? 0) + 1);
  }

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
        rawId: node.id,
        kind: node.kind,
        label: node.label,
        description: node.description ?? null,
        connectionCount: connectionCounts.get(node.id) ?? 0,
        color: node.color,
      } satisfies RFEntityNodeData,
    };
  });
}

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
        rawId: e.id,
        label: e.label ?? "",
        color: e.color,
        direction: e.direction ?? "unidirectional",
      } satisfies RFRelationEdgeData,
    }));
}

export interface CanvasFlowGraph {
  nodes: Node[];
  edges: Edge[];
}

/**
 * scope/mode filtering이 끝난 projection만 ReactFlow node/edge로 변환한다.
 *
 * 선택 상태는 여기서 굽지 않는다. ReactFlow가 이미 node의 `selected`를 관리하는데
 * data에도 넣으면 노드를 고를 때마다 전체 node/edge 배열을 새로 만들어야 했다.
 */
export function buildFlowGraph(
  projection: CanvasProjection,
): CanvasFlowGraph {
  const nodes = buildNodes(projection);
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = buildEdges(projection, nodeIds);
  return { nodes, edges };
}
