/**
 * WorldEntity service — 세계관 엔티티(Place/Concept/Rule/Item) CRUD
 */

import { eq, asc, or, and, isNull } from "drizzle-orm";
import { createLogger } from "../../../shared/logger/index.js";
import { ErrorCode } from "../../../shared/constants/index.js";
import type {
  WorldEntityCreateInput,
  WorldEntityUpdateInput,
  WorldEntityUpdatePositionInput,
} from "../../../shared/types/index.js";
import { ServiceError } from "../../utils/error/index.js";
import { projectService } from "../core/projectService.js";
import { getWorldDbClient } from "./characterService.js";
import { worldEntity, entityRelation } from "../../infra/database/index.js";

const logger = createLogger("WorldEntityService");

export class WorldEntityService {
  async createWorldEntity(input: WorldEntityCreateInput) {
    try {
      logger.info("Creating world entity", input);

      const now = new Date().toISOString();
      const [result] = await getWorldDbClient()
        .insert(worldEntity)
        .values({
          id: crypto.randomUUID(),
          projectId: input.projectId,
          type: input.type,
          name: input.name,
          description: input.description ?? null,
          firstAppearance: input.firstAppearance ?? null,
          attributes: input.attributes
            ? JSON.stringify(input.attributes)
            : null,
          memoryEntityId: input.memoryEntityId ?? null,
          positionX: input.positionX ?? 0,
          positionY: input.positionY ?? 0,
          updatedAt: now,
        })
        .returning();

      if (!result) {
        throw new ServiceError(
          ErrorCode.WORLD_ENTITY_CREATE_FAILED,
          "Failed to create world entity",
          { input },
        );
      }

      logger.info("World entity created", { entityId: result.id });
      await projectService.touchProject(String(result.projectId));
      await projectService.persistPackageAfterMutation(
        String(result.projectId),
        "world-entity:create",
      );
      return result;
    } catch (error) {
      logger.error("Failed to create world entity", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(
        ErrorCode.WORLD_ENTITY_CREATE_FAILED,
        "Failed to create world entity",
        { input },
        error,
      );
    }
  }

  async getWorldEntity(id: string) {
    try {
      const results = await getWorldDbClient()
        .select()
        .from(worldEntity)
        .where(eq(worldEntity.id, id))
        .limit(1);

      if (results.length === 0) {
        throw new ServiceError(
          ErrorCode.WORLD_ENTITY_NOT_FOUND,
          "World entity not found",
          { id },
        );
      }

      return results[0];
    } catch (error) {
      logger.error("Failed to get world entity", error);
      if (error instanceof ServiceError) throw error;
      throw error;
    }
  }

  async getAllWorldEntities(projectId: string) {
    try {
      const results = await getWorldDbClient()
        .select()
        .from(worldEntity)
        .where(
          and(
            eq(worldEntity.projectId, projectId),
            isNull(worldEntity.deletedAt),
          ),
        )
        .orderBy(asc(worldEntity.createdAt));

      return results;
    } catch (error) {
      logger.error("Failed to get all world entities", error);
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to get all world entities",
        { projectId },
        error,
      );
    }
  }

  async updateWorldEntity(input: WorldEntityUpdateInput) {
    try {
      const updateData: Partial<typeof worldEntity.$inferInsert> = {};

      if (input.type !== undefined) updateData.type = input.type;
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined)
        updateData.description = input.description;
      if (input.firstAppearance !== undefined)
        updateData.firstAppearance = input.firstAppearance;
      if (input.attributes !== undefined) {
        updateData.attributes = JSON.stringify(input.attributes);
      }
      if (input.memoryEntityId !== undefined) {
        updateData.memoryEntityId = input.memoryEntityId;
      }

      const [updated] = await getWorldDbClient()
        .update(worldEntity)
        .set(updateData)
        .where(eq(worldEntity.id, input.id))
        .returning();

      if (!updated) {
        throw new ServiceError(
          ErrorCode.WORLD_ENTITY_NOT_FOUND,
          "World entity not found",
          { id: input.id },
        );
      }

      logger.info("World entity updated", { entityId: updated.id });
      await projectService.touchProject(String(updated.projectId));
      await projectService.persistPackageAfterMutation(
        String(updated.projectId),
        "world-entity:update",
      );
      return updated;
    } catch (error) {
      logger.error("Failed to update world entity", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(
        ErrorCode.WORLD_ENTITY_UPDATE_FAILED,
        "Failed to update world entity",
        { input },
        error,
      );
    }
  }

  async updateWorldEntityPosition(input: WorldEntityUpdatePositionInput) {
    try {
      const [updated] = await getWorldDbClient()
        .update(worldEntity)
        .set({ positionX: input.positionX, positionY: input.positionY })
        .where(eq(worldEntity.id, input.id))
        .returning();

      if (!updated) {
        throw new ServiceError(
          ErrorCode.WORLD_ENTITY_NOT_FOUND,
          "World entity not found",
          { id: input.id },
        );
      }

      await projectService.touchProject(String(updated.projectId));
      await projectService.persistPackageAfterMutation(
        String(updated.projectId),
        "world-entity:update-position",
      );
      return updated;
    } catch (error) {
      logger.error("Failed to update world entity position", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(
        ErrorCode.WORLD_ENTITY_UPDATE_FAILED,
        "Failed to update position",
        { input },
        error,
      );
    }
  }

  async deleteWorldEntity(id: string) {
    try {
      const currentResults = await getWorldDbClient()
        .select({ projectId: worldEntity.projectId })
        .from(worldEntity)
        .where(eq(worldEntity.id, id))
        .limit(1);
      const current = currentResults[0];

      if (!current) {
        throw new ServiceError(
          ErrorCode.WORLD_ENTITY_NOT_FOUND,
          "World entity not found",
          { id },
        );
      }

      const projectId = current.projectId;
      const now = new Date().toISOString();

      getWorldDbClient().transaction((tx) => {
        tx.delete(entityRelation)
          .where(
            or(
              eq(entityRelation.sourceId, id),
              eq(entityRelation.targetId, id),
              eq(entityRelation.sourceWorldEntityId, id),
              eq(entityRelation.targetWorldEntityId, id),
            ),
          )
          .run();

        const deleted = tx
          .update(worldEntity)
          .set({ deletedAt: now, updatedAt: now })
          .where(eq(worldEntity.id, id))
          .run();
        if (!deleted) {
          throw new ServiceError(
            ErrorCode.WORLD_ENTITY_NOT_FOUND,
            "World entity not found",
            { id },
          );
        }
      });

      logger.info("World entity deleted", { entityId: id });
      await projectService.touchProject(projectId);
      await projectService.persistPackageAfterMutation(
        projectId,
        "world-entity:delete",
      );
      return { success: true };
    } catch (error) {
      logger.error("Failed to delete world entity", error);
      throw new ServiceError(
        ErrorCode.WORLD_ENTITY_DELETE_FAILED,
        "Failed to delete world entity",
        { id },
        error,
      );
    }
  }
}

export const worldEntityService = new WorldEntityService();
