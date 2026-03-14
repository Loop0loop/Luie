import { MarkerType, type Edge, type Node } from "reactflow";
import { type EntityRelation, type WorldGraphNode } from "@shared/types";
import { RELATION_COLORS } from "@shared/constants/world";
import {
  WORLD_GRAPH_FALLBACK_COLUMNS,
  WORLD_GRAPH_FALLBACK_X_STEP_PX,
  WORLD_GRAPH_FALLBACK_Y_STEP_PX,
  WORLD_GRAPH_MENU_MARGIN_PX,
} from "@shared/constants/worldGraphUI";

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const hashText = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getMenuPosition = (
  container: HTMLDivElement | null,
  clientX: number,
  clientY: number,
  width: number,
  height: number,
): { left: number; top: number } => {
  if (!container) {
    return { left: clientX, top: clientY };
  }

  const rect = container.getBoundingClientRect();
  const localLeft = clientX - rect.left;
  const localTop = clientY - rect.top;
  const maxLeft = Math.max(
    WORLD_GRAPH_MENU_MARGIN_PX,
    rect.width - width - WORLD_GRAPH_MENU_MARGIN_PX,
  );
  const maxTop = Math.max(
    WORLD_GRAPH_MENU_MARGIN_PX,
    rect.height - height - WORLD_GRAPH_MENU_MARGIN_PX,
  );

  return {
    left: clamp(localLeft, WORLD_GRAPH_MENU_MARGIN_PX, maxLeft),
    top: clamp(localTop, WORLD_GRAPH_MENU_MARGIN_PX, maxTop),
  };
};

export const readAttributePosition = (
  attributes: WorldGraphNode["attributes"],
): { x: number; y: number } | null => {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return null;
  }
  const graphPosition = (attributes as Record<string, unknown>).graphPosition;
  if (!graphPosition || typeof graphPosition !== "object" || Array.isArray(graphPosition)) {
    return null;
  }
  const x = (graphPosition as Record<string, unknown>).x;
  const y = (graphPosition as Record<string, unknown>).y;
  if (typeof x !== "number" || !Number.isFinite(x) || typeof y !== "number" || !Number.isFinite(y)) {
    return null;
  }
  return { x, y };
};

export const getFallbackPosition = (nodeId: string, index: number): { x: number; y: number } => {
  const hash = hashText(nodeId);
  const col = hash % WORLD_GRAPH_FALLBACK_COLUMNS;
  const row = Math.floor(index / WORLD_GRAPH_FALLBACK_COLUMNS);
  const waveOffsetX = row % 2 === 0 ? 0 : 90;
  const jitterX = (hash % 7) * 14 - 42;
  const jitterY = (Math.floor(hash / 7) % 7) * 12 - 36;
  return {
    x: col * WORLD_GRAPH_FALLBACK_X_STEP_PX + waveOffsetX + jitterX,
    y: row * WORLD_GRAPH_FALLBACK_Y_STEP_PX + jitterY,
  };
};

export const resolveEdgeHandles = (
  sourceNode: Node | undefined,
  targetNode: Node | undefined,
): { sourceHandle?: string; targetHandle?: string } => {
  if (!sourceNode || !targetNode) {
    return {};
  }

  const dx = targetNode.position.x - sourceNode.position.x;
  const dy = targetNode.position.y - sourceNode.position.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: "right", targetHandle: "left" }
      : { sourceHandle: "left", targetHandle: "right" };
  }

  return dy >= 0
    ? { sourceHandle: "bottom", targetHandle: "top" }
    : { sourceHandle: "top", targetHandle: "bottom" };
};

export function toRFNode(
  graphNode: WorldGraphNode,
  index: number,
  selectedNodeId: string | null,
): Node {
  const subType = graphNode.subType ?? graphNode.entityType;
  const importance = (graphNode.attributes?.importance ?? 3) as number;
  const explicitPosition =
    graphNode.positionX !== 0 || graphNode.positionY !== 0
      ? { x: graphNode.positionX, y: graphNode.positionY }
      : null;
  const attributePosition = readAttributePosition(graphNode.attributes);
  const fallbackPosition = getFallbackPosition(graphNode.id, index);

  return {
    id: graphNode.id,
    position: explicitPosition ?? attributePosition ?? fallbackPosition,
    data: {
      label: graphNode.name,
      subType,
      importance,
      entityType: graphNode.entityType,
      description: graphNode.description ?? null,
      firstAppearance: graphNode.firstAppearance ?? null,
      tags: (graphNode.attributes?.tags as string[] | undefined) ?? [],
    },
    selected: selectedNodeId === graphNode.id,
    type: "custom",
  };
}

export function toRFEdge(
  relation: EntityRelation,
  translate: (key: string, fallback: string) => string,
  nodeById: Map<string, Node>,
): Edge {
  const customColor = (relation.attributes as Record<string, unknown>)?.color as string | undefined;
  const color = customColor || RELATION_COLORS[relation.relation] || "#94a3b8";
  
  const { sourceHandle, targetHandle } = resolveEdgeHandles(
    nodeById.get(relation.sourceId),
    nodeById.get(relation.targetId),
  );

  const isAnimated = relation.relation === "causes" || relation.relation === "controls";
  const customLabel = (relation.attributes as Record<string, unknown>)?.label as string | undefined;

  return {
    id: relation.id,
    source: relation.sourceId,
    target: relation.targetId,
    sourceHandle,
    targetHandle,
    type: "customEdge",
    label: customLabel || translate(`world.graph.relationTypes.${relation.relation}`, relation.relation),
    labelStyle: { fontSize: 10, fill: color, fontWeight: 600 },
    labelBgStyle: { fill: "var(--bg-app, #0d0d0f)", fillOpacity: 0.85, rx: 4 },
    labelBgPadding: [4, 6] as [number, number],
    style: { stroke: color, strokeWidth: 2 },
    animated: isAnimated,
    markerEnd: { type: MarkerType.ArrowClosed, color },
  };
}
