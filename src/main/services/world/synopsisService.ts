import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../../database/index.js";
import { synopsis } from "../../database/schema.js";
import { createLogger } from "../../../shared/logger/index.js";
import { ErrorCode } from "../../../shared/constants/index.js";
import type { SynopsisCreateInput, SynopsisUpdateInput } from "../../../shared/types/index.js";
import { ServiceError } from "../../utils/serviceError.js";
import { projectService } from "../core/projectService.js";
import { dbMaintenanceService } from "../features/dbMaintenanceService.js";
import { MEMORY_TARGET_TYPES } from "../features/memory/memoryJobConstants.js";

const logger = createLogger("SynopsisService");

class SynopsisService {
  async createSynopsis(input: SynopsisCreateInput) {
    try {
      const now = new Date().toISOString();
      const [created] = await db.getClient().insert(synopsis).values({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        chapterId: input.chapterId ?? null,
        title: input.title,
        body: input.body ?? "",
        updatedAt: now,
      }).returning();

      if (!created) throw new ServiceError(ErrorCode.SYNOPSIS_CREATE_FAILED, "Failed to create synopsis", { input });

      await dbMaintenanceService.rebuildMemoryChunks({
        projectId: input.projectId,
        sourceType: MEMORY_TARGET_TYPES.SYNOPSIS,
        sourceId: String(created.id),
      });
      await projectService.touchProject(input.projectId);
      await projectService.persistPackageAfterMutation(input.projectId, "synopsis:create");
      return created;
    } catch (error) {
      logger.error("Failed to create synopsis", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(ErrorCode.SYNOPSIS_CREATE_FAILED, "Failed to create synopsis", { input }, error);
    }
  }

  async getSynopsis(id: string) {
    const [found] = await db
      .getClient()
      .select()
      .from(synopsis)
      .where(and(eq(synopsis.id, id), isNull(synopsis.deletedAt)))
      .limit(1);
    if (!found) throw new ServiceError(ErrorCode.SYNOPSIS_NOT_FOUND, "Synopsis not found", { id });
    return found;
  }

  async getAllSynopsis(projectId: string) {
    return db
      .getClient()
      .select()
      .from(synopsis)
      .where(and(eq(synopsis.projectId, projectId), isNull(synopsis.deletedAt)))
      .orderBy(asc(synopsis.updatedAt));
  }

  async updateSynopsis(input: SynopsisUpdateInput) {
    try {
      const [current] = await db
        .getClient()
        .select({ id: synopsis.id, projectId: synopsis.projectId })
        .from(synopsis)
        .where(and(eq(synopsis.id, input.id), isNull(synopsis.deletedAt)))
        .limit(1);
      if (!current) throw new ServiceError(ErrorCode.SYNOPSIS_NOT_FOUND, "Synopsis not found", { id: input.id });

      const patch: Partial<typeof synopsis.$inferInsert> = { updatedAt: new Date().toISOString() };
      if (input.chapterId !== undefined) patch.chapterId = input.chapterId;
      if (input.title !== undefined) patch.title = input.title;
      if (input.body !== undefined) patch.body = input.body;

      const [updated] = await db.getClient().update(synopsis).set(patch).where(eq(synopsis.id, input.id)).returning();
      if (!updated) throw new ServiceError(ErrorCode.SYNOPSIS_NOT_FOUND, "Synopsis not found", { id: input.id });

      await dbMaintenanceService.rebuildMemoryChunks({
        projectId: String(updated.projectId),
        sourceType: MEMORY_TARGET_TYPES.SYNOPSIS,
        sourceId: String(updated.id),
      });
      await projectService.touchProject(String(updated.projectId));
      await projectService.persistPackageAfterMutation(String(updated.projectId), "synopsis:update");
      return updated;
    } catch (error) {
      logger.error("Failed to update synopsis", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(ErrorCode.SYNOPSIS_UPDATE_FAILED, "Failed to update synopsis", { input }, error);
    }
  }

  async deleteSynopsis(id: string) {
    try {
      const [current] = await db
        .getClient()
        .select({ id: synopsis.id, projectId: synopsis.projectId })
        .from(synopsis)
        .where(and(eq(synopsis.id, id), isNull(synopsis.deletedAt)))
        .limit(1);
      if (!current) throw new ServiceError(ErrorCode.SYNOPSIS_NOT_FOUND, "Synopsis not found", { id });

      const now = new Date().toISOString();
      await db.getClient().update(synopsis).set({ deletedAt: now, updatedAt: now }).where(eq(synopsis.id, id));
      await dbMaintenanceService.rebuildMemoryChunks({
        projectId: String(current.projectId),
        sourceType: MEMORY_TARGET_TYPES.SYNOPSIS,
        sourceId: id,
      });
      await projectService.touchProject(String(current.projectId));
      await projectService.persistPackageAfterMutation(String(current.projectId), "synopsis:delete");
      return { success: true };
    } catch (error) {
      logger.error("Failed to delete synopsis", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(ErrorCode.SYNOPSIS_DELETE_FAILED, "Failed to delete synopsis", { id }, error);
    }
  }
}

export const synopsisService = new SynopsisService();
