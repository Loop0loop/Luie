import { db } from "../../../database/index.js";
import type { WorldEntitySourceType } from "../../../../shared/types/index.js";
import type { GraphDocumentPayload } from "./shared.js";
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

  await client.$transaction(async (tx) => {
    await tx.entityRelation.deleteMany({
      where: {
        projectId,
        OR: [
          { sourceWorldEntityId: { not: null } },
          { targetWorldEntityId: { not: null } },
        ],
      },
    });
    await tx.worldEntity.deleteMany({
      where: { projectId },
    });

    if (nodes.length > 0) {
      await tx.worldEntity.createMany({
        data: nodes.map((node) => ({
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
          createdAt: now,
          updatedAt: now,
        })),
      });
    }

    if (edges.length > 0) {
      await tx.entityRelation.createMany({
        data: edges.map((edge) => ({
          id: edge.id,
          projectId,
          sourceId: edge.sourceId,
          sourceType: resolvePluginRelationType(
            edge.sourceType as WorldEntitySourceType,
          )!,
          targetId: edge.targetId,
          targetType: resolvePluginRelationType(
            edge.targetType as WorldEntitySourceType,
          )!,
          relation: edge.relation,
          attributes:
            edge.attributes && typeof edge.attributes === "object"
              ? JSON.stringify(edge.attributes)
              : null,
          sourceWorldEntityId: edge.sourceId,
          targetWorldEntityId: edge.targetId,
          createdAt:
            edge.createdAt && !Number.isNaN(new Date(edge.createdAt).getTime())
              ? new Date(edge.createdAt)
              : now,
          updatedAt:
            edge.updatedAt && !Number.isNaN(new Date(edge.updatedAt).getTime())
              ? new Date(edge.updatedAt)
              : now,
        })),
      });
    }
  });
};
