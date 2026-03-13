import { isWorldEntityBackedType } from "../constants/worldRelationRules.js";
import type { EntityRelation, WorldGraphData, WorldGraphNode } from "../types/index.js";

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
  updatedAt?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const toFiniteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

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

  const baseAttributes = isRecord(node.attributes) ? { ...node.attributes } : {};
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
  if (!isRecord(payload) || !Array.isArray(payload.nodes)) {
    return graphData;
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (const item of payload.nodes) {
    if (!isRecord(item) || typeof item.id !== "string") continue;
    const x = toFiniteNumber(item.positionX);
    const y = toFiniteNumber(item.positionY);
    if (x === null || y === null) continue;
    positions.set(item.id, { x, y });
  }

  if (positions.size === 0) {
    return graphData;
  }

  return {
    ...graphData,
    nodes: graphData.nodes.map((node) => {
      const position = positions.get(node.id);
      if (!position || isWorldEntityBackedType(node.entityType)) {
        return node;
      }
      return applyGraphNodePosition(node, position.x, position.y);
    }),
  };
};

export const buildWorldGraphDocument = (
  graphData: WorldGraphData,
  updatedAt = new Date().toISOString(),
): GraphDocumentPayload => ({
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
  updatedAt,
});
