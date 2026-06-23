import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../../infra/database/index.js";
import { scrapMemo } from "../../infra/database/index.js";
import { createLogger } from "../../../shared/logger/index.js";
import { ErrorCode } from "../../../shared/constants/index.js";
import type {
  ScrapMemoCreateInput,
  ScrapMemoUpdateInput,
} from "../../../shared/types/index.js";
import { ServiceError } from "../../utils/error/index.js";
import { projectService } from "../core/projectService.js";
import { dbMaintenanceService } from "../features/dbMaintenance/index.js";
import { MEMORY_TARGET_TYPES } from "../features/memory/memoryJobConstants.js";

const logger = createLogger("ScrapMemoService");

class ScrapMemoService {
  async createScrapMemo(input: ScrapMemoCreateInput) {
    try {
      const now = new Date().toISOString();
      const [created] = await db
        .getClient()
        .insert(scrapMemo)
        .values({
          id: crypto.randomUUID(),
          projectId: input.projectId,
          title: input.title,
          content: input.content,
          tags: JSON.stringify(input.tags ?? []),
          updatedAt: now,
        })
        .returning();
      if (!created)
        throw new ServiceError(
          ErrorCode.SCRAP_MEMO_CREATE_FAILED,
          "Failed to create scrap memo",
          { input },
        );

      await dbMaintenanceService.rebuildMemoryChunks({
        projectId: input.projectId,
        sourceType: MEMORY_TARGET_TYPES.SCRAP_MEMO,
        sourceId: String(created.id),
      });
      await projectService.touchProject(input.projectId);
      await projectService.persistPackageAfterMutation(
        input.projectId,
        "scrap-memo:create",
      );

      return {
        ...created,
        tags: JSON.parse(created.tags ?? "[]") as string[],
      };
    } catch (error) {
      logger.error("Failed to create scrap memo", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(
        ErrorCode.SCRAP_MEMO_CREATE_FAILED,
        "Failed to create scrap memo",
        { input },
        error,
      );
    }
  }

  async getAllScrapMemos(projectId: string) {
    const rows = await db
      .getClient()
      .select()
      .from(scrapMemo)
      .where(
        and(eq(scrapMemo.projectId, projectId), isNull(scrapMemo.deletedAt)),
      )
      .orderBy(asc(scrapMemo.sortOrder), asc(scrapMemo.updatedAt));
    return rows.map((row) => ({
      ...row,
      tags: JSON.parse(row.tags ?? "[]") as string[],
    }));
  }

  async updateScrapMemo(input: ScrapMemoUpdateInput) {
    try {
      const [current] = await db
        .getClient()
        .select({ id: scrapMemo.id, projectId: scrapMemo.projectId })
        .from(scrapMemo)
        .where(and(eq(scrapMemo.id, input.id), isNull(scrapMemo.deletedAt)))
        .limit(1);
      if (!current)
        throw new ServiceError(
          ErrorCode.SCRAP_MEMO_NOT_FOUND,
          "Scrap memo not found",
          { id: input.id },
        );

      const patch: Partial<typeof scrapMemo.$inferInsert> = {
        updatedAt: new Date().toISOString(),
      };
      if (input.title !== undefined) patch.title = input.title;
      if (input.content !== undefined) patch.content = input.content;
      if (input.tags !== undefined) patch.tags = JSON.stringify(input.tags);

      const [updated] = await db
        .getClient()
        .update(scrapMemo)
        .set(patch)
        .where(eq(scrapMemo.id, input.id))
        .returning();
      if (!updated)
        throw new ServiceError(
          ErrorCode.SCRAP_MEMO_NOT_FOUND,
          "Scrap memo not found",
          { id: input.id },
        );

      await dbMaintenanceService.rebuildMemoryChunks({
        projectId: String(updated.projectId),
        sourceType: MEMORY_TARGET_TYPES.SCRAP_MEMO,
        sourceId: String(updated.id),
      });
      await projectService.touchProject(String(updated.projectId));
      await projectService.persistPackageAfterMutation(
        String(updated.projectId),
        "scrap-memo:update",
      );
      return {
        ...updated,
        tags: JSON.parse(updated.tags ?? "[]") as string[],
      };
    } catch (error) {
      logger.error("Failed to update scrap memo", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(
        ErrorCode.SCRAP_MEMO_UPDATE_FAILED,
        "Failed to update scrap memo",
        { input },
        error,
      );
    }
  }

  async deleteScrapMemo(id: string) {
    try {
      const [current] = await db
        .getClient()
        .select({ id: scrapMemo.id, projectId: scrapMemo.projectId })
        .from(scrapMemo)
        .where(and(eq(scrapMemo.id, id), isNull(scrapMemo.deletedAt)))
        .limit(1);
      if (!current)
        throw new ServiceError(
          ErrorCode.SCRAP_MEMO_NOT_FOUND,
          "Scrap memo not found",
          { id },
        );

      const now = new Date().toISOString();
      await db
        .getClient()
        .update(scrapMemo)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(scrapMemo.id, id));
      await dbMaintenanceService.rebuildMemoryChunks({
        projectId: String(current.projectId),
        sourceType: MEMORY_TARGET_TYPES.SCRAP_MEMO,
        sourceId: id,
      });
      await projectService.touchProject(String(current.projectId));
      await projectService.persistPackageAfterMutation(
        String(current.projectId),
        "scrap-memo:delete",
      );
      return { success: true };
    } catch (error) {
      logger.error("Failed to delete scrap memo", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(
        ErrorCode.SCRAP_MEMO_DELETE_FAILED,
        "Failed to delete scrap memo",
        { id },
        error,
      );
    }
  }
}

export const scrapMemoService = new ScrapMemoService();
