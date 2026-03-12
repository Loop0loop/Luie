/**
 * Project service - 프로젝트 관리 비즈니스 로직
 */

import { db } from "../../database/index.js";
import { createLogger } from "../../../shared/logger/index.js";
import {
  ErrorCode,
  DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
  PACKAGE_EXPORT_DEBOUNCE_MS,
  LUIE_PACKAGE_META_FILENAME,
} from "../../../shared/constants/index.js";
import type {
  ProjectDeleteInput,
  ProjectCreateInput,
  ProjectUpdateInput,
} from "../../../shared/types/index.js";
import { ServiceError } from "../../utils/serviceError.js";
import { settingsManager } from "../../manager/settingsManager.js";
import { ProjectExportQueue } from "./project/projectExportQueue.js";
import {
  deleteProjectPackageFileIfRequested,
  normalizeProjectDeleteInput,
} from "./project/projectDeletionPolicy.js";
import { withProjectPathStatus } from "./project/projectListStatus.js";
import {
  getProjectAttachmentPath,
  hydrateProjectsWithAttachmentPaths,
  listProjectAttachmentEntries,
  migrateLegacyProjectAttachments,
  setProjectAttachmentPath,
} from "./project/projectAttachmentStore.js";
import {
  getProjectLastOpenedAt,
  hydrateProjectsWithLocalState,
  markProjectOpened as markProjectOpenedLocalState,
  sortProjectsByRecentLocalState,
} from "./project/projectLocalStateStore.js";
import {
  findProjectPathConflict,
  normalizeLuiePackagePath,
  normalizeProjectPath,
  renameSnapshotDirectoryForProjectTitleChange,
} from "./project/projectPathPolicy.js";
import { collectDuplicateProjectPathGroups } from "./project/projectPathReconciliation.js";
import { exportProjectPackageWithOptions as exportProjectPackageWithOptionsImpl } from "./project/projectExportEngine.js";
import { openLuieProjectPackage } from "./project/projectImportOpen.js";
import { LuieMetaSchema } from "./project/projectLuieSchemas.js";
import { readLuieEntry } from "../../utils/luiePackage.js";
import { appearanceCacheService } from "../world/appearanceCacheService.js";

const logger = createLogger("ProjectService");

export class ProjectService {
  private exportQueue = new ProjectExportQueue(
    PACKAGE_EXPORT_DEBOUNCE_MS,
    async (projectId: string) => await this.exportProjectPackage(projectId),
    logger,
  );

  async reconcileProjectPathDuplicates(): Promise<{
    duplicateGroups: number;
    clearedRecords: number;
    migratedRecords: number;
    skippedInvalidRecords: number;
  }> {
    const migration = await migrateLegacyProjectAttachments();
    const projects = (await listProjectAttachmentEntries()).filter(
      (project) => project.projectPath !== null,
    );

    const duplicateGroupsToReconcile = collectDuplicateProjectPathGroups(
      projects.map((project) => ({
        id: String(project.id),
        projectPath: project.projectPath,
        updatedAt: project.updatedAt,
      })),
    );

    const reconciliationResults = await Promise.all(
      duplicateGroupsToReconcile.map(async (entries) => {
        const sorted = [...entries].sort(
          (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
        );
        const keep = sorted[0];
        const stale = sorted.slice(1);

        await Promise.all(
          stale.map(async (item) => {
            await setProjectAttachmentPath(item.id, null);
            logger.warn("Cleared duplicate projectPath from stale record", {
              keepProjectId: keep.id,
              staleProjectId: item.id,
              projectPath: item.projectPath,
            });
          }),
        );

        return stale.length;
      }),
    );

    const duplicateGroups = duplicateGroupsToReconcile.length;
    const clearedRecords = reconciliationResults.reduce(
      (total, count) => total + count,
      0,
    );

    if (duplicateGroups > 0) {
      logger.info("Project path duplicate reconciliation completed", {
        duplicateGroups,
        clearedRecords,
      });
    }

    if (migration.migratedRecords > 0 || migration.clearedLegacyRecords > 0) {
      logger.info("Legacy project attachment migration completed", migration);
    }

    return {
      duplicateGroups,
      clearedRecords,
      migratedRecords: migration.migratedRecords,
      skippedInvalidRecords: migration.skippedInvalidRecords,
    };
  }

  async createProject(input: ProjectCreateInput) {
    try {
      logger.info("Creating project", input);
      const projectPath = normalizeProjectPath(input.projectPath);
      if (projectPath) {
        const conflict = await findProjectPathConflict(projectPath);
        if (conflict) {
          throw new ServiceError(
            ErrorCode.VALIDATION_FAILED,
            "Project path is already registered",
            { projectPath, conflictProjectId: conflict.id },
          );
        }
      }

      const project = await db.getClient().project.create({
        data: {
          title: input.title,
          description: input.description,
          settings: {
            create: {
              autoSave: true,
              autoSaveInterval: DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
            },
          },
        },
        include: {
          settings: true,
        },
      });

      const projectId = String(project.id);
      if (projectPath !== undefined) {
        await setProjectAttachmentPath(projectId, projectPath);
      }
      logger.info("Project created successfully", { projectId });
      this.schedulePackageExport(projectId, "project:create");
      return {
        ...project,
        projectPath: projectPath ?? null,
      };
    } catch (error) {
      logger.error("Failed to create project", error);
      if (error instanceof ServiceError) {
        throw error;
      }
      throw new ServiceError(
        ErrorCode.PROJECT_CREATE_FAILED,
        "Failed to create project",
        { input },
        error,
      );
    }
  }

  async openLuieProject(packagePath: string) {
    try {
      return await openLuieProjectPackage({
        packagePath,
        logger,
        exportRecoveredPackage: async (
          projectId: string,
          recoveryPath: string,
        ) =>
          await this.exportProjectPackageWithOptions(projectId, {
            targetPath: recoveryPath,
            worldSourcePath: null,
          }),
        getProjectById: async (projectId: string) =>
          await this.getProject(projectId),
      });
    } catch (error) {
      logger.error("Failed to open .luie package", { packagePath, error });
      if (error instanceof ServiceError) {
        throw error;
      }
      throw new ServiceError(
        ErrorCode.PROJECT_CREATE_FAILED,
        "Failed to open .luie package",
        { packagePath },
        error,
      );
    }
  }

  private async getProjectWithAttachmentStatus(id: string) {
    const project = await this.getProject(id);
    const [enriched] = await withProjectPathStatus([project]);
    return enriched ?? project;
  }

  private async readLuieMetaForAttachment(packagePath: string) {
    let raw: string | null;
    try {
      raw = await readLuieEntry(packagePath, LUIE_PACKAGE_META_FILENAME, logger);
    } catch (error) {
      throw new ServiceError(
        ErrorCode.FS_READ_FAILED,
        "Failed to read .luie package meta",
        { packagePath },
        error,
      );
    }

    if (!raw) {
      throw new ServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Selected .luie package is missing meta",
        { packagePath },
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch (error) {
      throw new ServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Selected .luie package has invalid meta JSON",
        { packagePath },
        error,
      );
    }

    const parsed = LuieMetaSchema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new ServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Selected .luie package has invalid meta format",
        {
          packagePath,
          issues: parsed.error.issues,
        },
      );
    }

    return parsed.data;
  }

  async attachProjectPackage(projectId: string, packagePath: string) {
    try {
      const normalizedPath = normalizeLuiePackagePath(packagePath, "packagePath");
      const [existing, conflict, meta] = await Promise.all([
        db.getClient().project.findUnique({
          where: { id: projectId },
          select: { id: true },
        }),
        findProjectPathConflict(normalizedPath, projectId),
        this.readLuieMetaForAttachment(normalizedPath),
      ]);

      if (!existing?.id) {
        throw new ServiceError(
          ErrorCode.PROJECT_NOT_FOUND,
          "Project not found",
          { id: projectId },
        );
      }

      if (conflict) {
        throw new ServiceError(
          ErrorCode.VALIDATION_FAILED,
          "Project path is already registered",
          {
            projectId,
            projectPath: normalizedPath,
            conflictProjectId: conflict.id,
          },
        );
      }

      const metaProjectId =
        typeof meta.projectId === "string" ? meta.projectId : undefined;
      if (metaProjectId && metaProjectId !== projectId) {
        throw new ServiceError(
          ErrorCode.VALIDATION_FAILED,
          "Selected .luie package belongs to a different project",
          {
            projectId,
            packagePath: normalizedPath,
            packageProjectId: metaProjectId,
          },
        );
      }

      const exported = await this.exportProjectPackageWithOptions(projectId, {
        targetPath: normalizedPath,
        worldSourcePath: normalizedPath,
      });
      if (!exported) {
        throw new ServiceError(
          ErrorCode.FS_WRITE_FAILED,
          "Failed to attach .luie package",
          {
            projectId,
            packagePath: normalizedPath,
          },
        );
      }

      await setProjectAttachmentPath(projectId, normalizedPath);
      logger.info("Project attached to existing .luie package", {
        projectId,
        packagePath: normalizedPath,
      });
      return await this.getProjectWithAttachmentStatus(projectId);
    } catch (error) {
      logger.error("Failed to attach .luie package", {
        projectId,
        packagePath,
        error,
      });
      if (error instanceof ServiceError) {
        throw error;
      }
      throw new ServiceError(
        ErrorCode.PROJECT_UPDATE_FAILED,
        "Failed to attach .luie package",
        { projectId, packagePath },
        error,
      );
    }
  }

  async materializeProjectPackage(projectId: string, targetPath: string) {
    try {
      const normalizedPath = normalizeLuiePackagePath(targetPath, "targetPath");
      const [existing, conflict, currentAttachmentPath] = await Promise.all([
        db.getClient().project.findUnique({
          where: { id: projectId },
          select: { id: true },
        }),
        findProjectPathConflict(normalizedPath, projectId),
        getProjectAttachmentPath(projectId),
      ]);

      if (!existing?.id) {
        throw new ServiceError(
          ErrorCode.PROJECT_NOT_FOUND,
          "Project not found",
          { id: projectId },
        );
      }

      if (conflict) {
        throw new ServiceError(
          ErrorCode.VALIDATION_FAILED,
          "Project path is already registered",
          {
            projectId,
            projectPath: normalizedPath,
            conflictProjectId: conflict.id,
          },
        );
      }

      const exported = await this.exportProjectPackageWithOptions(projectId, {
        targetPath: normalizedPath,
        worldSourcePath: currentAttachmentPath ?? null,
      });
      if (!exported) {
        throw new ServiceError(
          ErrorCode.FS_WRITE_FAILED,
          "Failed to materialize .luie package",
          {
            projectId,
            targetPath: normalizedPath,
          },
        );
      }

      await setProjectAttachmentPath(projectId, normalizedPath);
      logger.info("Project materialized into .luie package", {
        projectId,
        targetPath: normalizedPath,
      });
      return await this.getProjectWithAttachmentStatus(projectId);
    } catch (error) {
      logger.error("Failed to materialize .luie package", {
        projectId,
        targetPath,
        error,
      });
      if (error instanceof ServiceError) {
        throw error;
      }
      throw new ServiceError(
        ErrorCode.PROJECT_UPDATE_FAILED,
        "Failed to materialize .luie package",
        { projectId, targetPath },
        error,
      );
    }
  }

  async getProject(id: string) {
    try {
      const project = await db.getClient().project.findUnique({
        where: { id },
        include: {
          settings: true,
          chapters: {
            where: { deletedAt: null },
            orderBy: { order: "asc" },
          },
          characters: true,
          terms: true,
        },
      });

      if (!project) {
        throw new ServiceError(
          ErrorCode.PROJECT_NOT_FOUND,
          "Project not found",
          { id },
        );
      }

      return {
        ...project,
        projectPath: await getProjectAttachmentPath(id),
        lastOpenedAt: await getProjectLastOpenedAt(id),
      };
    } catch (error) {
      logger.error("Failed to get project", error);
      throw error;
    }
  }

  async getAllProjects() {
    try {
      const projects = await db.getClient().project.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const normalizedProjects = projects.map((project: {
          id: string;
          title: string;
          description: string | null;
          createdAt: Date;
          updatedAt: Date;
        }) => ({
          ...project,
          id: String(project.id),
          description:
            typeof project.description === "string" ? project.description : null,
        }));

      const projectsWithAttachments = await hydrateProjectsWithAttachmentPaths(
        normalizedProjects,
      );
      const projectsWithLocalState = await hydrateProjectsWithLocalState(
        projectsWithAttachments,
      );

      return await withProjectPathStatus(
        sortProjectsByRecentLocalState(projectsWithLocalState),
      );
    } catch (error) {
      logger.error("Failed to get all projects", error);
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to get all projects",
        undefined,
        error,
      );
    }
  }

  async updateProject(input: ProjectUpdateInput) {
    try {
      const normalizedProjectPath =
        input.projectPath === undefined
          ? undefined
          : (normalizeProjectPath(input.projectPath) ?? null);
      if (normalizedProjectPath) {
        const conflict = await findProjectPathConflict(
          normalizedProjectPath,
          input.id,
        );
        if (conflict) {
          throw new ServiceError(
            ErrorCode.VALIDATION_FAILED,
            "Project path is already registered",
            {
              projectPath: normalizedProjectPath,
              conflictProjectId: conflict.id,
              projectId: input.id,
            },
          );
        }
      }

      const [current, currentProjectPath] = await Promise.all([
        db.getClient().project.findUnique({
          where: { id: input.id },
          select: { title: true },
        }),
        getProjectAttachmentPath(input.id),
      ]);

      const project = await db.getClient().project.update({
        where: { id: input.id },
        data: {
          title: input.title,
          description: input.description,
        },
      });

      const nextProjectPath =
        normalizedProjectPath === undefined
          ? currentProjectPath
          : normalizedProjectPath;
      if (normalizedProjectPath !== undefined) {
        await setProjectAttachmentPath(input.id, normalizedProjectPath);
      }

      const prevTitle = typeof current?.title === "string" ? current.title : "";
      const nextTitle = typeof project.title === "string" ? project.title : "";
      await renameSnapshotDirectoryForProjectTitleChange({
        projectId: String(project.id),
        projectPath: nextProjectPath ?? null,
        previousTitle: prevTitle,
        nextTitle,
        logger,
      });

      const projectId = String(project.id);
      logger.info("Project updated successfully", { projectId });
      this.schedulePackageExport(projectId, "project:update");
      return {
        ...project,
        projectPath: nextProjectPath ?? null,
      };
    } catch (error) {
      logger.error("Failed to update project", error);
      if (error instanceof ServiceError) {
        throw error;
      }
      throw new ServiceError(
        ErrorCode.PROJECT_UPDATE_FAILED,
        "Failed to update project",
        { input },
        error,
      );
    }
  }

  private clearSyncBaselineForProject(projectId: string): void {
    const syncSettings = settingsManager.getSyncSettings();
    const existingBaselines = syncSettings.entityBaselinesByProjectId;
    if (!existingBaselines || !(projectId in existingBaselines)) return;
    const nextBaselines = { ...existingBaselines };
    delete nextBaselines[projectId];
    settingsManager.setSyncSettings({
      entityBaselinesByProjectId:
        Object.keys(nextBaselines).length > 0 ? nextBaselines : undefined,
    });
  }

  async deleteProject(input: string | ProjectDeleteInput) {
    const request = normalizeProjectDeleteInput(input);
    let queuedProjectDelete = false;

    try {
      const [existing, projectPath] = await Promise.all([
        db.getClient().project.findUnique({
          where: { id: request.id },
          select: { id: true },
        }),
        getProjectAttachmentPath(request.id),
      ]);

      if (!existing?.id) {
        throw new ServiceError(
          ErrorCode.PROJECT_NOT_FOUND,
          "Project not found",
          { id: request.id },
        );
      }

      await deleteProjectPackageFileIfRequested({
        deleteFile: request.deleteFile,
        projectPath,
      });

      settingsManager.addPendingProjectDelete({
        projectId: request.id,
        deletedAt: new Date().toISOString(),
      });
      queuedProjectDelete = true;

      await db.getClient().project.delete({
        where: { id: request.id },
      });
      try {
        await appearanceCacheService.clearProject(request.id);
      } catch (cacheError) {
        logger.warn("Failed to clear project appearance cache during delete", {
          projectId: request.id,
          cacheError,
        });
      }

      this.clearSyncBaselineForProject(request.id);

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
      if (error instanceof ServiceError) {
        throw error;
      }
      throw new ServiceError(
        ErrorCode.PROJECT_DELETE_FAILED,
        "Failed to delete project",
        { id: request.id, deleteFile: request.deleteFile },
        error,
      );
    }
  }

  async removeProjectFromList(id: string) {
    try {
      const existing = await db.getClient().project.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing?.id) {
        throw new ServiceError(
          ErrorCode.PROJECT_NOT_FOUND,
          "Project not found",
          { id },
        );
      }

      await db.getClient().project.delete({
        where: { id },
      });
      try {
        await appearanceCacheService.clearProject(id);
      } catch (cacheError) {
        logger.warn("Failed to clear project appearance cache during remove", {
          projectId: id,
          cacheError,
        });
      }

      this.clearSyncBaselineForProject(id);

      logger.info("Project removed from list", { projectId: id });
      return { success: true };
    } catch (error) {
      logger.error("Failed to remove project from list", error);
      if (error instanceof ServiceError) {
        throw error;
      }
      throw new ServiceError(
        ErrorCode.PROJECT_DELETE_FAILED,
        "Failed to remove project from list",
        { id },
        error,
      );
    }
  }

  async markProjectOpened(id: string) {
    const lastOpenedAt = await markProjectOpenedLocalState(id);
    logger.info("Project marked as opened", {
      projectId: id,
      lastOpenedAt: lastOpenedAt.toISOString(),
    });
    return {
      projectId: id,
      lastOpenedAt: lastOpenedAt.toISOString(),
    };
  }

  schedulePackageExport(projectId: string, reason?: string) {
    this.exportQueue.schedule(projectId, reason);
  }

  async exportProjectPackageNow(projectId: string, reason?: string): Promise<boolean> {
    return await this.exportQueue.runNow(projectId, reason);
  }

  async attemptImmediatePackageExport(
    projectId: string,
    reason: string,
  ): Promise<{ exported: boolean; error?: unknown }> {
    try {
      const exported = await this.exportProjectPackageNow(projectId, reason);
      if (!exported) {
        logger.info("Skipped immediate project package export", {
          projectId,
          reason,
        });
      }
      return { exported };
    } catch (error) {
      this.schedulePackageExport(projectId, `${reason}:retry`);
      logger.warn("Immediate project package export failed; queued retry", {
        projectId,
        reason,
        error,
      });
      return {
        exported: false,
        error,
      };
    }
  }

  async flushPendingExports(timeoutMs = 8_000): Promise<{
    total: number;
    flushed: number;
    failed: number;
    timedOut: boolean;
  }> {
    return await this.exportQueue.flush(timeoutMs);
  }

  private async exportProjectPackageWithOptions(
    projectId: string,
    options?: {
      targetPath?: string;
      worldSourcePath?: string | null;
    },
  ): Promise<boolean> {
    return await exportProjectPackageWithOptionsImpl({
      projectId,
      options,
      logger,
    });
  }

  async exportProjectPackage(projectId: string): Promise<boolean> {
    return await this.exportProjectPackageWithOptions(projectId);
  }
}

export const projectService = new ProjectService();
