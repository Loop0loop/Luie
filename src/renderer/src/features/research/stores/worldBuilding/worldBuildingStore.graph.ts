import {
  getDefaultRelationForPair,
  isRelationAllowed,
  isWorldEntityBackedType,
} from "@shared/constants/world";
import type {
  Character,
  EntityRelation,
  Event,
  Faction,
  Term,
  WorldEntity,
  WorldEntitySourceType,
  WorldEntityType,
  WorldGraphData,
  WorldGraphNode,
} from "@shared/types";
import { applyGraphNodePosition } from "@shared/world/worldGraphDocument";

export const parseNodeAttributes = (
  value: unknown,
): Record<string, unknown> | null => {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
};

export const toCharacterNode = (item: Character): WorldGraphNode => ({
  id: item.id,
  entityType: "Character",
  name: item.name,
  description: item.description ?? null,
  firstAppearance: item.firstAppearance ?? null,
  attributes: parseNodeAttributes(item.attributes),
  positionX: 0,
  positionY: 0,
});

export const toFactionNode = (item: Faction): WorldGraphNode => ({
  id: item.id,
  entityType: "Faction",
  name: item.name,
  description: item.description ?? null,
  firstAppearance: item.firstAppearance ?? null,
  attributes: parseNodeAttributes(item.attributes),
  positionX: 0,
  positionY: 0,
});

export const toEventNode = (item: Event): WorldGraphNode => ({
  id: item.id,
  entityType: "Event",
  name: item.name,
  description: item.description ?? null,
  firstAppearance: item.firstAppearance ?? null,
  attributes: parseNodeAttributes(item.attributes),
  positionX: 0,
  positionY: 0,
});

export const toTermNode = (item: Term): WorldGraphNode => ({
  id: item.id,
  entityType: "Term",
  name: item.term,
  description: item.definition ?? null,
  firstAppearance: item.firstAppearance ?? null,
  attributes: item.category ? { tags: [item.category] } : null,
  positionX: 0,
  positionY: 0,
});

export const toWorldEntityNode = (item: WorldEntity): WorldGraphNode => {
  const type = (item.type ?? "Place") as WorldEntityType;
  return {
    id: item.id,
    entityType: type,
    subType: type,
    name: item.name,
    description: item.description ?? null,
    firstAppearance: item.firstAppearance ?? null,
    attributes: parseNodeAttributes(item.attributes),
    positionX: item.positionX ?? 0,
    positionY: item.positionY ?? 0,
  };
};

export const withNodePosition = (
  node: WorldGraphNode,
  positionX: number,
  positionY: number,
): WorldGraphNode => applyGraphNodePosition(node, positionX, positionY);

export const resolveWorldEntityType = (
  entityType: WorldEntitySourceType,
  subType?: WorldEntityType,
): WorldEntityType => {
  if (
    entityType === "Place" ||
    entityType === "Concept" ||
    entityType === "Rule" ||
    entityType === "Item"
  ) {
    return entityType;
  }
  return subType ?? "Concept";
};

export const toRelationSourceType = (
  entityType: WorldEntitySourceType,
): WorldEntitySourceType => entityType;

export const appendNodeToGraph = (
  graphData: WorldGraphData | null,
  node: WorldGraphNode,
): WorldGraphData => ({
  nodes: graphData
    ? [
        ...graphData.nodes.filter((currentNode) => currentNode.id !== node.id),
        node,
      ]
    : [node],
  edges: graphData?.edges ?? [],
  canvasBlocks: graphData?.canvasBlocks ?? [],
  canvasEdges: graphData?.canvasEdges ?? [],
  canvasFiles: graphData?.canvasFiles ?? [],
  timelines: graphData?.timelines ?? [],
});

export const replaceNodeInGraph = (
  graphData: WorldGraphData | null,
  node: WorldGraphNode,
): WorldGraphData | null => {
  if (!graphData) return null;
  return {
    ...graphData,
    nodes: graphData.nodes.map((currentNode) =>
      currentNode.id === node.id ? node : currentNode,
    ),
  };
};

export const updateNodePositionInGraph = (
  graphData: WorldGraphData | null,
  id: string,
  positionX: number,
  positionY: number,
): WorldGraphData | null => {
  if (!graphData) return null;
  return {
    ...graphData,
    nodes: graphData.nodes.map((node) =>
      node.id === id ? withNodePosition(node, positionX, positionY) : node,
    ),
  };
};

export const removeNodeFromGraph = (
  graphData: WorldGraphData | null,
  id: string,
): WorldGraphData | null => {
  if (!graphData) return null;
  return {
    ...graphData,
    nodes: graphData.nodes.filter((node) => node.id !== id),
    edges: graphData.edges.filter(
      (edge) => edge.sourceId !== id && edge.targetId !== id,
    ),
    canvasEdges: (graphData.canvasEdges ?? []).filter(
      (edge) => edge.sourceId !== id && edge.targetId !== id,
    ),
  };
};

export const appendRelationToGraph = (
  graphData: WorldGraphData | null,
  relation: EntityRelation,
): WorldGraphData | null => {
  if (!graphData) return null;
  return {
    ...graphData,
    edges: [
      ...graphData.edges.filter((edge) => edge.id !== relation.id),
      relation,
    ],
  };
};

export const replaceRelationInGraph = (
  graphData: WorldGraphData | null,
  relation: EntityRelation,
): WorldGraphData | null => {
  if (!graphData) return null;
  return {
    ...graphData,
    edges: graphData.edges.map((edge) =>
      edge.id === relation.id ? relation : edge,
    ),
  };
};

export const removeRelationFromGraph = (
  graphData: WorldGraphData | null,
  relationId: string,
): WorldGraphData | null => {
  if (!graphData) return null;
  return {
    ...graphData,
    edges: graphData.edges.filter((edge) => edge.id !== relationId),
  };
};

export const isValidRelationForPair = (
  relation: EntityRelation["relation"],
  sourceType: WorldEntitySourceType,
  targetType: WorldEntitySourceType,
) => isRelationAllowed(relation, sourceType, targetType);

export const getResolvedRelationKind = (
  sourceType: WorldEntitySourceType,
  targetType: WorldEntitySourceType,
  relation?: EntityRelation["relation"],
) =>
  relation ?? getDefaultRelationForPair(sourceType, targetType) ?? "belongs_to";

export { isWorldEntityBackedType };
