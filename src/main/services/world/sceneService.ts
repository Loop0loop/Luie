import { asc, eq } from "drizzle-orm";
import { db } from "../../database/index.js";
import { scene } from "../../database/schema.js";
import { createLogger } from "../../../shared/logger/index.js";
import { ErrorCode } from "../../../shared/constants/index.js";
import type { SceneCreateInput, SceneUpdateInput } from "../../../shared/types/index.js";
import { ServiceError } from "../../utils/serviceError.js";
import { projectService } from "../core/projectService.js";
import { dbMaintenanceService } from "../features/dbMaintenanceService.js";
import { MEMORY_TARGET_TYPES } from "../features/memory/memoryJobConstants.js";

const logger = createLogger("SceneService");

class SceneService {
  async createScene(input: SceneCreateInput) {
    try {
      const now = new Date().toISOString();
      const [created] = await db.getClient().insert(scene).values({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        chapterId: input.chapterId,
        title: input.title,
        body: input.body ?? "",
        startOffset: input.startOffset ?? null,
        endOffset: input.endOffset ?? null,
        order: input.order ?? 0,
        updatedAt: now,
      }).returning();

      if (!created) {
        throw new ServiceError(ErrorCode.DB_QUERY_FAILED, "Failed to create scene", { input });
      }

      await dbMaintenanceService.rebuildMemoryChunks({
        projectId: input.projectId,
        sourceType: MEMORY_TARGET_TYPES.SCENE,
        sourceId: String(created.id),
      });
      await projectService.touchProject(input.projectId);
      await projectService.persistPackageAfterMutation(input.projectId, "scene:create");
      return created;
    } catch (error) {
      logger.error("Failed to create scene", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(ErrorCode.DB_QUERY_FAILED, "Failed to create scene", { input }, error);
    }
  }

  async getScene(id: string) {
    const [found] = await db.getClient().select().from(scene).where(eq(scene.id, id)).limit(1);
    if (!found) {
      throw new ServiceError(ErrorCode.DB_QUERY_FAILED, "Scene not found", { id });
    }
    return found;
  }

  async getAllScenes(projectId: string) {
    return db.getClient().select().from(scene).where(eq(scene.projectId, projectId)).orderBy(asc(scene.order));
  }

  async updateScene(input: SceneUpdateInput) {
    try {
      const [current] = await db.getClient().select({
        id: scene.id,
        projectId: scene.projectId,
        chapterId: scene.chapterId,
      }).from(scene).where(eq(scene.id, input.id)).limit(1);
      if (!current) {
        throw new ServiceError(ErrorCode.DB_QUERY_FAILED, "Scene not found", { id: input.id });
      }

      const patch: Partial<typeof scene.$inferInsert> = { updatedAt: new Date().toISOString() };
      if (input.chapterId !== undefined) patch.chapterId = input.chapterId;
      if (input.title !== undefined) patch.title = input.title;
      if (input.body !== undefined) patch.body = input.body;
      if (input.startOffset !== undefined) patch.startOffset = input.startOffset;
      if (input.endOffset !== undefined) patch.endOffset = input.endOffset;
      if (input.order !== undefined) patch.order = input.order;

      const [updated] = await db.getClient().update(scene).set(patch).where(eq(scene.id, input.id)).returning();
      if (!updated) {
        throw new ServiceError(ErrorCode.DB_QUERY_FAILED, "Scene not found", { id: input.id });
      }

      await dbMaintenanceService.rebuildMemoryChunks({
        projectId: String(updated.projectId),
        sourceType: MEMORY_TARGET_TYPES.SCENE,
        sourceId: String(updated.id),
      });
      await projectService.touchProject(String(updated.projectId));
      await projectService.persistPackageAfterMutation(String(updated.projectId), "scene:update");
      return updated;
    } catch (error) {
      logger.error("Failed to update scene", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(ErrorCode.DB_QUERY_FAILED, "Failed to update scene", { input }, error);
    }
  }

  async deleteScene(id: string) {
    try {
      const [current] = await db.getClient().select({
        id: scene.id,
        projectId: scene.projectId,
      }).from(scene).where(eq(scene.id, id)).limit(1);

      if (!current) {
        throw new ServiceError(ErrorCode.DB_QUERY_FAILED, "Scene not found", { id });
      }

      await db.getClient().delete(scene).where(eq(scene.id, id));

      await dbMaintenanceService.rebuildMemoryChunks({
        projectId: String(current.projectId),
        sourceType: MEMORY_TARGET_TYPES.SCENE,
        sourceId: id,
      });
      await projectService.touchProject(String(current.projectId));
      await projectService.persistPackageAfterMutation(String(current.projectId), "scene:delete");
      return { success: true };
    } catch (error) {
      logger.error("Failed to delete scene", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(ErrorCode.DB_QUERY_FAILED, "Failed to delete scene", { id }, error);
    }
  }
}

export const sceneService = new SceneService();
