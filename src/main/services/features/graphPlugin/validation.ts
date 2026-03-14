import {
  entityRelationIdSchema,
  worldEntityIdSchema,
  worldEntityTypeSchema,
} from "../../../../shared/schemas/index.js";
import type {
  GraphPluginManifest,
  WorldEntitySourceType,
} from "../../../../shared/types/index.js";
import { isRelationAllowed } from "../../../../shared/constants/worldRelationRules.js";
import { ErrorCode } from "../../../../shared/constants/index.js";
import {
  assertManifestMatchesCatalog as assertManifestCatalogImpl,
  createServiceError,
  type GraphDocumentPayload,
  type LocalCatalogItem,
} from "./shared.js";
import { readGraphDocument } from "./archive.js";

export const resolvePluginNodeEntityType = (
  entityType: WorldEntitySourceType,
  subType?: string,
) => {
  const candidate = entityType === "WorldEntity" ? subType : entityType;
  const parsed = worldEntityTypeSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
};

export const resolvePluginRelationType = (
  entityType: WorldEntitySourceType,
) => resolvePluginNodeEntityType(entityType, entityType);

export const validateWorldEntityGraph = (graphPayload: GraphDocumentPayload) => {
  const nodeIds = new Set<string>();
  const nodes = graphPayload.nodes ?? [];
  const edges = graphPayload.edges ?? [];

  for (const node of nodes) {
    if (!worldEntityIdSchema.safeParse(node.id).success) {
      throw createServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Graph template node id must be a UUID",
        { nodeId: node.id },
      );
    }

    const entityType = resolvePluginNodeEntityType(
      node.entityType as WorldEntitySourceType,
      node.subType,
    );
    if (!entityType) {
      throw createServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Graph template nodes must use custom world entity types in V1",
        { nodeId: node.id, entityType: node.entityType, subType: node.subType },
      );
    }

    nodeIds.add(node.id);
  }

  for (const edge of edges) {
    if (!entityRelationIdSchema.safeParse(edge.id).success) {
      throw createServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Graph template edge id must be a UUID",
        { edgeId: edge.id },
      );
    }

    if (!nodeIds.has(edge.sourceId) || !nodeIds.has(edge.targetId)) {
      throw createServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Graph template edge references missing nodes",
        { edgeId: edge.id, sourceId: edge.sourceId, targetId: edge.targetId },
      );
    }

    const sourceType = resolvePluginRelationType(
      edge.sourceType as WorldEntitySourceType,
    );
    const targetType = resolvePluginRelationType(
      edge.targetType as WorldEntitySourceType,
    );
    if (!sourceType || !targetType) {
      throw createServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Graph template edges must target custom world entity types in V1",
        { edgeId: edge.id, sourceType: edge.sourceType, targetType: edge.targetType },
      );
    }

    if (!isRelationAllowed(edge.relation as never, sourceType, targetType)) {
      throw createServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Graph template contains an invalid relation mapping",
        { edgeId: edge.id, relation: edge.relation, sourceType, targetType },
      );
    }
  }
};

export const validateTemplateDocuments = async (
  packageRoot: string,
  manifest: GraphPluginManifest,
) => {
  const graphPayloads = await Promise.all(
    manifest.templates.map((template) =>
      readGraphDocument(packageRoot, template.graphEntry),
    ),
  );
  graphPayloads.forEach((graphPayload) => {
    validateWorldEntityGraph(graphPayload);
  });
};

export const assertManifestMatchesCatalog = (
  item: LocalCatalogItem,
  manifest: GraphPluginManifest,
) => {
  assertManifestCatalogImpl(item, manifest);
};
