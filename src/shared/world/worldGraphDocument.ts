import { isWorldEntityBackedType } from "../constants/worldRelationRules.js";
import type {
  EntityRelation,
  WorldGraphCanvasBlock,
  WorldGraphCanvasEdge,
  WorldGraphCanvasEdgeDirection,
  WorldGraphCanvasMemoBlockData,
  WorldGraphCanvasTimelineBlockData,
  WorldGraphData,
  WorldGraphNode,
  WorldTimelineTrack,
  WorldTimelineSegment,
} from "../types/index.js";

type GraphNodeDocument = Pick<
  WorldGraphNode,
  | "id"
  | "entityType"
  | "subType"
  | "name"
  | "description"
  | "firstAppearance"
  | "attributes"
  | "positionX"
  | "positionY"
>;

type GraphDocumentPayload = {
  nodes?: GraphNodeDocument[];
  edges?: EntityRelation[];
  canvasBlocks?: WorldGraphCanvasBlock[];
  canvasEdges?: WorldGraphCanvasEdge[];
  timelines?: WorldTimelineTrack[];
  updatedAt?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const toFiniteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const normalizeTimelines = (value: unknown): WorldTimelineTrack[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: WorldTimelineTrack[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== "string") {
      continue;
    }

    const segments: WorldTimelineSegment[] = [];
    if (Array.isArray(item.segments)) {
      for (const seg of item.segments) {
        if (!isRecord(seg) || typeof seg.id !== "string") {
          continue;
        }
        segments.push({
          id: seg.id,
          name: typeof seg.name === "string" ? seg.name : "New Segment",
        });
      }
    }

    normalized.push({
      id: item.id,
      name: typeof item.name === "string" ? item.name : "New Timeline",
      segments,
    });
  }
  return normalized;
};

const normalizeTimelineData = (
  value: unknown,
): WorldGraphCanvasTimelineBlockData => {
  if (!isRecord(value)) {
    return {
      content: "",
      isHeld: false,
    };
  }

  const sequenceFallback = Array.isArray(value.sequence)
    ? value.sequence
        .map((item) =>
          isRecord(item) && typeof item.content === "string"
            ? item.content
            : null,
        )
        .find((item): item is string => Boolean(item && item.length > 0))
    : null;

  return {
    content:
      typeof value.content === "string"
        ? value.content
        : typeof value.label === "string"
          ? value.label
          : (sequenceFallback ?? ""),
    isHeld: value.isHeld === true,
    color: typeof value.color === "string" ? value.color : undefined,
  };
};

const normalizeMemoData = (value: unknown): WorldGraphCanvasMemoBlockData => {
  if (!isRecord(value)) {
    return {
      title: "",
      tags: [],
      body: "",
    };
  }

  return {
    title: typeof value.title === "string" ? value.title : "",
    tags: Array.isArray(value.tags)
      ? value.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    body: typeof value.body === "string" ? value.body : "",
    color: typeof value.color === "string" ? value.color : undefined,
  };
};

const normalizeCanvasEdgeDirection = (
  value: unknown,
): WorldGraphCanvasEdgeDirection => {
  if (
    value === "unidirectional" ||
    value === "bidirectional" ||
    value === "none"
  ) {
    return value;
  }

  return "unidirectional";
};

const normalizeCanvasEdges = (value: unknown): WorldGraphCanvasEdge[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const edges: WorldGraphCanvasEdge[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    if (
      typeof item.id !== "string" ||
      typeof item.sourceId !== "string" ||
      typeof item.targetId !== "string"
    ) {
      continue;
    }

    const normalizeHandleId = (handle: unknown): string | undefined => {
      if (typeof handle !== "string") {
        return undefined;
      }

      if (/(?:^|-)\w+-(?:t|b)-(?:in|out)$/.test(handle)) {
        return undefined;
      }

      return handle;
    };

    edges.push({
      id: item.id,
      sourceId: item.sourceId,
      sourceHandle: normalizeHandleId(item.sourceHandle),
      targetId: item.targetId,
      targetHandle: normalizeHandleId(item.targetHandle),
      relation: typeof item.relation === "string" ? item.relation : "related",
      color: typeof item.color === "string" ? item.color : undefined,
      direction: normalizeCanvasEdgeDirection(item.direction),
    });
  }

  return edges;
};

const normalizeCanvasBlocks = (value: unknown): WorldGraphCanvasBlock[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const blocks: WorldGraphCanvasBlock[] = [];

  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== "string") {
      continue;
    }

    const positionX = toFiniteNumber(item.positionX) ?? 0;
    const positionY = toFiniteNumber(item.positionY) ?? 0;
    const type = item.type;

    if (type === "timeline") {
      blocks.push({
        id: item.id,
        type,
        positionX,
        positionY,
        data: normalizeTimelineData(item.data),
      });
      continue;
    }

    if (type === "memo") {
      blocks.push({
        id: item.id,
        type,
        positionX,
        positionY,
        data: normalizeMemoData(item.data),
      });
    }
  }

  return blocks;
};

const stripTransientGraphPosition = (
  attributes: WorldGraphNode["attributes"],
): WorldGraphNode["attributes"] => {
  if (!isRecord(attributes) || !("graphPosition" in attributes)) {
    return attributes ?? null;
  }

  const { graphPosition: _graphPosition, ...rest } = attributes;
  return Object.keys(rest).length > 0 ? rest : null;
};

export const applyGraphNodePosition = (
  node: WorldGraphNode,
  positionX: number,
  positionY: number,
): WorldGraphNode => {
  if (isWorldEntityBackedType(node.entityType)) {
    return {
      ...node,
      positionX,
      positionY,
    };
  }

  const baseAttributes = isRecord(node.attributes)
    ? { ...node.attributes }
    : {};
  return {
    ...node,
    positionX,
    positionY,
    attributes: {
      ...baseAttributes,
      graphPosition: {
        x: positionX,
        y: positionY,
      },
    },
  };
};

export const mergeWorldGraphLayout = (
  graphData: WorldGraphData,
  payload: unknown,
): WorldGraphData => {
  if (!isRecord(payload)) {
    return graphData;
  }

  const positions = new Map<string, { x: number; y: number }>();
  if (Array.isArray(payload.nodes)) {
    for (const item of payload.nodes) {
      if (!isRecord(item) || typeof item.id !== "string") continue;
      const x = toFiniteNumber(item.positionX);
      const y = toFiniteNumber(item.positionY);
      if (x === null || y === null) continue;
      positions.set(item.id, { x, y });
    }
  }

  const canvasBlocks = normalizeCanvasBlocks(payload.canvasBlocks);
  const canvasEdges = normalizeCanvasEdges(payload.canvasEdges);
  const timelines = normalizeTimelines(payload.timelines);

  const nextNodes =
    positions.size === 0
      ? graphData.nodes
      : graphData.nodes.map((node) => {
          const position = positions.get(node.id);
          if (!position || isWorldEntityBackedType(node.entityType)) {
            return node;
          }
          return applyGraphNodePosition(node, position.x, position.y);
        });

  return {
    ...graphData,
    nodes: nextNodes,
    canvasBlocks,
    canvasEdges,
    timelines,
  };
};

export const buildWorldGraphDocument = (
  graphData: WorldGraphData,
  updatedAt = new Date().toISOString(),
): GraphDocumentPayload => {
  const canvasBlocks = graphData.canvasBlocks ?? [];
  const canvasEdges = graphData.canvasEdges ?? [];
  const timelines = graphData.timelines ?? [];

  return {
    nodes: graphData.nodes.map((node) => ({
      id: node.id,
      entityType: node.entityType,
      subType: node.subType,
      name: node.name,
      description: node.description ?? null,
      firstAppearance: node.firstAppearance ?? null,
      attributes: stripTransientGraphPosition(node.attributes),
      positionX: node.positionX,
      positionY: node.positionY,
    })),
    edges: graphData.edges.map((edge) => ({
      ...edge,
      attributes: edge.attributes ?? null,
    })),
    ...(canvasBlocks.length > 0 ? { canvasBlocks } : {}),
    ...(canvasEdges.length > 0 ? { canvasEdges } : {}),
    ...(timelines.length > 0 ? { timelines } : {}),
    updatedAt,
  };
};
