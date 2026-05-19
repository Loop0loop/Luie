/**
 * Project service - 프로젝트 관리 비즈니스 로직
 */

import { eq, and, isNull, asc } from "drizzle-orm";
import { db } from "../../database/index.js";
import * as schema from "../../database/schema.js";
import { createLogger } from "../../../shared/logger/index.js";
import {
  ErrorCode,
  DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
  PACKAGE_EXPORT_DEBOUNCE_MS,
  LUIE_PACKAGE_META_FILENAME,
} from "../../../shared/constants/index.js";
import type {
  ProjectCreateInput,
  ProjectDeleteInput,
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

const logger = createLogger("ProjectService");

const DEBOUNCED_PACKAGE_EXPORT_REASONS = new Set<string>([
  "chapter:create",
  "chapter:update",
  "world-document:graph",
  "snapshot:create",
]);
const isPackageExportDisabledForRuntime =
  process.env.LUIE_DISABLE_PACKAGE_EXPORT === "1" ||
  process.env.LUIE_E2E_STRESS_MODE === "1";

type PackageExportAttemptResult = {
  exported: boolean;
  skipped?: boolean;
  error?: unknown;
};

const loadProjectExportEngine = async () =>
  (await import("./project/projectExportEngine.js"))
    .exportProjectPackageWithOptions;

const loadProjectImportOpen = async () =>
  (await import("./project/projectImportOpen.js")).openLuieProjectPackage;

const loadProjectLuieSchemas = async () =>
  import("./project/projectLuieSchemas.js");

const loadAppearanceCacheService = async () =>
  (await import("../world/appearanceCacheService.js")).appearanceCacheService;

const loadChapterSearchCacheService = async () =>
  (await import("../features/chapterSearchCacheService.js"))
    .chapterSearchCacheService;

const loadLuieContainer = async () => import("../io/luieContainer.js");

export class ProjectService {
  private exportQueue = new ProjectExportQueue(
    PACKAGE_EXPORT_DEBOUNCE_MS,
    async (projectId: string) => await this.exportProjectPackage(projectId),
    logger,
  );
  private hasLoggedRuntimeExportSkip = false;

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

      const store = db.getClient();
      const now = new Date().toISOString();
      const projectRows = await store.insert(schema.project).values({
        id: crypto.randomUUID(),
        title: input.title,
        description: input.description ?? null,
        createdAt: now,
        updatedAt: now,
      }).returning();

      const created = projectRows[0];

      await store.insert(schema.projectSettings).values({
        id: created.id,
        projectId: created.id,
        autoSave: true,
        autoSaveInterval: DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
      });

      const projectId = String(created.id);
      if (projectPath !== undefined) {
        await setProjectAttachmentPath(projectId, projectPath);
      }
      logger.info("Project created successfully", { projectId });
      this.schedulePackageExport(projectId, "project:create");
      return {
        ...created,
        projectPath: projectPath ?? null,
      };
    } catch (error) {
      logger.error("Failed to create project", {
        input,
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
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
      const openLuieProjectPackage = await loadProjectImportOpen();
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
    return project;
  }

  private async readLuieMetaForAttachment(packagePath: string) {
    const [{ readLuieContainerEntry }, { LuieMetaSchema }] = await Promise.all([
      loadLuieContainer(),
      loadProjectLuieSchemas(),
    ]);
    let raw: string | null;
    try {
      raw = await readLuieContainerEntry(
        packagePath,
        LUIE_PACKAGE_META_FILENAME,
        logger,
      );
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
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
      const normalizedPath = normalizeLuiePackagePath(
        packagePath,
        "packagePath",
      );
      const [existingRows, conflict, meta] = await Promise.all([
        db.getClient()
          .select({ id: schema.project.id })
          .from(schema.project)
          .where(eq(schema.project.id, projectId))
          .limit(1),
        findProjectPathConflict(normalizedPath, projectId),
        this.readLuieMetaForAttachment(normalizedPath),
      ]);

      const existing = existingRows.length > 0 ? existingRows[0] : null;

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
      const [existingRows, conflict, currentAttachmentPath] = await Promise.all([
        db.getClient()
          .select({ id: schema.project.id })
          .from(schema.project)
          .where(eq(schema.project.id, projectId))
          .limit(1),
        findProjectPathConflict(normalizedPath, projectId),
        getProjectAttachmentPath(projectId),
      ]);

      const existing = existingRows.length > 0 ? existingRows[0] : null;

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
        containerKind: "sqlite-v2",
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
      const store = db.getClient();
      const [projectRows, settingsRows, chaptersRows, charactersRows, termsRows] = await Promise.all([
        store.select().from(schema.project).where(eq(schema.project.id, id)).limit(1),
        store.select().from(schema.projectSettings).where(eq(schema.projectSettings.projectId, id)).limit(1),
        store.select().from(schema.chapter).where(and(eq(schema.chapter.projectId, id), isNull(schema.chapter.deletedAt))).orderBy(asc(schema.chapter.order)),
        store.select().from(schema.character).where(eq(schema.character.projectId, id)),
        store.select().from(schema.term).where(eq(schema.term.projectId, id)),
      ]);

      if (projectRows.length === 0) {
        throw new ServiceError(
          ErrorCode.PROJECT_NOT_FOUND,
          "Project not found",
          { id },
        );
      }

      const project = {
        ...projectRows[0],
        settings: settingsRows[0] ?? null,
        chapters: chaptersRows,
        characters: charactersRows,
        terms: termsRows,
      };

      const projectWithAttachment = {
        ...project,
        projectPath: await getProjectAttachmentPath(id),
        lastOpenedAt: await getProjectLastOpenedAt(id),
      };
      const [enriched] = await withProjectPathStatus([projectWithAttachment]);
      return enriched ?? projectWithAttachment;
    } catch (error) {
      logger.error("Failed to get project", error);
      throw error;
    }
  }

  async getAllProjects() {
    try {
      const projects = await db.getClient()
        .select({
          id: schema.project.id,
          title: schema.project.title,
          description: schema.project.description,
          createdAt: schema.project.createdAt,
          updatedAt: schema.project.updatedAt,
        })
        .from(schema.project);

      const normalizedProjects = projects.map(
        (project) => ({
          ...project,
          id: String(project.id),
          description:
            typeof project.description === "string"
              ? project.description
              : null,
          createdAt: new Date(project.createdAt),
          updatedAt: new Date(project.updatedAt),
        }),
      );

      const projectsWithAttachments =
        await hydrateProjectsWithAttachmentPaths(normalizedProjects);
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

      const [currentRows, currentProjectPath] = await Promise.all([
        db.getClient()
          .select({ title: schema.project.title })
          .from(schema.project)
          .where(eq(schema.project.id, input.id))
          .limit(1),
        getProjectAttachmentPath(input.id),
      ]);

      const current = currentRows.length > 0 ? currentRows[0] : null;

      const now = new Date().toISOString();
      const projectRows = await db.getClient()
        .update(schema.project)
        .set({
          title: input.title,
          description: input.description,
          updatedAt: now,
        })
        .where(eq(schema.project.id, input.id))
        .returning();

      const project = projectRows[0];

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

  private async purgeDerivedProjectRows(projectId: string): Promise<void> {
    // Legacy databases may not have FK cascades on these derived tables.
    // Explicit deletes keep behavior stable across schema generations.
    const client = db.getClient();
    await client.delete(schema.memoryEmbedding).where(eq(schema.memoryEmbedding.projectId, projectId));
    await client.delete(schema.memoryChunk).where(eq(schema.memoryChunk.projectId, projectId));
    await client.delete(schema.memoryBuildJob).where(eq(schema.memoryBuildJob.projectId, projectId));
    await client.delete(schema.searchDirtyQueue).where(eq(schema.searchDirtyQueue.projectId, projectId));
  }

  async deleteProject(input: string | ProjectDeleteInput) {
    const request = normalizeProjectDeleteInput(input);
    let queuedProjectDelete = false;

    try {
      const [existingRows, projectPath] = await Promise.all([
        db.getClient()
          .select({ id: schema.project.id })
          .from(schema.project)
          .where(eq(schema.project.id, request.id))
          .limit(1),
        getProjectAttachmentPath(request.id),
      ]);

      const existing = existingRows.length > 0 ? existingRows[0] : null;

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

      await this.purgeDerivedProjectRows(request.id);

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
      try {
        const [appearanceCacheService, chapterSearchCacheService] =
          await Promise.all([
            loadAppearanceCacheService(),
            loadChapterSearchCacheService(),
          ]);
        await Promise.all([
          appearanceCacheService.clearProject(request.id),
          chapterSearchCacheService.clearProject(request.id),
        ]);
      } catch (cacheError) {
        logger.warn("Failed to clear project cache during delete", {
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

      await this.purgeDerivedProjectRows(id);
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
      try {
        const [appearanceCacheService, chapterSearchCacheService] =
          await Promise.all([
            loadAppearanceCacheService(),
            loadChapterSearchCacheService(),
          ]);
        await Promise.all([
          appearanceCacheService.clearProject(id),
          chapterSearchCacheService.clearProject(id),
        ]);
      } catch (cacheError) {
        logger.warn("Failed to clear project cache during remove", {
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

  async touchProject(projectId: string): Promise<void> {
    await db.getClient()
      .update(schema.project)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(schema.project.id, projectId));
  }

  schedulePackageExport(projectId: string, reason?: string) {
    this.exportQueue.schedule(projectId, reason);
  }

  async exportProjectPackageNow(
    projectId: string,
    reason?: string,
  ): Promise<boolean> {
    return await this.exportQueue.runNow(projectId, reason);
  }

  async attemptImmediatePackageExport(
    projectId: string,
    reason: string,
  ): Promise<PackageExportAttemptResult> {
    try {
      const projectPath = await getProjectAttachmentPath(projectId);
      if (!projectPath || !projectPath.toLowerCase().endsWith(".luie")) {
        logger.info(
          "Skipped immediate project package export (no canonical .luie attachment)",
          {
            projectId,
            reason,
            projectPath,
          },
        );
        return { exported: false, skipped: true };
      }

      const exported = await this.exportProjectPackageNow(projectId, reason);
      if (!exported) {
        const error = new ServiceError(
          ErrorCode.FS_WRITE_FAILED,
          "Failed to export canonical .luie",
          {
            projectId,
            reason,
            projectPath,
          },
        );
        this.schedulePackageExport(projectId, `${reason}:retry`);
        logger.warn("Immediate project package export returned no output; queued retry", {
          projectId,
          reason,
          projectPath,
        });
        return {
          exported: false,
          error,
        };
      }
      return { exported: true };
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

  private shouldDebouncePackageExport(reason: string): boolean {
    return DEBOUNCED_PACKAGE_EXPORT_REASONS.has(reason);
  }

  async persistPackageAfterMutation(
    projectId: string,
    reason: string,
  ): Promise<void> {
    if (isPackageExportDisabledForRuntime) {
      if (!this.hasLoggedRuntimeExportSkip) {
        logger.info("Package export skipped by runtime flag", {
          projectId,
          reason,
        });
        this.hasLoggedRuntimeExportSkip = true;
      }
      return;
    }
    if (this.shouldDebouncePackageExport(reason)) {
      this.schedulePackageExport(projectId, `${reason}:debounced`);
      return;
    }

    const result = await this.attemptImmediatePackageExport(projectId, reason);
    if (result.skipped) {
      return;
    }
    if (result.exported && !result.error) {
      return;
    }

    throw new ServiceError(
      ErrorCode.FS_WRITE_FAILED,
      "Failed to persist canonical .luie after mutation",
      {
        projectId,
        reason,
      },
      result.error,
    );
  }

  async ensureImmediatePackageExport(
    projectId: string,
    reason: string,
  ): Promise<void> {
    await this.persistPackageAfterMutation(projectId, reason);
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
    const exportProjectPackageWithOptionsImpl = await loadProjectExportEngine();
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
