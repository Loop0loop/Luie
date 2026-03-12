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
import { worldReplicaService } from "../../features/worldReplicaService.js";
import { normalizeLuiePackagePath } from "./projectPathPolicy.js";
import { getProjectAttachmentPath } from "./projectAttachmentStore.js";
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

type ParsedWorldPayload = {
  synopsis: ReturnType<typeof LuieWorldSynopsisSchema.safeParse>;
  plot: ReturnType<typeof LuieWorldPlotSchema.safeParse>;
  drawing: ReturnType<typeof LuieWorldDrawingSchema.safeParse>;
  mindmap: ReturnType<typeof LuieWorldMindmapSchema.safeParse>;
  memos: ReturnType<typeof LuieWorldScrapMemosSchema.safeParse>;
};

type ReplicaParsedWorldPayload = {
  [K in keyof ParsedWorldPayload]: {
    found: boolean;
    parsed: ParsedWorldPayload[K];
  };
};

const safeParseWorldPayloadForExport = <T>(
  payload: unknown,
  schema: z.ZodType<T>,
  options: {
    source: "replica" | "package";
    label: string;
    projectId?: string;
    packagePath?: string;
    entryPath?: string;
  },
  logger: LoggerLike,
): ReturnType<z.ZodType<T>["safeParse"]> => {
  if (payload === null || payload === undefined) {
    return schema.safeParse(null);
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    logger.warn("Invalid world document payload during export; using default", {
      source: options.source,
      projectId: options.projectId,
      packagePath: options.packagePath,
      entryPath: options.entryPath,
      label: options.label,
      issues: parsed.error.issues,
    });
  }
  return parsed;
};

const createEmptyParsedWorldPayload = (): ParsedWorldPayload => ({
  synopsis: LuieWorldSynopsisSchema.safeParse(null),
  plot: LuieWorldPlotSchema.safeParse(null),
  drawing: LuieWorldDrawingSchema.safeParse(null),
  mindmap: LuieWorldMindmapSchema.safeParse(null),
  memos: LuieWorldScrapMemosSchema.safeParse(null),
});

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
  docTypes?: Array<keyof ParsedWorldPayload>,
): Promise<ParsedWorldPayload> => {
  if (!projectPath || !projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
    return createEmptyParsedWorldPayload();
  }

  const selectedDocTypes = new Set<keyof ParsedWorldPayload>(
    docTypes ?? ["synopsis", "plot", "drawing", "mindmap", "memos"],
  );

  const readWorldDocument = async <T>(
    fileName: string,
    schema: z.ZodType<T>,
    label: string,
  ): Promise<ReturnType<z.ZodType<T>["safeParse"]>> => {
    const entryPath = `${LUIE_WORLD_DIR}/${fileName}`;
    try {
      const raw = await readLuieEntry(projectPath, entryPath, logger);
      if (typeof raw !== "string" || raw.trim().length === 0) {
        return schema.safeParse(null);
      }
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(raw);
      } catch (error) {
        logger.warn("Invalid .luie world JSON; using default during export", {
          packagePath: projectPath,
          entryPath,
          label,
          error,
        });
        return schema.safeParse(null);
      }
      return safeParseWorldPayloadForExport(parsedJson, schema, {
        source: "package",
        packagePath: projectPath,
        entryPath,
        label,
      }, logger);
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
    selectedDocTypes.has("synopsis")
      ? readWorldDocument(
          LUIE_WORLD_SYNOPSIS_FILE,
          LuieWorldSynopsisSchema,
          "synopsis",
        )
      : Promise.resolve(LuieWorldSynopsisSchema.safeParse(null)),
    selectedDocTypes.has("plot")
      ? readWorldDocument(LUIE_WORLD_PLOT_FILE, LuieWorldPlotSchema, "plot")
      : Promise.resolve(LuieWorldPlotSchema.safeParse(null)),
    selectedDocTypes.has("drawing")
      ? readWorldDocument(LUIE_WORLD_DRAWING_FILE, LuieWorldDrawingSchema, "drawing")
      : Promise.resolve(LuieWorldDrawingSchema.safeParse(null)),
    selectedDocTypes.has("mindmap")
      ? readWorldDocument(LUIE_WORLD_MINDMAP_FILE, LuieWorldMindmapSchema, "mindmap")
      : Promise.resolve(LuieWorldMindmapSchema.safeParse(null)),
    selectedDocTypes.has("memos")
      ? readWorldDocument(
          LUIE_WORLD_SCRAP_MEMOS_FILE,
          LuieWorldScrapMemosSchema,
          "scrap-memos",
        )
      : Promise.resolve(LuieWorldScrapMemosSchema.safeParse(null)),
  ]);

  return {
    synopsis,
    plot,
    drawing,
    mindmap,
    memos,
  };
};

const readWorldPayloadFromReplica = async (
  projectId: string,
  logger: LoggerLike,
): Promise<ReplicaParsedWorldPayload> => {
  const [synopsis, plot, drawing, mindmap, memos] = await Promise.all([
    worldReplicaService.getDocument({ projectId, docType: "synopsis" }),
    worldReplicaService.getDocument({ projectId, docType: "plot" }),
    worldReplicaService.getDocument({ projectId, docType: "drawing" }),
    worldReplicaService.getDocument({ projectId, docType: "mindmap" }),
    worldReplicaService.getScrapMemos(projectId),
  ]);

  return {
    synopsis: {
      found: synopsis.found,
      parsed: safeParseWorldPayloadForExport(
        synopsis.payload,
        LuieWorldSynopsisSchema,
        {
          source: "replica",
          projectId,
          label: "synopsis",
        },
        logger,
      ),
    },
    plot: {
      found: plot.found,
      parsed: safeParseWorldPayloadForExport(
        plot.payload,
        LuieWorldPlotSchema,
        {
          source: "replica",
          projectId,
          label: "plot",
        },
        logger,
      ),
    },
    drawing: {
      found: drawing.found,
      parsed: safeParseWorldPayloadForExport(
        drawing.payload,
        LuieWorldDrawingSchema,
        {
          source: "replica",
          projectId,
          label: "drawing",
        },
        logger,
      ),
    },
    mindmap: {
      found: mindmap.found,
      parsed: safeParseWorldPayloadForExport(
        mindmap.payload,
        LuieWorldMindmapSchema,
        {
          source: "replica",
          projectId,
          label: "mindmap",
        },
        logger,
      ),
    },
    memos: {
      found: memos.found,
      parsed: safeParseWorldPayloadForExport(
        memos.data,
        LuieWorldScrapMemosSchema,
        {
          source: "replica",
          projectId,
          label: "scrap-memos",
        },
        logger,
      ),
    },
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
  const attachedProjectPath = await getProjectAttachmentPath(input.projectId);

  const exportPath = input.options?.targetPath
    ? normalizeLuiePackagePath(input.options.targetPath, "targetPath")
    : resolveExportPath(input.projectId, attachedProjectPath, input.logger);
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
  const replicaWorld = await readWorldPayloadFromReplica(input.projectId, input.logger);
  const missingPackageDocTypes = ([
    "synopsis",
    "plot",
    "drawing",
    "mindmap",
    "memos",
  ] as Array<keyof ParsedWorldPayload>).filter(
    (docType) => !replicaWorld[docType].found,
  );
  const parsedWorld =
    worldSourcePath === null || missingPackageDocTypes.length === 0
      ? createEmptyParsedWorldPayload()
      : await readWorldPayloadFromPackage(
          worldSourcePath,
          input.logger,
          missingPackageDocTypes,
        );

  const synopsis = buildWorldSynopsis(
    project,
    replicaWorld.synopsis.found ? replicaWorld.synopsis.parsed : parsedWorld.synopsis,
  );
  const plot = buildWorldPlot(
    replicaWorld.plot.found ? replicaWorld.plot.parsed : parsedWorld.plot,
  );
  const drawing = buildWorldDrawing(
    replicaWorld.drawing.found ? replicaWorld.drawing.parsed : parsedWorld.drawing,
  );
  const mindmap = buildWorldMindmap(
    replicaWorld.mindmap.found ? replicaWorld.mindmap.parsed : parsedWorld.mindmap,
  );
  const memos = buildWorldScrapMemos(
    replicaWorld.memos.found ? replicaWorld.memos.parsed : parsedWorld.memos,
  );
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
