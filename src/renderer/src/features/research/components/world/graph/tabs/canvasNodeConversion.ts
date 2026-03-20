import type {
  EntityRelation,
  EntityRelationCreateInput,
  WorldEntitySourceType,
  WorldEntityType,
  WorldGraphNode,
} from "@shared/types";

const WORLD_ENTITY_TYPE_SET = new Set([
  "WorldEntity",
  "Place",
  "Concept",
  "Rule",
  "Item",
] as const);

const isWorldEntityType = (
  value: WorldEntitySourceType,
): value is "WorldEntity" | "Place" | "Concept" | "Rule" | "Item" =>
  WORLD_ENTITY_TYPE_SET.has(
    value as "WorldEntity" | "Place" | "Concept" | "Rule" | "Item",
  );

const resolveWorldEntityType = (
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

const normalizeName = (value: string): string =>
  value.trim().toLocaleLowerCase();

const areEquivalentTargetTypes = (
  current: WorldGraphNode,
  nextEntityType: WorldEntitySourceType,
  nextSubType?: WorldEntityType,
): boolean => {
  if (
    !isWorldEntityType(current.entityType) ||
    !isWorldEntityType(nextEntityType)
  ) {
    return current.entityType === nextEntityType;
  }

  const currentResolved = resolveWorldEntityType(
    current.entityType,
    current.subType,
  );
  const nextResolved = resolveWorldEntityType(nextEntityType, nextSubType);
  return currentResolved === nextResolved;
};

export const findDuplicateTargetNode = (input: {
  nodes: WorldGraphNode[];
  selectedNodeId: string;
  selectedNodeName: string;
  nextEntityType: WorldEntitySourceType;
  nextSubType?: WorldEntityType;
}): WorldGraphNode | null => {
  const normalizedSelectedName = normalizeName(input.selectedNodeName);
  if (!normalizedSelectedName) {
    return null;
  }

  return (
    input.nodes.find((node) => {
      if (node.id === input.selectedNodeId) {
        return false;
      }

      if (
        !areEquivalentTargetTypes(node, input.nextEntityType, input.nextSubType)
      ) {
        return false;
      }

      return normalizeName(node.name) === normalizedSelectedName;
    }) ?? null
  );
};

type RelationMigrationInput = {
  projectId: string;
  selectedNodeId: string;
  targetNode: Pick<WorldGraphNode, "id" | "entityType">;
  graphEdges: EntityRelation[];
};

const toRelationKey = (input: {
  sourceId: string;
  targetId: string;
  relation: string;
  sourceType: string;
  targetType: string;
}): string =>
  `${input.sourceId}|${input.targetId}|${input.relation}|${input.sourceType}|${input.targetType}`;

export const buildMigratedRelationInputs = ({
  projectId,
  selectedNodeId,
  targetNode,
  graphEdges,
}: RelationMigrationInput): EntityRelationCreateInput[] => {
  const unaffectedEdgeKeys = new Set(
    graphEdges
      .filter(
        (edge) =>
          edge.sourceId !== selectedNodeId && edge.targetId !== selectedNodeId,
      )
      .map((edge) =>
        toRelationKey({
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          relation: edge.relation,
          sourceType: edge.sourceType,
          targetType: edge.targetType,
        }),
      ),
  );

  const migrationInputs: EntityRelationCreateInput[] = [];
  const seen = new Set<string>();

  graphEdges.forEach((edge) => {
    if (edge.sourceId !== selectedNodeId && edge.targetId !== selectedNodeId) {
      return;
    }

    const sourceId =
      edge.sourceId === selectedNodeId ? targetNode.id : edge.sourceId;
    const targetId =
      edge.targetId === selectedNodeId ? targetNode.id : edge.targetId;

    if (sourceId === targetId) {
      return;
    }

    const sourceType =
      edge.sourceId === selectedNodeId
        ? targetNode.entityType
        : edge.sourceType;
    const targetType =
      edge.targetId === selectedNodeId
        ? targetNode.entityType
        : edge.targetType;

    const dedupeKey = toRelationKey({
      sourceId,
      targetId,
      relation: edge.relation,
      sourceType,
      targetType,
    });

    if (unaffectedEdgeKeys.has(dedupeKey) || seen.has(dedupeKey)) {
      return;
    }

    seen.add(dedupeKey);
    migrationInputs.push({
      projectId,
      sourceId,
      targetId,
      sourceType,
      targetType,
      relation: edge.relation,
    });
  });

  return migrationInputs;
};

export const canUpdateTypeInPlace = (
  currentEntityType: WorldEntitySourceType,
  nextEntityType: WorldEntitySourceType,
): boolean =>
  isWorldEntityType(currentEntityType) && isWorldEntityType(nextEntityType);
