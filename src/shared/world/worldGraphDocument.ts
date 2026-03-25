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

const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const dedupeByIdLastWins = <T extends { id: string }>(
  items: readonly T[],
): T[] => {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    deduped.unshift(item);
  }

  return deduped;
};

const normalizeTimelineSegments = (value: unknown): WorldTimelineSegment[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const segments: WorldTimelineSegment[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== "string") {
      continue;
    }

    segments.push({
      id: item.id,
      name: typeof item.name === "string" ? item.name : "New Segment",
    });
  }

  return dedupeByIdLastWins(segments);
};

export const normalizeTimelines = (value: unknown): WorldTimelineTrack[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: WorldTimelineTrack[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== "string") {
      continue;
    }

    const segments = normalizeTimelineSegments(item.segments);

    normalized.push({
      id: item.id,
      name: typeof item.name === "string" ? item.name : "New Timeline",
      segments,
    });
  }
  return dedupeByIdLastWins(normalized);
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

export const normalizeCanvasEdges = (value: unknown): WorldGraphCanvasEdge[] => {
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

  return dedupeByIdLastWins(edges);
};

export const normalizeCanvasBlocks = (
  value: unknown,
): WorldGraphCanvasBlock[] => {
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

  return dedupeByIdLastWins(blocks);
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

  const canvasBlocks = hasOwn(payload, "canvasBlocks")
    ? normalizeCanvasBlocks(payload.canvasBlocks)
    : normalizeCanvasBlocks(graphData.canvasBlocks);
  const canvasEdges = hasOwn(payload, "canvasEdges")
    ? normalizeCanvasEdges(payload.canvasEdges)
    : normalizeCanvasEdges(graphData.canvasEdges);
  const timelines = hasOwn(payload, "timelines")
    ? normalizeTimelines(payload.timelines)
    : normalizeTimelines(graphData.timelines);

  const nextNodes = dedupeByIdLastWins(
    positions.size === 0
      ? graphData.nodes
      : graphData.nodes.map((node) => {
          const position = positions.get(node.id);
          if (!position || isWorldEntityBackedType(node.entityType)) {
            return node;
          }
          return applyGraphNodePosition(node, position.x, position.y);
        }),
  );

  return {
    ...graphData,
    nodes: nextNodes,
    edges: dedupeByIdLastWins(graphData.edges),
    canvasBlocks,
    canvasEdges,
    timelines,
  };
};

export const buildWorldGraphDocument = (
  graphData: WorldGraphData,
  updatedAt = new Date().toISOString(),
): GraphDocumentPayload => {
  // Always include canvas data even if empty, to ensure proper overwrite on save
  // This prevents stale data from persisting when all canvas content is deleted
  const nodes = dedupeByIdLastWins(graphData.nodes);
  const edges = dedupeByIdLastWins(graphData.edges);
  const canvasBlocks = normalizeCanvasBlocks(graphData.canvasBlocks);
  const canvasEdges = normalizeCanvasEdges(graphData.canvasEdges);
  const timelines = normalizeTimelines(graphData.timelines);

  return {
    nodes: nodes.map((node) => ({
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
    edges: edges.map((edge) => ({
      ...edge,
      attributes: edge.attributes ?? null,
    })),
    // Always include canvas data to properly overwrite stale data
    canvasBlocks,
    canvasEdges,
    timelines,
    updatedAt,
  };
};
