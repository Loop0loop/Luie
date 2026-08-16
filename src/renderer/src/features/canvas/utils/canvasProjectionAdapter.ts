import type { WorldGraphData } from "@shared/types";
import type {
  CanvasProjection,
  CanvasProjectionEdge,
  CanvasProjectionNode,
} from "../types/canvasProjection.types";
import { ENTITY_TYPE_TO_NODE_KIND } from "../types/canvasProjection.types";
import type { CanvasMode, CanvasScope } from "../types/canvas.types";

function buildSourceVersion(graphData: WorldGraphData | null): string {
  if (!graphData) return "empty";
  return `nodes:${graphData.nodes.length}|edges:${graphData.edges.length}`;
}

/** CanvasStatusBar 호환용 legacy projection을 만든다. ReactFlow는 `buildFlowGraph`를 사용한다. */
export function buildProjection(
  graphData: WorldGraphData | null,
  _mode: CanvasMode,
  scope: CanvasScope | null,
  focuses: readonly string[] = [],
): CanvasProjection {
  const empty: CanvasProjection = {
    nodes: [],
    edges: [],
    sourceVersion: buildSourceVersion(graphData),
  };

  if (!scope || !graphData) return empty;
  const focusIds = new Set(focuses);

  const nodes: CanvasProjectionNode[] = graphData.nodes
    .filter((node) => focusIds.size === 0 || focusIds.has(node.id))
    .map((node) => ({
      id: node.id,
      kind: ENTITY_TYPE_TO_NODE_KIND[node.entityType] ?? "world-entity",
      label: node.name,
      x: node.positionX,
      y: node.positionY,
      description: node.description ?? null,
    }));

  const nodeIds = new Set(nodes.map((n) => n.id));

  const edges: CanvasProjectionEdge[] = graphData.edges
    .filter((e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId))
    .map((e) => ({
      id: e.id,
      sourceId: e.sourceId,
      targetId: e.targetId,
      label: e.relation,
      style: "solid" as const,
    }));

  return {
    nodes,
    edges,
    sourceVersion: buildSourceVersion(graphData),
  };
}
