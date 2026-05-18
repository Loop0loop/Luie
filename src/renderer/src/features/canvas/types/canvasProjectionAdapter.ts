/**
 * canvasProjectionAdapter.ts
 *
 * Pure conversion: WorldGraphData → CanvasProjection (legacy view-model
 * used by CanvasStatusBar for node/edge counts).
 *
 * Constraints:
 *   - No React, no store access, no IPC, no side-effects.
 *   - Lives in /types because it's a type-level transformation.
 *
 * NOTE: CanvasProjection is the legacy projection format kept for the
 * status bar. The React-Flow viewport uses {@link buildFlowGraph} from
 * ./canvasFlowAdapter instead.
 */

import type { WorldGraphData } from "@shared/types";
import type {
  CanvasProjection,
  CanvasProjectionEdge,
  CanvasProjectionNode,
} from "./canvasProjection.types";
import { ENTITY_TYPE_TO_NODE_KIND } from "./canvasProjection.types";
import type { CanvasMode, CanvasScope } from "./canvas.types";

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
