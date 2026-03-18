import { isWorldEntityBackedType } from "../constants/worldRelationRules.js";
import type {
  EntityRelation,
  WorldGraphCanvasBlock,
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
  };
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
  };
};

export const buildWorldGraphDocument = (
  graphData: WorldGraphData,
  updatedAt = new Date().toISOString(),
): GraphDocumentPayload => {
  const canvasBlocks = graphData.canvasBlocks ?? [];

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
    updatedAt,
  };
};
