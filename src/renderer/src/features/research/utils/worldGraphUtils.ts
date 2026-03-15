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
  if (
    !sourceNode ||
    !targetNode ||
    !sourceNode.position ||
    !targetNode.position ||
    typeof sourceNode.position.x !== "number" ||
    typeof sourceNode.position.y !== "number" ||
    typeof targetNode.position.x !== "number" ||
    typeof targetNode.position.y !== "number"
  ) {
    return {};
  }

  const dx = targetNode.position.x - sourceNode.position.x;
  const dy = targetNode.position.y - sourceNode.position.y;

  // TimelineNode일 경우 전용 Handle ID(`timeline-*`, `branch-*`)를 사용하도록 분기
  const isTargetTimeline = targetNode.type === "timeline";
  const isSourceTimeline = sourceNode.type === "timeline";

  const resolveSourceHandle = (handle: "left" | "right" | "top" | "bottom") => {
    if (isSourceTimeline) {
      if (handle === "left") return "source-timeline-prev";
      if (handle === "right") return "source-timeline-next";
      if (handle === "top") return "source-branch-top";
      return "source-branch-bottom";
    }
    return `source-${handle}`;
  };

  const resolveTargetHandle = (handle: "left" | "right" | "top" | "bottom") => {
    if (isTargetTimeline) {
      if (handle === "left") return "target-timeline-prev";
      if (handle === "right") return "target-timeline-next";
      if (handle === "top") return "target-branch-in-top";
      return "target-branch-in-bottom";
    }
    return `target-${handle}`;
  };

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? {
          sourceHandle: resolveSourceHandle("right"),
          targetHandle: resolveTargetHandle("left"),
        }
      : {
          sourceHandle: resolveSourceHandle("left"),
          targetHandle: resolveTargetHandle("right"),
        };
  }

  return dy >= 0
    ? {
        sourceHandle: resolveSourceHandle("bottom"),
        targetHandle: resolveTargetHandle("top"),
      }
    : {
        sourceHandle: resolveSourceHandle("top"),
        targetHandle: resolveTargetHandle("bottom"),
      };
};

export function toRFNode(
  graphNode: WorldGraphNode,
  index: number,
  selectedNodeId: string | null,
): Node {
  const subType = graphNode.subType ?? graphNode.entityType;
  const subTypeLabel = typeof graphNode.subType === "string" ? graphNode.subType : "";
  const isNoteVariant =
    graphNode.entityType === "Concept" &&
    ((subTypeLabel as string) === "Note" ||
      (graphNode.attributes &&
        typeof graphNode.attributes === "object" &&
        !Array.isArray(graphNode.attributes) &&
        (graphNode.attributes as Record<string, unknown>).uiVariant === "note"));
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
      isNote: isNoteVariant,
      description: graphNode.description ?? null,
      firstAppearance: graphNode.firstAppearance ?? null,
      tags: (graphNode.attributes?.tags as string[] | undefined) ?? [],
      // TimelineNode를 위한 엔티티 연결 데이터 예시 (차후 고도화 필요)
      connectedEntities: (graphNode.attributes?.connectedEntities as Array<{id: string, name: string, type: string}>) || [],
      date: (graphNode.attributes?.date as string) || undefined,
    },
    selected: selectedNodeId === graphNode.id,
    type: graphNode.entityType === "Event" ? "timeline" : "custom",
  };
}

export const isRenderableRFNode = (node: Node | null | undefined): node is Node => {
  if (!node || typeof node.id !== "string" || node.id.length === 0) {
    return false;
  }
  const position = node.position;
  return Boolean(
    position &&
      typeof position.x === "number" &&
      Number.isFinite(position.x) &&
      typeof position.y === "number" &&
      Number.isFinite(position.y) &&
      typeof node.type === "string" &&
      node.type.length > 0,
  );
};

export function toRFEdge(
  relation: EntityRelation,
  translate: (key: string, fallback: string) => string,
  nodeById: Map<string, Node>,
): Edge | null {
  const sourceNode = nodeById.get(relation.sourceId);
  const targetNode = nodeById.get(relation.targetId);
  if (!isRenderableRFNode(sourceNode) || !isRenderableRFNode(targetNode)) {
    return null;
  }
  const customColor = (relation.attributes as Record<string, unknown>)?.color as string | undefined;
  const color = customColor || RELATION_COLORS[relation.relation] || "#94a3b8";
  
  const { sourceHandle, targetHandle } = resolveEdgeHandles(
    sourceNode,
    targetNode,
  );

  const isAnimated = relation.relation === "causes" || relation.relation === "controls";
  const customLabel = (relation.attributes as Record<string, unknown>)?.label as string | undefined;

  // 두 노드가 모두 Event(Timeline) 타입일 경우 타임라인 특화 엣지 사용
  const isTimelineConnection = 
    sourceNode.data?.entityType === "Event" && 
    targetNode.data?.entityType === "Event";

  return {
    id: relation.id,
    source: relation.sourceId,
    target: relation.targetId,
    sourceHandle,
    targetHandle,
    type: isTimelineConnection ? "timelineEdge" : "customEdge",
    animated: isTimelineConnection ? true : isAnimated,
    label: customLabel || translate(`world.graph.relationTypes.${relation.relation}`, relation.relation),
    labelStyle: { fontSize: 10, fill: color, fontWeight: 600 },
    labelBgStyle: { fill: "var(--bg-app, #0d0d0f)", fillOpacity: 0.85, rx: 4 },
    labelBgPadding: [4, 6] as [number, number],
    style: { stroke: color, strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color },
  };
}
