/**
 * canvasProjectionClient — Phase 0 adapter.
 *
 * Converts worldBuildingStore.graphData into a CanvasProjection.
 * P7 will replace this with a window.api.canvas.projection.get() IPC call.
 *
 * Filtering strategy (P5):
 *   - scope === null → empty projection (show empty state)
 *   - scope.kind === "single-chapter" → all nodes from graphData (no chapter-
 *     level filtering yet; P7 will add chapter-scoped projection from DB)
 *   - other scope kinds → same as single-chapter for now
 *
 * Mode filtering (P5):
 *   - flow-map / scene-board → all entity nodes + relations
 *   - other modes → same (P7 will add mode-specific layouts)
 */
import type { WorldGraphData } from "@shared/types";
import type {
  CanvasProjection,
  CanvasProjectionEdge,
  CanvasProjectionNode,
} from "../types/canvasProjection.types";
import { ENTITY_TYPE_TO_NODE_KIND } from "../types/canvasProjection.types";
import type { CanvasMode, CanvasScope } from "../types/canvas.types";

/** Build a stable source version token from graphData. */
function buildSourceVersion(graphData: WorldGraphData | null): string {
  if (!graphData) return "empty";
  return `nodes:${graphData.nodes.length}|edges:${graphData.edges.length}`;
}

/** Convert WorldGraphData → CanvasProjection for the given mode/scope. */
export function buildProjection(
  graphData: WorldGraphData | null,
  _mode: CanvasMode,
  scope: CanvasScope | null,
): CanvasProjection {
  const empty: CanvasProjection = {
    nodes: [],
    edges: [],
    sourceVersion: buildSourceVersion(graphData),
  };

  if (!scope || !graphData) return empty;

  // P5: no chapter-level filtering — show all entity nodes.
  // P7 will filter by chapter appearance data from the DB.
  const nodes: CanvasProjectionNode[] = graphData.nodes.map((node) => ({
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
