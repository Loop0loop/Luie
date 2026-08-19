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

const parseAttrs = (raw: unknown): Record<string, unknown> | null => {
  if (!raw) return null;
  if (typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
};

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
    .map((node) => {
      const attrs = parseAttrs(node.attributes);
      return {
        id: node.id,
        kind: ENTITY_TYPE_TO_NODE_KIND[node.entityType] ?? "world-entity",
        label: node.name,
        x: node.positionX,
        y: node.positionY,
        description: node.description ?? null,
        color: typeof attrs?.color === "string" ? attrs.color : undefined,
      };
    });

  const nodeIds = new Set(nodes.map((n) => n.id));

  const edges: CanvasProjectionEdge[] = graphData.edges
    .filter((e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId))
    .map((e) => {
      const attrs = parseAttrs(e.attributes);
      return {
        id: e.id,
        sourceId: e.sourceId,
        targetId: e.targetId,
        label: e.relation,
        style: "solid" as const,
        color: typeof attrs?.color === "string" ? attrs.color : undefined,
        direction: typeof attrs?.direction === "string" ? (attrs.direction as never) : "unidirectional",
      };
    });

  return {
    nodes,
    edges,
    sourceVersion: buildSourceVersion(graphData),
  };
}
