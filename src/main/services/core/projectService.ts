/**
 * Project service - 프로젝트 관리 비즈니스 로직
 */

import { db } from "../../database/index.js";
import { promises as fs } from "fs";
import path from "path";
import { createLogger } from "../../../shared/logger/index.js";
import {
  ErrorCode,
  DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
  LUIE_PACKAGE_EXTENSION,
  PACKAGE_EXPORT_DEBOUNCE_MS,
} from "../../../shared/constants/index.js";
import type {
  ProjectDeleteInput,
  ProjectCreateInput,
  ProjectUpdateInput,
} from "../../../shared/types/index.js";
import { ServiceError } from "../../utils/serviceError.js";
import { ensureSafeAbsolutePath } from "../../utils/pathValidation.js";
import { settingsManager } from "../../manager/settingsManager.js";
import { ProjectExportQueue } from "./project/projectExportQueue.js";
import {
  findProjectPathConflict,
  normalizeProjectPath,
  renameSnapshotDirectoryForProjectTitleChange,
} from "./project/projectPathPolicy.js";
import { exportProjectPackageWithOptions as exportProjectPackageWithOptionsImpl } from "./project/projectExportEngine.js";
import { openLuieProjectPackage } from "./project/projectImportOpen.js";

const logger = createLogger("ProjectService");

export class ProjectService {
  private exportQueue = new ProjectExportQueue(
    PACKAGE_EXPORT_DEBOUNCE_MS,
    async (projectId: string) => {
      await this.exportProjectPackage(projectId);
    },
    logger,
  );

  private toProjectPathKey(projectPath: string): string {
    const resolved = path.resolve(projectPath);
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
  }

  async reconcileProjectPathDuplicates(): Promise<{
    duplicateGroups: number;
    clearedRecords: number;
  }> {
    const projects = await db.getClient().project.findMany({
      where: {
        projectPath: { not: null },
      },
      select: {
        id: true,
        projectPath: true,
        updatedAt: true,
      },
    });

    const groups = new Map<
      string,
      Array<{ id: string; projectPath: string; updatedAt: Date }>
    >();
    for (const project of projects) {
      if (
        typeof project.projectPath !== "string" ||
        project.projectPath.length === 0
      ) {
        continue;
      }
      try {
        const safePath = ensureSafeAbsolutePath(
          project.projectPath,
          "projectPath",
        );
        const key = this.toProjectPathKey(safePath);
        const bucket = groups.get(key) ?? [];
        bucket.push({
          id: String(project.id),
          projectPath: safePath,
          updatedAt:
            project.updatedAt instanceof Date
              ? project.updatedAt
              : new Date(String(project.updatedAt)),
        });
        groups.set(key, bucket);
      } catch {
        continue;
      }
    }

    const duplicateGroupsToReconcile = Array.from(groups.values()).filter(
      (entries) => entries.length > 1,
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
            await db.getClient().project.update({
              where: { id: item.id },
              data: { projectPath: null },
            });
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

    return { duplicateGroups, clearedRecords };
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
          projectPath,
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
      logger.info("Project created successfully", { projectId });
      this.schedulePackageExport(projectId, "project:create");
      return project;
    } catch (error) {
      logger.error("Failed to create project", error);
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

      return project;
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
          projectPath: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      });

      const withPathStatus = await Promise.all(
        projects.map(async (project) => {
          const projectPath =
            typeof project.projectPath === "string"
              ? project.projectPath
              : null;
          const isLuiePath = Boolean(
            projectPath &&
            projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION),
          );
          if (!isLuiePath || !projectPath) {
            return {
              ...project,
              pathMissing: false,
            };
          }

          try {
            const safeProjectPath = ensureSafeAbsolutePath(
              projectPath,
              "projectPath",
            );
            await fs.access(safeProjectPath);
            return {
              ...project,
              pathMissing: false,
            };
          } catch {
            return {
              ...project,
              pathMissing: true,
            };
          }
        }),
      );

      return withPathStatus;
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

      const current = await db.getClient().project.findUnique({
        where: { id: input.id },
        select: { title: true, projectPath: true },
      });

      const project = await db.getClient().project.update({
        where: { id: input.id },
        data: {
          title: input.title,
          description: input.description,
          projectPath: normalizedProjectPath,
        },
      });

      const prevTitle = typeof current?.title === "string" ? current.title : "";
      const nextTitle = typeof project.title === "string" ? project.title : "";
      const projectPath =
        typeof project.projectPath === "string" ? project.projectPath : null;
      await renameSnapshotDirectoryForProjectTitleChange({
        projectId: String(project.id),
        projectPath,
        previousTitle: prevTitle,
        nextTitle,
        logger,
      });

      const projectId = String(project.id);
      logger.info("Project updated successfully", { projectId });
      this.schedulePackageExport(projectId, "project:update");
      return project;
    } catch (error) {
      logger.error("Failed to update project", error);
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
    const request =
      typeof input === "string"
        ? { id: input, deleteFile: false }
        : { id: input.id, deleteFile: Boolean(input.deleteFile) };
    let queuedProjectDelete = false;

    try {
      const existing = await db.getClient().project.findUnique({
        where: { id: request.id },
        select: { id: true, projectPath: true },
      });

      if (!existing?.id) {
        throw new ServiceError(
          ErrorCode.PROJECT_NOT_FOUND,
          "Project not found",
          { id: request.id },
        );
      }

      if (request.deleteFile) {
        const projectPath =
          typeof existing.projectPath === "string"
            ? existing.projectPath
            : null;
        if (
          projectPath &&
          projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)
        ) {
          const safeProjectPath = ensureSafeAbsolutePath(
            projectPath,
            "projectPath",
          );
          await fs.rm(safeProjectPath, { force: true, recursive: true });
        }
      }

      settingsManager.addPendingProjectDelete({
        projectId: request.id,
        deletedAt: new Date().toISOString(),
      });
      queuedProjectDelete = true;

      await db.getClient().project.delete({
        where: { id: request.id },
      });

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

  schedulePackageExport(projectId: string, reason?: string) {
    this.exportQueue.schedule(projectId, reason);
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

  async exportProjectPackage(projectId: string) {
    await this.exportProjectPackageWithOptions(projectId);
  }
}

export const projectService = new ProjectService();
