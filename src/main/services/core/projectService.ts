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
  LUIE_PACKAGE_FORMAT,
  LUIE_PACKAGE_CONTAINER_DIR,
  LUIE_PACKAGE_VERSION,
  PACKAGE_EXPORT_DEBOUNCE_MS,
  LUIE_MANUSCRIPT_DIR,
  MARKDOWN_EXTENSION,
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
} from "../../../shared/constants/index.js";
import { sanitizeName } from "../../../shared/utils/sanitize.js";
import type {
  ProjectCreateInput,
  ProjectUpdateInput,
  ProjectExportRecord,
  ChapterExportRecord,
  CharacterExportRecord,
  TermExportRecord,
  SnapshotExportRecord,
  WorldDrawingData,
  WorldMindmapData,
  WorldPlotData,
  WorldScrapMemosData,
  WorldSynopsisData,
} from "../../../shared/types/index.js";
import { writeLuiePackage } from "../../handler/system/ipcFsHandlers.js";
import { ServiceError } from "../../utils/serviceError.js";
import { ensureLuieExtension, readLuieEntry } from "../../utils/luiePackage.js";
import { settingsManager } from "../../manager/settingsManager.js";

const logger = createLogger("ProjectService");

const LuieMetaSchema = z
  .object({
    format: z.string().optional(),
    version: z.number().optional(),
    projectId: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional().nullable(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    chapters: z
      .array(
        z.object({
          id: z.string().optional(),
          title: z.string().optional(),
          order: z.number().optional(),
          file: z.string().optional(),
          content: z.string().optional(),
          updatedAt: z.string().optional(),
        }),
      )
      .optional(),
  })
  .passthrough();

const LuieCharactersSchema = z
  .object({
    characters: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

const LuieTermsSchema = z
  .object({
    terms: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

const LuieWorldSynopsisSchema = z
  .object({
    synopsis: z.string().optional(),
    status: z.enum(["draft", "working", "locked"]).optional(),
    genre: z.string().optional(),
    targetAudience: z.string().optional(),
    logline: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const LuieWorldPlotSchema = z
  .object({
    columns: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          cards: z.array(
            z.object({
              id: z.string(),
              content: z.string(),
            }),
          ),
        }),
      )
      .optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const LuieWorldDrawingSchema = z
  .object({
    paths: z.array(z.record(z.string(), z.unknown())).optional(),
    tool: z.enum(["pen", "text", "eraser", "icon"]).optional(),
    iconType: z.enum(["mountain", "castle", "village"]).optional(),
    color: z.string().optional(),
    lineWidth: z.number().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const LuieWorldMindmapSchema = z
  .object({
    nodes: z.array(z.record(z.string(), z.unknown())).optional(),
    edges: z.array(z.record(z.string(), z.unknown())).optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const LuieWorldScrapMemosSchema = z
  .object({
    memos: z.array(z.record(z.string(), z.unknown())).optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const LuieSnapshotSchema = z
  .object({
    id: z.string(),
    projectId: z.string().optional(),
    chapterId: z.string().optional().nullable(),
    content: z.string().optional(),
    description: z.string().optional().nullable(),
    createdAt: z.string().optional(),
  })
  .passthrough();

const LuieSnapshotsSchema = z
  .object({
    snapshots: z.array(LuieSnapshotSchema).optional(),
  })
  .passthrough();

const parseJsonSafely = (raw: string | null): unknown | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

export class ProjectService {
  private exportTimers = new Map<string, NodeJS.Timeout>();

  async createProject(input: ProjectCreateInput) {
    try {
      logger.info("Creating project", input);

      const project = await db.getClient().project.create({
        data: {
          title: input.title,
          description: input.description,
          projectPath: input.projectPath,
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
      const resolvedPath = ensureLuieExtension(packagePath);
      let metaRaw: string | null = null;
      let meta: z.infer<typeof LuieMetaSchema> | null = null;
      let luieCorrupted = false;

      try {
        metaRaw = await readLuieEntry(resolvedPath, LUIE_PACKAGE_META_FILENAME, logger);
        if (!metaRaw) {
          throw new Error("MISSING_META");
        }
        const parsedMeta = LuieMetaSchema.safeParse(JSON.parse(metaRaw));
        if (!parsedMeta.success) {
          throw new Error("INVALID_META");
        }
        meta = parsedMeta.data;
      } catch (error) {
        luieCorrupted = true;
        logger.warn("Failed to read .luie meta; treating as corrupted", {
          packagePath: resolvedPath,
          error,
        });
      }

      const existingByPath = (await db.getClient().project.findFirst({
        where: { projectPath: resolvedPath },
        select: { id: true, updatedAt: true },
      })) as { id: string; updatedAt: Date } | null;

      if (luieCorrupted) {
        if (!existingByPath) {
          throw new ServiceError(
            ErrorCode.FS_READ_FAILED,
            "Failed to read .luie meta",
            { packagePath: resolvedPath },
          );
        }

        await this.exportProjectPackage(existingByPath.id);
        const project = await this.getProject(existingByPath.id);
        return { project, recovery: true };
      }

      if (!meta) {
        throw new ServiceError(
          ErrorCode.VALIDATION_FAILED,
          "Invalid .luie meta format",
          { packagePath: resolvedPath },
        );
      }

      const metaProjectId = typeof meta.projectId === "string" ? meta.projectId : undefined;

      const resolvedProjectId = metaProjectId ?? existingByPath?.id ?? randomUUID();
      const legacyProjectId =
        existingByPath && existingByPath.id !== resolvedProjectId
          ? existingByPath.id
          : null;

      const existing = (await db.getClient().project.findUnique({
        where: { id: resolvedProjectId },
        select: { id: true, updatedAt: true },
      })) as { id: string; updatedAt: Date } | null;

      const metaUpdatedAt = meta?.updatedAt ? new Date(meta.updatedAt) : null;
      if (existing && metaUpdatedAt && existing.updatedAt > metaUpdatedAt) {
        logger.info("DB newer than .luie package; exporting", {
          projectId: resolvedProjectId,
          packagePath,
        });
        await this.exportProjectPackage(resolvedProjectId);
        const project = await this.getProject(resolvedProjectId);
        return { project, conflict: "db-newer" };
      }

      const chaptersMeta = meta?.chapters ?? [];

      const [charactersRaw, termsRaw, snapshotsRaw, worldSynopsisRaw] = await Promise.all([
        readLuieEntry(resolvedPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_CHARACTERS_FILE}`, logger),
        readLuieEntry(resolvedPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_TERMS_FILE}`, logger),
        readLuieEntry(resolvedPath, `${LUIE_SNAPSHOTS_DIR}/index.json`, logger),
        readLuieEntry(resolvedPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_SYNOPSIS_FILE}`, logger),
      ]);

      const parsedCharacters = LuieCharactersSchema.safeParse(parseJsonSafely(charactersRaw));
      const parsedTerms = LuieTermsSchema.safeParse(parseJsonSafely(termsRaw));
      const parsedSnapshots = LuieSnapshotsSchema.safeParse(parseJsonSafely(snapshotsRaw));
      const parsedWorldSynopsis = LuieWorldSynopsisSchema.safeParse(
        parseJsonSafely(worldSynopsisRaw),
      );

      const characters = parsedCharacters.success
        ? parsedCharacters.data.characters ?? []
        : [];
      const terms = parsedTerms.success ? parsedTerms.data.terms ?? [] : [];
      const snapshots = parsedSnapshots.success
        ? parsedSnapshots.data.snapshots ?? []
        : [];
      const worldSynopsis =
        parsedWorldSynopsis.success && typeof parsedWorldSynopsis.data.synopsis === "string"
          ? parsedWorldSynopsis.data.synopsis
          : undefined;

      const chaptersForCreate = [] as Array<{
        id: string;
        projectId: string;
        title: string;
        content: string;
        synopsis?: string | null;
        order: number;
        wordCount: number;
      }>;

      for (let index = 0; index < chaptersMeta.length; index += 1) {
        const chapter = chaptersMeta[index];
        const chapterId = chapter.id ?? randomUUID();
        const entryPath =
          chapter.file ?? `${LUIE_MANUSCRIPT_DIR}/${chapterId}${MARKDOWN_EXTENSION}`;

        const contentRaw =
          typeof chapter.content === "string"
            ? chapter.content
            : await readLuieEntry(resolvedPath, entryPath, logger);
        const content = contentRaw ?? "";

        chaptersForCreate.push({
          id: chapterId,
          projectId: resolvedProjectId,
          title: chapter.title ?? `Chapter ${index + 1}`,
          content,
          synopsis: null,
          order: typeof chapter.order === "number" ? chapter.order : index,
          wordCount: content.length,
        });
      }

      const charactersForCreate = characters.map((character, index) => {
        const name =
          typeof character.name === "string" && character.name.trim().length > 0
            ? character.name
            : `Character ${index + 1}`;
        const attributes =
          typeof character.attributes === "string"
            ? character.attributes
            : character.attributes
              ? JSON.stringify(character.attributes)
              : null;
        return {
          id: typeof character.id === "string" ? character.id : randomUUID(),
          projectId: resolvedProjectId,
          name,
          description:
            typeof character.description === "string" ? character.description : null,
          firstAppearance:
            typeof character.firstAppearance === "string" ? character.firstAppearance : null,
          attributes,
        };
      });

      const termsForCreate = terms.map((term, index) => {
        const termLabel =
          typeof term.term === "string" && term.term.trim().length > 0
            ? term.term
            : `Term ${index + 1}`;
        return {
          id: typeof term.id === "string" ? term.id : randomUUID(),
          projectId: resolvedProjectId,
          term: termLabel,
          definition: typeof term.definition === "string" ? term.definition : null,
          category: typeof term.category === "string" ? term.category : null,
          firstAppearance:
            typeof term.firstAppearance === "string" ? term.firstAppearance : null,
        };
      });

      const snapshotsForCreate = snapshots
        .filter((snapshot) => typeof snapshot.id === "string")
        .map((snapshot) => {
          const content = snapshot.content ?? "";
          return {
            id: snapshot.id,
            projectId: snapshot.projectId ?? resolvedProjectId,
            chapterId:
              typeof snapshot.chapterId === "string" ? snapshot.chapterId : null,
            content,
            contentLength: content.length,
            description:
              typeof snapshot.description === "string" ? snapshot.description : null,
            createdAt: snapshot.createdAt ? new Date(snapshot.createdAt) : new Date(),
          };
        });

      const created = (await db.getClient().$transaction(async (
        tx: ReturnType<(typeof db)["getClient"]>,
      ) => {
        if (legacyProjectId) {
          await tx.project.delete({ where: { id: legacyProjectId } });
        }

        if (existing) {
          await tx.project.delete({ where: { id: resolvedProjectId } });
        }

        const project = await tx.project.create({
          data: {
            id: resolvedProjectId,
            title: meta.title ?? "Recovered Project",
            description:
              (typeof meta.description === "string" ? meta.description : undefined) ??
              worldSynopsis ??
              undefined,
            projectPath: resolvedPath,
            createdAt: meta.createdAt ? new Date(meta.createdAt) : undefined,
            updatedAt: meta.updatedAt ? new Date(meta.updatedAt) : undefined,
            settings: {
              create: {
                autoSave: true,
                autoSaveInterval: DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
              },
            },
          },
          include: { settings: true },
        });

        if (chaptersForCreate.length > 0) {
          await tx.chapter.createMany({ data: chaptersForCreate });
        }

        if (charactersForCreate.length > 0) {
          await tx.character.createMany({ data: charactersForCreate });
        }

        if (termsForCreate.length > 0) {
          await tx.term.createMany({ data: termsForCreate });
        }

        if (snapshotsForCreate.length > 0) {
          await tx.snapshot.createMany({ data: snapshotsForCreate });
        }

        return project;
      })) as {
        id: string;
        title: string;
        description?: string | null;
        projectPath?: string | null;
        createdAt: Date;
        updatedAt: Date;
        settings?: unknown;
      };

      logger.info(".luie package hydrated", {
        projectId: created.id,
        chapterCount: chaptersForCreate.length,
        characterCount: charactersForCreate.length,
        termCount: termsForCreate.length,
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
        include: {
          settings: true,
          _count: {
            select: {
              chapters: true,
              characters: true,
              terms: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      return projects;
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
      const current = await db.getClient().project.findUnique({
        where: { id: input.id },
        select: { title: true, projectPath: true },
      });

      const project = await db.getClient().project.update({
        where: { id: input.id },
        data: {
          title: input.title,
          description: input.description,
          projectPath: input.projectPath,
        },
      });

      const prevTitle = typeof current?.title === "string" ? current.title : "";
      const nextTitle = typeof project.title === "string" ? project.title : "";
      const projectPath = typeof project.projectPath === "string" ? project.projectPath : null;

      if (
        projectPath &&
        projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION) &&
        prevTitle &&
        nextTitle &&
        prevTitle !== nextTitle
      ) {
        const sepIndex = Math.max(projectPath.lastIndexOf("/"), projectPath.lastIndexOf("\\"));
        const baseDir = sepIndex >= 0 ? projectPath.slice(0, sepIndex) : projectPath;
        const snapshotsBase = `${baseDir}${path.sep}.luie${path.sep}${LUIE_SNAPSHOTS_DIR}`;
        const prevName = sanitizeName(prevTitle, "");
        const nextName = sanitizeName(nextTitle, "");
        if (prevName && nextName && prevName !== nextName) {
          const prevDir = `${snapshotsBase}${path.sep}${prevName}`;
          const nextDir = `${snapshotsBase}${path.sep}${nextName}`;
          try {
            const stat = await fs.stat(prevDir);
            if (stat.isDirectory()) {
              await fs.mkdir(snapshotsBase, { recursive: true });
              await fs.rename(prevDir, nextDir);
            }
          } catch {
            // ignore if missing or rename fails
          }
        }
      }

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

  async deleteProject(id: string) {
    try {
      await db.getClient().project.delete({
        where: { id },
      });

      logger.info("Project deleted successfully", { projectId: id });
      return { success: true };
    } catch (error) {
      logger.error("Failed to delete project", error);
      throw new ServiceError(
        ErrorCode.PROJECT_DELETE_FAILED,
        "Failed to delete project",
        { id },
        error,
      );
    }
  }

  schedulePackageExport(projectId: string, reason?: string) {
    const existing = this.exportTimers.get(projectId);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(async () => {
      this.exportTimers.delete(projectId);
      try {
        await this.exportProjectPackage(projectId);
      } catch (error) {
        logger.error("Failed to export project package", { projectId, reason, error });
      }
    }, PACKAGE_EXPORT_DEBOUNCE_MS);

    this.exportTimers.set(projectId, timer);
  }

  async exportProjectPackage(projectId: string) {
    const project = (await db.getClient().project.findUnique({
      where: { id: projectId },
      include: {
        chapters: { where: { deletedAt: null }, orderBy: { order: "asc" } },
        characters: true,
        terms: true,
        snapshots: { orderBy: { createdAt: "desc" } },
      },
    })) as ProjectExportRecord | null;

    if (!project?.projectPath) {
      logger.info("Skipping package export (missing projectPath)", { projectId });
      return;
    }

    if (!project.projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
      logger.info("Skipping package export (not .luie)", {
        projectId,
        projectPath: project.projectPath,
      });
      return;
    }

    const chapters = project.chapters.map((chapter: ChapterExportRecord) => ({
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      updatedAt: chapter.updatedAt,
      content: chapter.content,
      file: `${LUIE_MANUSCRIPT_DIR}/${chapter.id}${MARKDOWN_EXTENSION}`,
    }));

    const chapterMeta = chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      file: chapter.file,
    }));

    const characters = project.characters.map((character: CharacterExportRecord) => {
      let attributes: unknown = undefined;
      if (character.attributes) {
        try {
          attributes = JSON.parse(character.attributes);
        } catch {
          attributes = character.attributes;
        }
      }
      return {
        id: character.id,
        name: character.name,
        description: character.description,
        firstAppearance: character.firstAppearance,
        attributes,
        createdAt: character.createdAt,
        updatedAt: character.updatedAt,
      };
    });

    const terms = project.terms.map((term: TermExportRecord) => ({
      id: term.id,
      term: term.term,
      definition: term.definition,
      category: term.category,
      firstAppearance: term.firstAppearance,
      createdAt: term.createdAt,
      updatedAt: term.updatedAt,
    }));

    const rawSnapshots = project.snapshots.map((snapshot: SnapshotExportRecord) => ({
      id: snapshot.id,
      projectId: snapshot.projectId,
      chapterId: snapshot.chapterId,
      content: snapshot.content,
      description: snapshot.description,
      createdAt: snapshot.createdAt?.toISOString?.() ?? String(snapshot.createdAt),
    }));

    const snapshotExportLimit = settingsManager.getAll().snapshotExportLimit ?? SNAPSHOT_FILE_KEEP_COUNT;
    const snapshots =
      snapshotExportLimit > 0
        ? rawSnapshots.slice(0, snapshotExportLimit)
        : rawSnapshots;

    const [existingSynopsisRaw, existingPlotRaw, existingDrawingRaw, existingMindmapRaw, existingMemosRaw] = await Promise.all([
      readLuieEntry(project.projectPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_SYNOPSIS_FILE}`, logger),
      readLuieEntry(project.projectPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_PLOT_FILE}`, logger),
      readLuieEntry(project.projectPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_DRAWING_FILE}`, logger),
      readLuieEntry(project.projectPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_MINDMAP_FILE}`, logger),
      readLuieEntry(project.projectPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_SCRAP_MEMOS_FILE}`, logger),
    ]);

    const parsedSynopsis = LuieWorldSynopsisSchema.safeParse(parseJsonSafely(existingSynopsisRaw));
    const parsedPlot = LuieWorldPlotSchema.safeParse(parseJsonSafely(existingPlotRaw));
    const parsedDrawing = LuieWorldDrawingSchema.safeParse(parseJsonSafely(existingDrawingRaw));
    const parsedMindmap = LuieWorldMindmapSchema.safeParse(parseJsonSafely(existingMindmapRaw));
    const parsedMemos = LuieWorldScrapMemosSchema.safeParse(parseJsonSafely(existingMemosRaw));

    const synopsis: WorldSynopsisData = {
      synopsis:
        project.description ??
        (parsedSynopsis?.success && typeof parsedSynopsis.data.synopsis === "string"
          ? parsedSynopsis.data.synopsis
          : ""),
      status:
        parsedSynopsis?.success && parsedSynopsis.data.status
          ? parsedSynopsis.data.status
          : "draft",
      genre:
        parsedSynopsis?.success && typeof parsedSynopsis.data.genre === "string"
          ? parsedSynopsis.data.genre
          : undefined,
      targetAudience:
        parsedSynopsis?.success && typeof parsedSynopsis.data.targetAudience === "string"
          ? parsedSynopsis.data.targetAudience
          : undefined,
      logline:
        parsedSynopsis?.success && typeof parsedSynopsis.data.logline === "string"
          ? parsedSynopsis.data.logline
          : undefined,
      updatedAt:
        parsedSynopsis?.success && typeof parsedSynopsis.data.updatedAt === "string"
          ? parsedSynopsis.data.updatedAt
          : undefined,
    };

    const plot: WorldPlotData =
      parsedPlot?.success && Array.isArray(parsedPlot.data.columns)
        ? {
            columns: parsedPlot.data.columns,
            updatedAt:
              typeof parsedPlot.data.updatedAt === "string"
                ? parsedPlot.data.updatedAt
                : undefined,
          }
        : { columns: [] };

    const drawing: WorldDrawingData =
      parsedDrawing?.success && Array.isArray(parsedDrawing.data.paths)
        ? ({
            paths: parsedDrawing.data.paths as unknown as WorldDrawingData["paths"],
            tool: parsedDrawing.data.tool,
            iconType: parsedDrawing.data.iconType,
            color:
              typeof parsedDrawing.data.color === "string"
                ? parsedDrawing.data.color
                : undefined,
            lineWidth:
              typeof parsedDrawing.data.lineWidth === "number"
                ? parsedDrawing.data.lineWidth
                : undefined,
            updatedAt:
              typeof parsedDrawing.data.updatedAt === "string"
                ? parsedDrawing.data.updatedAt
                : undefined,
          } satisfies WorldDrawingData)
        : { paths: [] };

    const mindmap: WorldMindmapData =
      parsedMindmap?.success
        ? {
            nodes: Array.isArray(parsedMindmap.data.nodes)
              ? (parsedMindmap.data.nodes as unknown as WorldMindmapData["nodes"])
              : [],
            edges: Array.isArray(parsedMindmap.data.edges)
              ? (parsedMindmap.data.edges as unknown as WorldMindmapData["edges"])
              : [],
            updatedAt:
              typeof parsedMindmap.data.updatedAt === "string"
                ? parsedMindmap.data.updatedAt
                : undefined,
          }
        : { nodes: [], edges: [] };

    const memos: WorldScrapMemosData =
      parsedMemos?.success
        ? {
            memos: Array.isArray(parsedMemos.data.memos)
              ? (parsedMemos.data.memos as unknown as WorldScrapMemosData["memos"])
              : [],
            updatedAt:
              typeof parsedMemos.data.updatedAt === "string"
                ? parsedMemos.data.updatedAt
                : undefined,
          }
        : { memos: [] };

    const meta = {
      format: LUIE_PACKAGE_FORMAT,
      container: LUIE_PACKAGE_CONTAINER_DIR,
      version: LUIE_PACKAGE_VERSION,
      projectId: project.id,
      title: project.title,
      description: project.description,
      createdAt: project.createdAt?.toISOString?.() ?? String(project.createdAt),
      updatedAt: project.updatedAt?.toISOString?.() ?? String(project.updatedAt),
      chapters: chapterMeta,
    };

    logger.info("Exporting .luie package", {
      projectId,
      projectPath: project.projectPath,
      chapterCount: chapters.length,
      characterCount: characters.length,
      termCount: terms.length,
      snapshotCount: snapshots.length,
    });

    await writeLuiePackage(
      project.projectPath,
      {
        meta,
        chapters,
        characters,
        terms,
        synopsis,
        plot,
        drawing,
        mindmap,
        memos,
        snapshots,
      },
      logger,
    );
  }
}

export const projectService = new ProjectService();
