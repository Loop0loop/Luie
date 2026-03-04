import type { z } from "zod";
import { db } from "../../../database/index.js";
import {
  LUIE_PACKAGE_EXTENSION,
  LUIE_WORLD_DIR,
  LUIE_WORLD_DRAWING_FILE,
  LUIE_WORLD_MINDMAP_FILE,
  LUIE_WORLD_PLOT_FILE,
  LUIE_WORLD_SCRAP_MEMOS_FILE,
  LUIE_WORLD_SYNOPSIS_FILE,
  SNAPSHOT_FILE_KEEP_COUNT,
} from "../../../../shared/constants/index.js";
import type { ProjectExportRecord } from "../../../../shared/types/index.js";
import { writeLuiePackage } from "../../io/luiePackageWriter.js";
import { readLuieEntry } from "../../../utils/luiePackage.js";
import { ensureSafeAbsolutePath } from "../../../utils/pathValidation.js";
import { settingsManager } from "../../../manager/settingsManager.js";
import type { LoggerLike as LuieWriterLogger } from "../../io/luiePackageTypes.js";
import { normalizeLuiePackagePath } from "./projectPathPolicy.js";
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
} from "./projectExportPayload.js";
import {
  LuieWorldDrawingSchema,
  LuieWorldMindmapSchema,
  LuieWorldPlotSchema,
  LuieWorldScrapMemosSchema,
  LuieWorldSynopsisSchema,
} from "./projectLuieSchemas.js";

type LoggerLike = LuieWriterLogger & {
  info: (message: string, details?: unknown) => void;
  warn: (message: string, details?: unknown) => void;
};

const parseLuieDocumentForExport = <T>(
  raw: string | null,
  schema: z.ZodType<T>,
  options: {
    packagePath: string;
    entryPath: string;
    label: string;
  },
  logger: LoggerLike,
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

const getProjectForExport = async (projectId: string): Promise<ProjectExportRecord | null> => {
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
};

const resolveExportPath = (
  projectId: string,
  projectPath: string | null | undefined,
  logger: LoggerLike,
): string | null => {
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
};

const readWorldPayloadFromPackage = async (
  projectPath: string | null | undefined,
  logger: LoggerLike,
) => {
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
      return parseLuieDocumentForExport(
        raw,
        schema,
        {
          packagePath: projectPath,
          entryPath,
          label,
        },
        logger,
      );
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
};

export const exportProjectPackageWithOptions = async (input: {
  projectId: string;
  logger: LoggerLike;
  options?: {
    targetPath?: string;
    worldSourcePath?: string | null;
  };
}): Promise<boolean> => {
  const project = await getProjectForExport(input.projectId);
  if (!project) return false;

  const exportPath = input.options?.targetPath
    ? normalizeLuiePackagePath(input.options.targetPath, "targetPath")
    : resolveExportPath(input.projectId, project.projectPath, input.logger);
  if (!exportPath) return false;

  const worldSourcePath =
    input.options?.worldSourcePath === undefined
      ? exportPath
      : input.options.worldSourcePath;

  const { exportChapters, chapterMeta } = buildExportChapterData(project.chapters);
  const characters = buildExportCharacterData(project.characters);
  const terms = buildExportTermData(project.terms);
  const snapshotExportLimit =
    settingsManager.getAll().snapshotExportLimit ?? SNAPSHOT_FILE_KEEP_COUNT;
  const snapshots = buildExportSnapshotData(project.snapshots, snapshotExportLimit);
  const parsedWorld = await readWorldPayloadFromPackage(worldSourcePath, input.logger);

  const synopsis = buildWorldSynopsis(project, parsedWorld.synopsis);
  const plot = buildWorldPlot(parsedWorld.plot);
  const drawing = buildWorldDrawing(parsedWorld.drawing);
  const mindmap = buildWorldMindmap(parsedWorld.mindmap);
  const memos = buildWorldScrapMemos(parsedWorld.memos);
  const graph = buildWorldGraph(project);
  const meta = buildProjectPackageMeta(project, chapterMeta);

  input.logger.info("Exporting .luie package", {
    projectId: input.projectId,
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
    input.logger,
  );
  return true;
};
