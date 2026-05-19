import { eq } from "drizzle-orm";
import { db } from "../../../database/index.js";
import { entityRelation, worldEntity } from "../../../database/schema.js";
import type { WorldEntitySourceType } from "../../../../shared/types/index.js";
import type { GraphDocumentPayload } from "./shared.js";
import { buildCanonicalWorldEntityPointers } from "../../world/entityRelationPointers.js";
import {
  resolvePluginNodeEntityType,
  resolvePluginRelationType,
  validateWorldEntityGraph,
} from "./validation.js";

export const replaceProjectWorldEntityGraph = async (
  projectId: string,
  graphPayload: GraphDocumentPayload,
  now: Date,
) => {
  validateWorldEntityGraph(graphPayload);
  const client = db.getClient();
  const nodes = graphPayload.nodes ?? [];
  const edges = graphPayload.edges ?? [];

  client.transaction((tx) => {
    tx.delete(entityRelation).where(eq(entityRelation.projectId, projectId)).run();
    tx.delete(worldEntity).where(eq(worldEntity.projectId, projectId)).run();

    if (nodes.length > 0) {
      tx.insert(worldEntity).values(
        nodes.map((node) => ({
          id: node.id,
          projectId,
          type: resolvePluginNodeEntityType(
            node.entityType as WorldEntitySourceType,
            node.subType,
          )!,
          name: node.name,
          description: node.description ?? null,
          firstAppearance: node.firstAppearance ?? null,
          attributes: node.attributes ? JSON.stringify(node.attributes) : null,
          positionX: node.positionX ?? 0,
          positionY: node.positionY ?? 0,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        })),
      ).run();
    }

    if (edges.length > 0) {
      tx.insert(entityRelation).values(
        edges.map((edge) => {
          const sourceType = resolvePluginRelationType(
            edge.sourceType as WorldEntitySourceType,
          )!;
          const targetType = resolvePluginRelationType(
            edge.targetType as WorldEntitySourceType,
          )!;
          const pointers = buildCanonicalWorldEntityPointers({
            sourceId: edge.sourceId,
            sourceType,
            targetId: edge.targetId,
            targetType,
          });
          return {
            id: edge.id,
            projectId,
            sourceId: edge.sourceId,
            sourceType,
            targetId: edge.targetId,
            targetType,
            relation: edge.relation,
            attributes:
              edge.attributes && typeof edge.attributes === "object"
                ? JSON.stringify(edge.attributes)
                : null,
            sourceWorldEntityId: pointers.sourceWorldEntityId,
            targetWorldEntityId: pointers.targetWorldEntityId,
            createdAt:
              edge.createdAt && !Number.isNaN(new Date(edge.createdAt).getTime())
                ? new Date(edge.createdAt).toISOString()
                : now.toISOString(),
            updatedAt:
              edge.updatedAt && !Number.isNaN(new Date(edge.updatedAt).getTime())
                ? new Date(edge.updatedAt).toISOString()
                : now.toISOString(),
          };
        }),
      ).run();
    }
  });
};
