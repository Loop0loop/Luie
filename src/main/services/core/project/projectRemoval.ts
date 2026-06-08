import { eq } from "drizzle-orm";
import { db } from "../../../infra/database/index.js";
import * as schema from "../../../infra/database/index.js";
import { ErrorCode } from "../../../../shared/constants/index.js";
import type { ProjectDeleteInput } from "../../../../shared/types/index.js";
import { settingsManager } from "../../../domains/settings/index.js";
import { ServiceError } from "../../../utils/error/index.js";
import {
  deleteProjectPackageFileIfRequested,
  normalizeProjectDeleteInput,
} from "./projectDeletionPolicy.js";
import { getProjectAttachmentPath } from "./projectAttachmentStore.js";

type LoggerLike = {
  info: (message: string, context?: unknown) => void;
  warn: (message: string, context?: unknown) => void;
  error: (message: string, context?: unknown) => void;
};

const loadAppearanceCacheService = async () =>
  (await import("../../world/appearanceCacheService.js")).appearanceCacheService;

const loadChapterSearchCacheService = async () =>
  (await import("../../features/chapterSearchCacheService.js"))
    .chapterSearchCacheService;

const clearSyncBaselineForProject = (projectId: string): void => {
  const syncSettings = settingsManager.getSyncSettings();
  const existingBaselines = syncSettings.entityBaselinesByProjectId;
  if (!existingBaselines || !(projectId in existingBaselines)) return;
  const nextBaselines = { ...existingBaselines };
  delete nextBaselines[projectId];
  settingsManager.setSyncSettings({
    entityBaselinesByProjectId:
      Object.keys(nextBaselines).length > 0 ? nextBaselines : undefined,
  });
};

const purgeDerivedProjectRows = async (projectId: string): Promise<void> => {
  const client = db.getClient();
  await client.delete(schema.memoryEmbedding).where(eq(schema.memoryEmbedding.projectId, projectId));
  await client.delete(schema.memoryChunk).where(eq(schema.memoryChunk.projectId, projectId));
  await client.delete(schema.memoryBuildJob).where(eq(schema.memoryBuildJob.projectId, projectId));
  await client.delete(schema.searchDirtyQueue).where(eq(schema.searchDirtyQueue.projectId, projectId));
};

const clearProjectCaches = async (
  projectId: string,
  operation: "delete" | "remove",
  logger: LoggerLike,
): Promise<void> => {
  try {
    const [appearanceCacheService, chapterSearchCacheService] =
      await Promise.all([
        loadAppearanceCacheService(),
        loadChapterSearchCacheService(),
      ]);
    await Promise.all([
      appearanceCacheService.clearProject(projectId),
      chapterSearchCacheService.clearProject(projectId),
    ]);
  } catch (cacheError) {
    logger.warn(`Failed to clear project cache during ${operation}`, {
      projectId,
      cacheError,
    });
  }
};

const ensureProjectExists = async (id: string): Promise<void> => {
  const existingRows = await db.getClient()
    .select({ id: schema.project.id })
    .from(schema.project)
    .where(eq(schema.project.id, id))
    .limit(1);
  const existing = existingRows.length > 0 ? existingRows[0] : null;

  if (!existing?.id) {
    throw new ServiceError(
      ErrorCode.PROJECT_NOT_FOUND,
      "Project not found",
      { id },
    );
  }
};

export const deleteProjectRecord = async (
  input: string | ProjectDeleteInput,
  logger: LoggerLike,
) => {
  const request = normalizeProjectDeleteInput(input);
  let queuedProjectDelete = false;

  try {
    await ensureProjectExists(request.id);
    const projectPath = await getProjectAttachmentPath(request.id);
    await deleteProjectPackageFileIfRequested({
      deleteFile: request.deleteFile,
      projectPath,
    });

    settingsManager.addPendingProjectDelete({
      projectId: request.id,
      deletedAt: new Date().toISOString(),
    });
    queuedProjectDelete = true;

    await purgeDerivedProjectRows(request.id);
    const deletedRows = await db.getClient()
      .delete(schema.project)
      .where(eq(schema.project.id, request.id))
      .returning({ id: schema.project.id });

    if (!deletedRows.length) {
      throw new ServiceError(
        ErrorCode.PROJECT_NOT_FOUND,
        "Project not found",
        { id: request.id },
      );
    }

    await clearProjectCaches(request.id, "delete", logger);
    clearSyncBaselineForProject(request.id);

    logger.info("Project deleted successfully", {
      projectId: request.id,
      deleteFile: request.deleteFile,
    });
    return { success: true };
  } catch (error) {
    if (queuedProjectDelete) {
      settingsManager.removePendingProjectDeletes([request.id]);
    }
    logger.error("Failed to delete project", error);
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      ErrorCode.PROJECT_DELETE_FAILED,
      "Failed to delete project",
      { id: request.id, deleteFile: request.deleteFile },
      error,
    );
  }
};

export const removeProjectListRecord = async (
  id: string,
  logger: LoggerLike,
) => {
  try {
    await ensureProjectExists(id);
    await purgeDerivedProjectRows(id);
    const deletedRows = await db.getClient()
      .delete(schema.project)
      .where(eq(schema.project.id, id))
      .returning({ id: schema.project.id });

    if (!deletedRows.length) {
      throw new ServiceError(
        ErrorCode.PROJECT_NOT_FOUND,
        "Project not found",
        { id },
      );
    }

    await clearProjectCaches(id, "remove", logger);
    clearSyncBaselineForProject(id);

    logger.info("Project removed from list", { projectId: id });
    return { success: true };
  } catch (error) {
    logger.error("Failed to remove project from list", error);
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      ErrorCode.PROJECT_DELETE_FAILED,
      "Failed to remove project from list",
      { id },
      error,
    );
  }
};
