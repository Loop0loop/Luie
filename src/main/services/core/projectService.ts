/**
 * Project service - 프로젝트 관리 비즈니스 로직
 */

import { eq, and, isNull, asc } from "drizzle-orm";
import { db } from "../../infra/database/index.js";
import * as schema from "../../infra/database/index.js";
import { createLogger } from "../../../shared/logger/index.js";
import {
  ErrorCode,
  PACKAGE_EXPORT_DEBOUNCE_MS,
} from "../../../shared/constants/index.js";
import type {
  ProjectCreateInput,
  ProjectDeleteInput,
  ProjectUpdateInput,
} from "../../../shared/types/index.js";
import { ServiceError } from "../../utils/error/index.js";
import { ProjectExportQueue } from "./project/projectExportQueue.js";
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
import { collectDuplicateProjectPathGroups } from "./project/projectPathReconciliation.js";
import {
  attachProjectPackageFile,
  materializeProjectPackageFile,
} from "./project/projectPackageAttachment.js";
import {
  deleteProjectRecord,
  removeProjectListRecord,
} from "./project/projectRemoval.js";
import {
  createProjectRecord,
  updateProjectRecord,
} from "./project/projectMutation.js";

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
    return await createProjectRecord(input, {
      schedulePackageExport: (projectId, reason) =>
        this.schedulePackageExport(projectId, reason),
      logger,
    });
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

  async attachProjectPackage(projectId: string, packagePath: string) {
    return await attachProjectPackageFile(projectId, packagePath, {
      exportProjectPackageWithOptions: (targetProjectId, options) =>
        this.exportProjectPackageWithOptions(targetProjectId, options),
      getProjectWithAttachmentStatus: (targetProjectId) =>
        this.getProjectWithAttachmentStatus(targetProjectId),
      logger,
    });
  }

  async materializeProjectPackage(projectId: string, targetPath: string) {
    return await materializeProjectPackageFile(projectId, targetPath, {
      exportProjectPackageWithOptions: (targetProjectId, options) =>
        this.exportProjectPackageWithOptions(targetProjectId, options),
      getProjectWithAttachmentStatus: (targetProjectId) =>
        this.getProjectWithAttachmentStatus(targetProjectId),
      logger,
    });
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
    return await updateProjectRecord(input, {
      schedulePackageExport: (projectId, reason) =>
        this.schedulePackageExport(projectId, reason),
      logger,
    });
  }

  async deleteProject(input: string | ProjectDeleteInput) {
    return await deleteProjectRecord(input, logger);
  }

  async removeProjectFromList(id: string) {
    return await removeProjectListRecord(id, logger);
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
