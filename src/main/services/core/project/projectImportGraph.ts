import { randomUUID } from "node:crypto";
import { isWorldEntityBackedType } from "../../../../shared/constants/worldRelationRules.js";
import type {
  RelationKind,
  WorldEntitySourceType,
  WorldEntityType,
} from "../../../../shared/types/index.js";
import type {
  CharacterCreateRow,
  EntityRelationCreateRow,
  EventCreateRow,
  FactionCreateRow,
  TermCreateRow,
  WorldEntityCreateRow,
} from "./projectImportCodec.js";

export type GraphImportRows = {
  charactersForCreate: CharacterCreateRow[];
  termsForCreate: TermCreateRow[];
  factionsForCreate: FactionCreateRow[];
  eventsForCreate: EventCreateRow[];
  worldEntitiesForCreate: WorldEntityCreateRow[];
  relationsForCreate: EntityRelationCreateRow[];
};

type GraphImportState = GraphImportRows & {
  characterIds: Set<string>;
  termIds: Set<string>;
  factionIds: Set<string>;
  eventIds: Set<string>;
  worldEntityIds: Set<string>;
};

type GraphNodeInput = {
  id?: string;
  entityType?: string;
  subType?: string;
  name?: string;
  description?: string | null;
  firstAppearance?: string | null;
  attributes?: Record<string, unknown> | null;
  positionX?: number;
  positionY?: number;
};

type GraphEdgeInput = {
  id?: string;
  sourceId?: string;
  sourceType?: string;
  targetId?: string;
  targetType?: string;
  relation?: string;
  attributes?: Record<string, unknown> | null;
};

type GraphInput = {
  nodes?: GraphNodeInput[];
  edges?: GraphEdgeInput[];
};

const WORLD_ENTITY_SOURCE_TYPES = [
  "Character",
  "Faction",
  "Event",
  "Place",
  "Concept",
  "Rule",
  "Item",
  "Term",
  "WorldEntity",
] as const satisfies readonly WorldEntitySourceType[];

const WORLD_ENTITY_TYPES = ["Place", "Concept", "Rule", "Item"] as const satisfies readonly WorldEntityType[];

const RELATION_KINDS = [
  "belongs_to",
  "enemy_of",
  "causes",
  "controls",
  "located_in",
  "violates",
] as const satisfies readonly RelationKind[];

const isWorldEntitySourceType = (value: unknown): value is WorldEntitySourceType =>
  typeof value === "string" &&
  WORLD_ENTITY_SOURCE_TYPES.includes(value as WorldEntitySourceType);

const isWorldEntityType = (value: unknown): value is WorldEntityType =>
  typeof value === "string" &&
  WORLD_ENTITY_TYPES.includes(value as WorldEntityType);

const isRelationKind = (value: unknown): value is RelationKind =>
  typeof value === "string" &&
  RELATION_KINDS.includes(value as RelationKind);

const serializeAttributes = (input: unknown): string | null => {
  if (input === undefined || input === null) {
    return null;
  }
  if (typeof input === "string") {
    return input;
  }
  try {
    return JSON.stringify(input);
  } catch {
    return null;
  }
};

const getWorldEntityType = (
  entityType: WorldEntitySourceType,
  subType: unknown,
): WorldEntityType | null => {
  if (isWorldEntityType(entityType)) {
    return entityType;
  }
  if (entityType === "WorldEntity" && isWorldEntityType(subType)) {
    return subType;
  }
  return null;
};

const createGraphImportState = (
  baseCharacters: CharacterCreateRow[],
  baseTerms: TermCreateRow[],
): GraphImportState => {
  return {
    charactersForCreate: [...baseCharacters],
    termsForCreate: [...baseTerms],
    factionsForCreate: [],
    eventsForCreate: [],
    worldEntitiesForCreate: [],
    relationsForCreate: [],
    characterIds: new Set(baseCharacters.map((row) => row.id)),
    termIds: new Set(baseTerms.map((row) => row.id)),
    factionIds: new Set<string>(),
    eventIds: new Set<string>(),
    worldEntityIds: new Set<string>(),
  };
};

const resolveGraphNodeType = (node: GraphNodeInput): WorldEntitySourceType | null => {
  if (isWorldEntitySourceType(node.entityType)) {
    return node.entityType;
  }
  if (isWorldEntityType(node.subType)) {
    return node.subType;
  }
  return null;
};

const addCharacterNode = (state: GraphImportState, projectId: string, node: GraphNodeInput): void => {
  if (!node.id || !node.name || state.characterIds.has(node.id)) return;
  state.characterIds.add(node.id);
  state.charactersForCreate.push({
    id: node.id,
    projectId,
    name: node.name,
    description: typeof node.description === "string" ? node.description : null,
    firstAppearance: typeof node.firstAppearance === "string" ? node.firstAppearance : null,
    attributes: serializeAttributes(node.attributes),
  });
};

const addTermNode = (state: GraphImportState, projectId: string, node: GraphNodeInput): void => {
  if (!node.id || !node.name || state.termIds.has(node.id)) return;
  state.termIds.add(node.id);
  const tagCandidate = Array.isArray(node.attributes?.tags)
    ? node.attributes.tags.find((tag): tag is string => typeof tag === "string")
    : null;
  state.termsForCreate.push({
    id: node.id,
    projectId,
    term: node.name,
    definition: typeof node.description === "string" ? node.description : null,
    category: tagCandidate ?? null,
    firstAppearance: typeof node.firstAppearance === "string" ? node.firstAppearance : null,
  });
};

const addFactionNode = (state: GraphImportState, projectId: string, node: GraphNodeInput): void => {
  if (!node.id || !node.name || state.factionIds.has(node.id)) return;
  state.factionIds.add(node.id);
  state.factionsForCreate.push({
    id: node.id,
    projectId,
    name: node.name,
    description: typeof node.description === "string" ? node.description : null,
    firstAppearance: typeof node.firstAppearance === "string" ? node.firstAppearance : null,
    attributes: serializeAttributes(node.attributes),
  });
};

const addEventNode = (state: GraphImportState, projectId: string, node: GraphNodeInput): void => {
  if (!node.id || !node.name || state.eventIds.has(node.id)) return;
  state.eventIds.add(node.id);
  state.eventsForCreate.push({
    id: node.id,
    projectId,
    name: node.name,
    description: typeof node.description === "string" ? node.description : null,
    firstAppearance: typeof node.firstAppearance === "string" ? node.firstAppearance : null,
    attributes: serializeAttributes(node.attributes),
  });
};

const addWorldEntityNode = (
  state: GraphImportState,
  projectId: string,
  entityType: WorldEntitySourceType,
  node: GraphNodeInput,
): void => {
  if (!node.id || !node.name) return;
  const worldEntityType = getWorldEntityType(entityType, node.subType);
  if (!worldEntityType || state.worldEntityIds.has(node.id)) {
    return;
  }
  state.worldEntityIds.add(node.id);
  state.worldEntitiesForCreate.push({
    id: node.id,
    projectId,
    type: worldEntityType,
    name: node.name,
    description: typeof node.description === "string" ? node.description : null,
    firstAppearance: typeof node.firstAppearance === "string" ? node.firstAppearance : null,
    attributes: serializeAttributes(node.attributes),
    positionX: typeof node.positionX === "number" ? node.positionX : 0,
    positionY: typeof node.positionY === "number" ? node.positionY : 0,
  });
};

const hasGraphEntity = (
  state: GraphImportState,
  entityType: WorldEntitySourceType,
  entityId: string,
): boolean => {
  switch (entityType) {
    case "Character":
      return state.characterIds.has(entityId);
    case "Term":
      return state.termIds.has(entityId);
    case "Faction":
      return state.factionIds.has(entityId);
    case "Event":
      return state.eventIds.has(entityId);
    case "Place":
    case "Concept":
    case "Rule":
    case "Item":
    case "WorldEntity":
      return state.worldEntityIds.has(entityId);
    default:
      return false;
  }
};

const addGraphNodeToState = (
  state: GraphImportState,
  projectId: string,
  node: GraphNodeInput,
): void => {
  if (!node.id || !node.name) {
    return;
  }
  const entityType = resolveGraphNodeType(node);
  if (!entityType) {
    return;
  }

  if (entityType === "Character") {
    addCharacterNode(state, projectId, node);
    return;
  }
  if (entityType === "Term") {
    addTermNode(state, projectId, node);
    return;
  }
  if (entityType === "Faction") {
    addFactionNode(state, projectId, node);
    return;
  }
  if (entityType === "Event") {
    addEventNode(state, projectId, node);
    return;
  }
  addWorldEntityNode(state, projectId, entityType, node);
};

const addGraphEdgeToState = (
  state: GraphImportState,
  projectId: string,
  edge: GraphEdgeInput,
): void => {
  if (!edge.sourceId || !edge.targetId) {
    return;
  }
  if (!isWorldEntitySourceType(edge.sourceType) || !isWorldEntitySourceType(edge.targetType)) {
    return;
  }
  if (!isRelationKind(edge.relation)) {
    return;
  }
  if (
    !hasGraphEntity(state, edge.sourceType, edge.sourceId) ||
    !hasGraphEntity(state, edge.targetType, edge.targetId)
  ) {
    return;
  }

  state.relationsForCreate.push({
    id: edge.id || randomUUID(),
    projectId,
    sourceId: edge.sourceId,
    sourceType: edge.sourceType,
    targetId: edge.targetId,
    targetType: edge.targetType,
    relation: edge.relation,
    attributes: serializeAttributes(edge.attributes),
    sourceWorldEntityId:
      isWorldEntityBackedType(edge.sourceType) && state.worldEntityIds.has(edge.sourceId)
        ? edge.sourceId
        : null,
    targetWorldEntityId:
      isWorldEntityBackedType(edge.targetType) && state.worldEntityIds.has(edge.targetId)
        ? edge.targetId
        : null,
  });
};

export const buildGraphCreateRows = (input: {
  projectId: string;
  graph?: GraphInput;
  baseCharacters: CharacterCreateRow[];
  baseTerms: TermCreateRow[];
}): GraphImportRows => {
  const state = createGraphImportState(input.baseCharacters, input.baseTerms);

  if (!input.graph) {
    return state;
  }

  for (const node of input.graph.nodes ?? []) {
    addGraphNodeToState(state, input.projectId, node);
  }
  for (const edge of input.graph.edges ?? []) {
    addGraphEdgeToState(state, input.projectId, edge);
  }

  return state;
};
