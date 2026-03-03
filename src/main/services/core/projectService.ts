/**
 * Project service - 프로젝트 관리 비즈니스 로직
 */

import { db } from "../../database/index.js";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createLogger } from "../../../shared/logger/index.js";
import {
  ErrorCode,
  DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
  LUIE_PACKAGE_EXTENSION,
  LUIE_SNAPSHOTS_DIR,
  PACKAGE_EXPORT_DEBOUNCE_MS,
  SNAPSHOT_FILE_KEEP_COUNT,
  LUIE_PACKAGE_META_FILENAME,
  LUIE_WORLD_DIR,
  LUIE_WORLD_CHARACTERS_FILE,
  LUIE_WORLD_TERMS_FILE,
  LUIE_WORLD_SYNOPSIS_FILE,
  LUIE_WORLD_PLOT_FILE,
  LUIE_WORLD_DRAWING_FILE,
  LUIE_WORLD_MINDMAP_FILE,
  LUIE_WORLD_SCRAP_MEMOS_FILE,
  LUIE_WORLD_GRAPH_FILE,
} from "../../../shared/constants/index.js";
import type {
  ProjectDeleteInput,
  ProjectCreateInput,
  ProjectUpdateInput,
  ProjectExportRecord,
} from "../../../shared/types/index.js";
import { writeLuiePackage } from "../io/luiePackageWriter.js";
import { ServiceError } from "../../utils/serviceError.js";
import { ensureLuieExtension, readLuieEntry } from "../../utils/luiePackage.js";
import { ensureSafeAbsolutePath } from "../../utils/pathValidation.js";
import { settingsManager } from "../../manager/settingsManager.js";
import { ProjectExportQueue } from "./project/projectExportQueue.js";
import {
  findProjectPathConflict,
  normalizeLuiePackagePath,
  normalizeProjectPath,
  renameSnapshotDirectoryForProjectTitleChange,
} from "./project/projectPathPolicy.js";
import {
  buildExportChapterData,
  buildExportCharacterData,
  buildExportSnapshotData,
  buildExportTermData,
  buildProjectPackageMeta,
  buildWorldDrawing,
  buildWorldGraph,
  buildWorldMindmap,
  buildWorldPlot,
  buildWorldScrapMemos,
  buildWorldSynopsis,
} from "./project/projectExportPayload.js";
import {
  LuieCharactersSchema,
  LuieMetaSchema,
  LuieSnapshotSchema,
  LuieSnapshotsSchema,
  LuieTermsSchema,
  LuieWorldDrawingSchema,
  LuieWorldGraphSchema,
  LuieWorldMindmapSchema,
  LuieWorldPlotSchema,
  LuieWorldScrapMemosSchema,
  LuieWorldSynopsisSchema,
} from "./project/projectLuieSchemas.js";
import {
  buildChapterCreateRows,
  buildCharacterCreateRows,
  buildSnapshotCreateRows,
  buildTermCreateRows,
} from "./project/projectImportCodec.js";
import { buildGraphCreateRows } from "./project/projectImportGraph.js";
import { applyProjectImportTransaction } from "./project/projectImportTransaction.js";

const logger = createLogger("ProjectService");

const parseLuieDocumentOrThrow = <T>(
  raw: string | null,
  schema: z.ZodType<T>,
  options: {
    packagePath: string;
    entryPath: string;
    label: string;
  },
): T | null => {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return null;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (error) {
    throw new ServiceError(
      ErrorCode.VALIDATION_FAILED,
      `Invalid ${options.label} JSON in .luie package`,
      {
        packagePath: options.packagePath,
        entryPath: options.entryPath,
      },
      error,
    );
  }

  const parsed = schema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new ServiceError(
      ErrorCode.VALIDATION_FAILED,
      `Invalid ${options.label} format in .luie package`,
      {
        packagePath: options.packagePath,
        entryPath: options.entryPath,
        issues: parsed.error.issues,
      },
    );
  }

  return parsed.data;
};

const parseLuieDocumentForExport = <T>(
  raw: string | null,
  schema: z.ZodType<T>,
  options: {
    packagePath: string;
    entryPath: string;
    label: string;
  },
): ReturnType<z.ZodType<T>["safeParse"]> => {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return schema.safeParse(null);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (error) {
    logger.warn("Invalid .luie world JSON; using default during export", {
      packagePath: options.packagePath,
      entryPath: options.entryPath,
      label: options.label,
      error,
    });
    return schema.safeParse(null);
  }

  const parsed = schema.safeParse(parsedJson);
  if (!parsed.success) {
    logger.warn("Invalid .luie world format; using default during export", {
      packagePath: options.packagePath,
      entryPath: options.entryPath,
      label: options.label,
      issues: parsed.error.issues,
    });
  }
  return parsed;
};

type LuieMeta = z.infer<typeof LuieMetaSchema>;
type ExistingProjectLookup = { id: string; updatedAt: Date } | null;
type LuieMetaReadResult = {
  meta: LuieMeta | null;
  luieCorrupted: boolean;
  recoveryReason?: "missing" | "corrupt";
};
type LuieImportCollections = {
  characters: Array<Record<string, unknown>>;
  terms: Array<Record<string, unknown>>;
  snapshots: Array<z.infer<typeof LuieSnapshotSchema>>;
  worldSynopsis?: string;
  graph?: z.infer<typeof LuieWorldGraphSchema>;
};

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

    const groups = new Map<string, Array<{ id: string; projectPath: string; updatedAt: Date }>>();
    for (const project of projects) {
      if (typeof project.projectPath !== "string" || project.projectPath.length === 0) {
        continue;
      }
      try {
        const safePath = ensureSafeAbsolutePath(project.projectPath, "projectPath");
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

    let duplicateGroups = 0;
    let clearedRecords = 0;

    for (const entries of groups.values()) {
      if (entries.length <= 1) continue;
      duplicateGroups += 1;
      const sorted = [...entries].sort(
        (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
      );
      const keep = sorted[0];
      const stale = sorted.slice(1);

      for (const item of stale) {
        await db.getClient().project.update({
          where: { id: item.id },
          data: { projectPath: null },
        });
        clearedRecords += 1;
        logger.warn("Cleared duplicate projectPath from stale record", {
          keepProjectId: keep.id,
          staleProjectId: item.id,
          projectPath: item.projectPath,
        });
      }
    }

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

  private async readMetaOrMarkCorrupt(
    resolvedPath: string,
  ): Promise<LuieMetaReadResult> {
    try {
      await fs.access(resolvedPath);
    } catch {
      return {
        meta: null,
        luieCorrupted: true,
        recoveryReason: "missing",
      };
    }

    try {
      const metaRaw = await readLuieEntry(resolvedPath, LUIE_PACKAGE_META_FILENAME, logger);
      if (!metaRaw) {
        throw new Error("MISSING_META");
      }
      const parsedMeta = LuieMetaSchema.safeParse(JSON.parse(metaRaw));
      if (!parsedMeta.success) {
        throw new Error("INVALID_META");
      }
      return { meta: parsedMeta.data, luieCorrupted: false };
    } catch (error) {
      logger.warn("Failed to read .luie meta; treating as corrupted", {
        packagePath: resolvedPath,
        error,
      });
      return { meta: null, luieCorrupted: true, recoveryReason: "corrupt" };
    }
  }

  private async findProjectByPath(resolvedPath: string): Promise<ExistingProjectLookup> {
    return (await db.getClient().project.findFirst({
      where: { projectPath: resolvedPath },
      select: { id: true, updatedAt: true },
    })) as ExistingProjectLookup;
  }

  private resolveImportIdentity(
    meta: LuieMeta,
    existingByPath: ExistingProjectLookup,
  ): { resolvedProjectId: string; legacyProjectId: string | null } {
    const metaProjectId = typeof meta.projectId === "string" ? meta.projectId : undefined;
    const resolvedProjectId = metaProjectId ?? existingByPath?.id ?? randomUUID();
    const legacyProjectId =
      existingByPath && existingByPath.id !== resolvedProjectId
        ? existingByPath.id
        : null;
    return { resolvedProjectId, legacyProjectId };
  }

  private buildRecoveryTimestamp(date = new Date()): string {
    const pad = (value: number) => String(value).padStart(2, "0");
    return (
      `${date.getFullYear()}` +
      `${pad(date.getMonth() + 1)}` +
      `${pad(date.getDate())}` +
      `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
    );
  }

  private async resolveRecoveredPackagePath(resolvedPath: string): Promise<string> {
    const normalized = ensureLuieExtension(resolvedPath);
    const ext = LUIE_PACKAGE_EXTENSION;
    const lower = normalized.toLowerCase();
    const base = lower.endsWith(ext)
      ? normalized.slice(0, normalized.length - ext.length)
      : normalized;
    const timestamp = this.buildRecoveryTimestamp();
    let candidate = `${base}.recovered-${timestamp}${ext}`;
    let suffix = 1;

    for (;;) {
      try {
        await fs.access(candidate);
        candidate = `${base}.recovered-${timestamp}-${suffix}${ext}`;
        suffix += 1;
      } catch {
        return candidate;
      }
    }
  }

  private async readLuieImportCollections(
    resolvedPath: string,
  ): Promise<LuieImportCollections> {
    const charactersEntryPath = `${LUIE_WORLD_DIR}/${LUIE_WORLD_CHARACTERS_FILE}`;
    const termsEntryPath = `${LUIE_WORLD_DIR}/${LUIE_WORLD_TERMS_FILE}`;
    const snapshotsEntryPath = `${LUIE_SNAPSHOTS_DIR}/index.json`;
    const synopsisEntryPath = `${LUIE_WORLD_DIR}/${LUIE_WORLD_SYNOPSIS_FILE}`;
    const graphEntryPath = `${LUIE_WORLD_DIR}/${LUIE_WORLD_GRAPH_FILE}`;

    const [charactersRaw, termsRaw, snapshotsRaw, worldSynopsisRaw, worldGraphRaw] = await Promise.all([
      readLuieEntry(resolvedPath, charactersEntryPath, logger),
      readLuieEntry(resolvedPath, termsEntryPath, logger),
      readLuieEntry(resolvedPath, snapshotsEntryPath, logger),
      readLuieEntry(resolvedPath, synopsisEntryPath, logger),
      readLuieEntry(resolvedPath, graphEntryPath, logger),
    ]);

    const parsedCharacters = parseLuieDocumentOrThrow(charactersRaw, LuieCharactersSchema, {
      packagePath: resolvedPath,
      entryPath: charactersEntryPath,
      label: "world characters",
    });
    const parsedTerms = parseLuieDocumentOrThrow(termsRaw, LuieTermsSchema, {
      packagePath: resolvedPath,
      entryPath: termsEntryPath,
      label: "world terms",
    });
    const parsedSnapshots = parseLuieDocumentOrThrow(snapshotsRaw, LuieSnapshotsSchema, {
      packagePath: resolvedPath,
      entryPath: snapshotsEntryPath,
      label: "snapshot index",
    });
    const parsedWorldSynopsis = parseLuieDocumentOrThrow(
      worldSynopsisRaw,
      LuieWorldSynopsisSchema,
      {
        packagePath: resolvedPath,
        entryPath: synopsisEntryPath,
        label: "world synopsis",
      },
    );
    const parsedGraph = parseLuieDocumentOrThrow(worldGraphRaw, LuieWorldGraphSchema, {
      packagePath: resolvedPath,
      entryPath: graphEntryPath,
      label: "world graph",
    });

    return {
      characters: parsedCharacters?.characters ?? [],
      terms: parsedTerms?.terms ?? [],
      snapshots: parsedSnapshots?.snapshots ?? [],
      worldSynopsis:
        parsedWorldSynopsis &&
        typeof parsedWorldSynopsis.synopsis === "string"
          ? parsedWorldSynopsis.synopsis
          : undefined,
      graph: parsedGraph
        ? {
            nodes: parsedGraph.nodes ?? [],
            edges: parsedGraph.edges ?? [],
            updatedAt: parsedGraph.updatedAt,
          }
        : undefined,
    };
  }

  async openLuieProject(packagePath: string) {
    try {
      const resolvedPath = normalizeLuiePackagePath(packagePath, "packagePath");
      const { meta, luieCorrupted, recoveryReason } = await this.readMetaOrMarkCorrupt(
        resolvedPath,
      );
      const existingByPath = await this.findProjectByPath(resolvedPath);

      if (luieCorrupted) {
        if (!existingByPath) {
          throw new ServiceError(
            ErrorCode.FS_READ_FAILED,
            "Failed to read .luie meta",
            { packagePath: resolvedPath },
          );
        }
        const recoveryPath = await this.resolveRecoveredPackagePath(resolvedPath);
        const exported = await this.exportProjectPackageWithOptions(existingByPath.id, {
          targetPath: recoveryPath,
          worldSourcePath: null,
        });
        if (!exported) {
          throw new ServiceError(
            ErrorCode.FS_WRITE_FAILED,
            "Failed to write recovered .luie package",
            { packagePath: resolvedPath, recoveryPath },
          );
        }
        await db.getClient().project.update({
          where: { id: existingByPath.id },
          data: { projectPath: recoveryPath },
        });
        const project = await this.getProject(existingByPath.id);
        return {
          project,
          recovery: true,
          recoveryPath,
          recoveryReason: recoveryReason ?? "corrupt",
        };
      }

      if (!meta) {
        throw new ServiceError(
          ErrorCode.VALIDATION_FAILED,
          "Invalid .luie meta format",
          { packagePath: resolvedPath },
        );
      }

      const { resolvedProjectId, legacyProjectId } = this.resolveImportIdentity(meta, existingByPath);
      const existing = (await db.getClient().project.findUnique({
        where: { id: resolvedProjectId },
        select: { id: true, updatedAt: true },
      })) as ExistingProjectLookup;

      const chaptersMeta = meta.chapters ?? [];
      const collections = await this.readLuieImportCollections(resolvedPath);
      const chaptersForCreate = await buildChapterCreateRows({
        packagePath: resolvedPath,
        resolvedProjectId,
        chaptersMeta,
        readChapterEntry: async (entryPath: string) =>
          await readLuieEntry(resolvedPath, entryPath, logger),
      });
      const charactersForCreate = buildCharacterCreateRows(
        resolvedProjectId,
        collections.characters,
      );
      const termsForCreate = buildTermCreateRows(resolvedProjectId, collections.terms);
      const graphRows = buildGraphCreateRows({
        projectId: resolvedProjectId,
        graph: collections.graph,
        baseCharacters: charactersForCreate,
        baseTerms: termsForCreate,
      });
      const snapshotsForCreate = buildSnapshotCreateRows({
        resolvedProjectId,
        snapshots: collections.snapshots,
        validChapterIds: new Set(chaptersForCreate.map((chapter) => chapter.id)),
        logger,
      });

      const created = await applyProjectImportTransaction({
        resolvedProjectId,
        legacyProjectId,
        existing,
        meta,
        worldSynopsis: collections.worldSynopsis,
        resolvedPath,
        chaptersForCreate,
        charactersForCreate: graphRows.charactersForCreate,
        termsForCreate: graphRows.termsForCreate,
        factionsForCreate: graphRows.factionsForCreate,
        eventsForCreate: graphRows.eventsForCreate,
        worldEntitiesForCreate: graphRows.worldEntitiesForCreate,
        relationsForCreate: graphRows.relationsForCreate,
        snapshotsForCreate,
      });

      logger.info(".luie package hydrated", {
        projectId: created.id,
        chapterCount: chaptersForCreate.length,
        characterCount: graphRows.charactersForCreate.length,
        termCount: graphRows.termsForCreate.length,
        factionCount: graphRows.factionsForCreate.length,
        eventCount: graphRows.eventsForCreate.length,
        worldEntityCount: graphRows.worldEntitiesForCreate.length,
        relationCount: graphRows.relationsForCreate.length,
        snapshotCount: snapshotsForCreate.length,
      });

      return { project: created, conflict: "luie-newer" };
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
            typeof project.projectPath === "string" ? project.projectPath : null;
          const isLuiePath = Boolean(
            projectPath && projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION),
          );
          if (!isLuiePath || !projectPath) {
            return {
              ...project,
              pathMissing: false,
            };
          }

          try {
            const safeProjectPath = ensureSafeAbsolutePath(projectPath, "projectPath");
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
          : normalizeProjectPath(input.projectPath) ?? null;
      if (normalizedProjectPath) {
        const conflict = await findProjectPathConflict(normalizedProjectPath, input.id);
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
      const projectPath = typeof project.projectPath === "string" ? project.projectPath : null;
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
          typeof existing.projectPath === "string" ? existing.projectPath : null;
        if (projectPath && projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
          const safeProjectPath = ensureSafeAbsolutePath(projectPath, "projectPath");
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

      logger.info("Project deleted successfully", { projectId: request.id, deleteFile: request.deleteFile });
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

  private async getProjectForExport(projectId: string): Promise<ProjectExportRecord | null> {
    return (await db.getClient().project.findUnique({
      where: { id: projectId },
      include: {
        chapters: { where: { deletedAt: null }, orderBy: { order: "asc" } },
        characters: true,
        terms: true,
        factions: true,
        events: true,
        worldEntities: true,
        entityRelations: true,
        snapshots: { orderBy: { createdAt: "desc" } },
      },
    })) as ProjectExportRecord | null;
  }

  private resolveExportPath(
    projectId: string,
    projectPath?: string | null,
  ): string | null {
    if (!projectPath) {
      logger.info("Skipping package export (missing projectPath)", { projectId });
      return null;
    }
    if (!projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
      logger.info("Skipping package export (not .luie)", {
        projectId,
        projectPath,
      });
      return null;
    }
    try {
      return ensureSafeAbsolutePath(projectPath, "projectPath");
    } catch (error) {
      logger.warn("Skipping package export (invalid projectPath)", {
        projectId,
        projectPath,
        error,
      });
      return null;
    }
  }

  private async readWorldPayloadFromPackage(projectPath?: string | null) {
    if (!projectPath || !projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
      return {
        synopsis: LuieWorldSynopsisSchema.safeParse(null),
        plot: LuieWorldPlotSchema.safeParse(null),
        drawing: LuieWorldDrawingSchema.safeParse(null),
        mindmap: LuieWorldMindmapSchema.safeParse(null),
        memos: LuieWorldScrapMemosSchema.safeParse(null),
      };
    }

    const readWorldDocument = async <T>(
      fileName: string,
      schema: z.ZodType<T>,
      label: string,
    ): Promise<ReturnType<z.ZodType<T>["safeParse"]>> => {
      const entryPath = `${LUIE_WORLD_DIR}/${fileName}`;
      try {
        const raw = await readLuieEntry(projectPath, entryPath, logger);
        return parseLuieDocumentForExport(raw, schema, {
          packagePath: projectPath,
          entryPath,
          label,
        });
      } catch (error) {
        logger.warn("Failed to read .luie world document; using default during export", {
          projectPath,
          entryPath,
          label,
          error,
        });
        return schema.safeParse(null);
      }
    };

    const [synopsis, plot, drawing, mindmap, memos] = await Promise.all([
      readWorldDocument(
        LUIE_WORLD_SYNOPSIS_FILE,
        LuieWorldSynopsisSchema,
        "synopsis",
      ),
      readWorldDocument(LUIE_WORLD_PLOT_FILE, LuieWorldPlotSchema, "plot"),
      readWorldDocument(LUIE_WORLD_DRAWING_FILE, LuieWorldDrawingSchema, "drawing"),
      readWorldDocument(LUIE_WORLD_MINDMAP_FILE, LuieWorldMindmapSchema, "mindmap"),
      readWorldDocument(
        LUIE_WORLD_SCRAP_MEMOS_FILE,
        LuieWorldScrapMemosSchema,
        "scrap-memos",
      ),
    ]);

    return {
      synopsis,
      plot,
      drawing,
      mindmap,
      memos,
    };
  }

  private async exportProjectPackageWithOptions(
    projectId: string,
    options?: {
      targetPath?: string;
      worldSourcePath?: string | null;
    },
  ): Promise<boolean> {
    const project = await this.getProjectForExport(projectId);
    if (!project) return false;

    const exportPath = options?.targetPath
      ? normalizeLuiePackagePath(options.targetPath, "targetPath")
      : this.resolveExportPath(projectId, project.projectPath);
    if (!exportPath) return false;

    const worldSourcePath =
      options?.worldSourcePath === undefined
        ? exportPath
        : options.worldSourcePath;

    const { exportChapters, chapterMeta } = buildExportChapterData(project.chapters);
    const characters = buildExportCharacterData(project.characters);
    const terms = buildExportTermData(project.terms);
    const snapshotExportLimit =
      settingsManager.getAll().snapshotExportLimit ?? SNAPSHOT_FILE_KEEP_COUNT;
    const snapshots = buildExportSnapshotData(project.snapshots, snapshotExportLimit);
    const parsedWorld = await this.readWorldPayloadFromPackage(worldSourcePath);

    const synopsis = buildWorldSynopsis(project, parsedWorld.synopsis);
    const plot = buildWorldPlot(parsedWorld.plot);
    const drawing = buildWorldDrawing(parsedWorld.drawing);
    const mindmap = buildWorldMindmap(parsedWorld.mindmap);
    const memos = buildWorldScrapMemos(parsedWorld.memos);
    const graph = buildWorldGraph(project);
    const meta = buildProjectPackageMeta(project, chapterMeta);

    logger.info("Exporting .luie package", {
      projectId,
      projectPath: exportPath,
      chapterCount: exportChapters.length,
      characterCount: characters.length,
      termCount: terms.length,
      worldNodeCount: graph.nodes.length,
      relationCount: graph.edges.length,
      snapshotCount: snapshots.length,
    });

    await writeLuiePackage(
      exportPath,
      {
        meta,
        chapters: exportChapters,
        characters,
        terms,
        synopsis,
        plot,
        drawing,
        mindmap,
        memos,
        graph,
        snapshots,
      },
      logger,
    );
    return true;
  }

  async exportProjectPackage(projectId: string) {
    await this.exportProjectPackageWithOptions(projectId);
  }
}

export const projectService = new ProjectService();
