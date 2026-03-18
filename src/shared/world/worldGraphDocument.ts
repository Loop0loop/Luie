import { isWorldEntityBackedType } from "../constants/worldRelationRules.js";
import type {
  EntityRelation,
  WorldGraphCanvasBlock,
  WorldGraphCanvasEdge,
  WorldGraphCanvasEdgeDirection,
  WorldGraphCanvasMemoBlockData,
  WorldGraphCanvasTimelineBlockData,
  WorldGraphCanvasTimelineSequenceNode,
  WorldGraphData,
  WorldGraphNode,
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
  updatedAt?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const toFiniteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const normalizeTimelineSequence = (
  value: unknown,
): WorldGraphCanvasTimelineSequenceNode[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: WorldGraphCanvasTimelineSequenceNode[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== "string") {
      continue;
    }

    normalized.push({
      id: item.id,
      content: typeof item.content === "string" ? item.content : "",
      isHeld: item.isHeld === true,
      topBranches: Array.isArray(item.topBranches)
        ? item.topBranches.map((branch) => normalizeTimelineSequence(branch))
        : [],
      bottomBranches: Array.isArray(item.bottomBranches)
        ? item.bottomBranches.map((branch) => normalizeTimelineSequence(branch))
        : [],
    });
  }
  return normalized;
};

const normalizeTimelineData = (
  value: unknown,
): WorldGraphCanvasTimelineBlockData => {
  if (!isRecord(value)) {
    return {
      label: "",
      sequence: [],
    };
  }

  return {
    label: typeof value.label === "string" ? value.label : "",
    sequence: normalizeTimelineSequence(value.sequence),
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

    edges.push({
      id: item.id,
      sourceId: item.sourceId,
      targetId: item.targetId,
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
  };
};

export const buildWorldGraphDocument = (
  graphData: WorldGraphData,
  updatedAt = new Date().toISOString(),
): GraphDocumentPayload => {
  const canvasBlocks = graphData.canvasBlocks ?? [];
  const canvasEdges = graphData.canvasEdges ?? [];

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
    updatedAt,
  };
};
