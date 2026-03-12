import { promises as fs } from "fs";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { db } from "../../../database/index.js";
import {
  ErrorCode,
  LUIE_PACKAGE_EXTENSION,
  LUIE_PACKAGE_META_FILENAME,
  LUIE_SNAPSHOTS_DIR,
  LUIE_WORLD_CHARACTERS_FILE,
  LUIE_WORLD_DRAWING_FILE,
  LUIE_WORLD_DIR,
  LUIE_WORLD_GRAPH_FILE,
  LUIE_WORLD_MINDMAP_FILE,
  LUIE_WORLD_PLOT_FILE,
  LUIE_WORLD_SCRAP_MEMOS_FILE,
  LUIE_WORLD_SYNOPSIS_FILE,
  LUIE_WORLD_TERMS_FILE,
} from "../../../../shared/constants/index.js";
import { ServiceError } from "../../../utils/serviceError.js";
import { ensureLuieExtension, readLuieEntry } from "../../../utils/luiePackage.js";
import type { LoggerLike as LuieWriterLogger } from "../../io/luiePackageTypes.js";
import { normalizeLuiePackagePath } from "./projectPathPolicy.js";
import {
  LuieCharactersSchema,
  LuieMetaSchema,
  LuieSnapshotsSchema,
  LuieTermsSchema,
  LuieWorldDrawingSchema,
  LuieWorldGraphSchema,
  LuieWorldMindmapSchema,
  LuieWorldPlotSchema,
  LuieWorldScrapMemosSchema,
  LuieWorldSynopsisSchema,
} from "./projectLuieSchemas.js";
import {
  buildChapterCreateRows,
  buildCharacterCreateRows,
  buildSnapshotCreateRows,
  buildTermCreateRows,
} from "./projectImportCodec.js";
import { buildGraphCreateRows } from "./projectImportGraph.js";
import { applyProjectImportTransaction } from "./projectImportTransaction.js";
import {
  findProjectByAttachmentPath,
  setProjectAttachmentPath,
} from "./projectAttachmentStore.js";

type LoggerLike = LuieWriterLogger & {
  info: (message: string, details?: unknown) => void;
  warn: (message: string, details?: unknown) => void;
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
  snapshots: Array<NonNullable<z.infer<typeof LuieSnapshotsSchema>["snapshots"]>[number]>;
  synopsis?: z.infer<typeof LuieWorldSynopsisSchema>;
  plot?: z.infer<typeof LuieWorldPlotSchema>;
  drawing?: z.infer<typeof LuieWorldDrawingSchema>;
  mindmap?: z.infer<typeof LuieWorldMindmapSchema>;
  memos?: z.infer<typeof LuieWorldScrapMemosSchema>;
  graph?: z.infer<typeof LuieWorldGraphSchema>;
};

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

const findProjectByPath = async (resolvedPath: string): Promise<ExistingProjectLookup> => {
  const project = await findProjectByAttachmentPath(resolvedPath);
  if (!project) {
    return null;
  }
  return {
    id: project.id,
    updatedAt: project.updatedAt,
  };
};

const readMetaOrMarkCorrupt = async (
  resolvedPath: string,
  logger: LoggerLike,
): Promise<LuieMetaReadResult> => {
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
};

const resolveImportIdentity = (
  meta: LuieMeta,
  existingByPath: ExistingProjectLookup,
): { resolvedProjectId: string; legacyProjectId: string | null } => {
  const metaProjectId = typeof meta.projectId === "string" ? meta.projectId : undefined;
  const resolvedProjectId = metaProjectId ?? existingByPath?.id ?? randomUUID();
  const legacyProjectId =
    existingByPath && existingByPath.id !== resolvedProjectId
      ? existingByPath.id
      : null;
  return { resolvedProjectId, legacyProjectId };
};

const buildRecoveryTimestamp = (date = new Date()): string => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}` +
    `${pad(date.getMonth() + 1)}` +
    `${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
};

const resolveRecoveredPackagePath = async (resolvedPath: string): Promise<string> => {
  const normalized = ensureLuieExtension(resolvedPath);
  const ext = LUIE_PACKAGE_EXTENSION;
  const lower = normalized.toLowerCase();
  const base = lower.endsWith(ext)
    ? normalized.slice(0, normalized.length - ext.length)
    : normalized;
  const timestamp = buildRecoveryTimestamp();
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
};

const readLuieImportCollections = async (
  resolvedPath: string,
  logger: LoggerLike,
): Promise<LuieImportCollections> => {
  const charactersEntryPath = `${LUIE_WORLD_DIR}/${LUIE_WORLD_CHARACTERS_FILE}`;
  const termsEntryPath = `${LUIE_WORLD_DIR}/${LUIE_WORLD_TERMS_FILE}`;
  const snapshotsEntryPath = `${LUIE_SNAPSHOTS_DIR}/index.json`;
  const synopsisEntryPath = `${LUIE_WORLD_DIR}/${LUIE_WORLD_SYNOPSIS_FILE}`;
  const plotEntryPath = `${LUIE_WORLD_DIR}/${LUIE_WORLD_PLOT_FILE}`;
  const drawingEntryPath = `${LUIE_WORLD_DIR}/${LUIE_WORLD_DRAWING_FILE}`;
  const mindmapEntryPath = `${LUIE_WORLD_DIR}/${LUIE_WORLD_MINDMAP_FILE}`;
  const memosEntryPath = `${LUIE_WORLD_DIR}/${LUIE_WORLD_SCRAP_MEMOS_FILE}`;
  const graphEntryPath = `${LUIE_WORLD_DIR}/${LUIE_WORLD_GRAPH_FILE}`;

  const [
    charactersRaw,
    termsRaw,
    snapshotsRaw,
    worldSynopsisRaw,
    worldPlotRaw,
    worldDrawingRaw,
    worldMindmapRaw,
    worldScrapMemosRaw,
    worldGraphRaw,
  ] = await Promise.all([
    readLuieEntry(resolvedPath, charactersEntryPath, logger),
    readLuieEntry(resolvedPath, termsEntryPath, logger),
    readLuieEntry(resolvedPath, snapshotsEntryPath, logger),
    readLuieEntry(resolvedPath, synopsisEntryPath, logger),
    readLuieEntry(resolvedPath, plotEntryPath, logger),
    readLuieEntry(resolvedPath, drawingEntryPath, logger),
    readLuieEntry(resolvedPath, mindmapEntryPath, logger),
    readLuieEntry(resolvedPath, memosEntryPath, logger),
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
  const parsedWorldPlot = parseLuieDocumentOrThrow(worldPlotRaw, LuieWorldPlotSchema, {
    packagePath: resolvedPath,
    entryPath: plotEntryPath,
    label: "world plot",
  });
  const parsedWorldDrawing = parseLuieDocumentOrThrow(
    worldDrawingRaw,
    LuieWorldDrawingSchema,
    {
      packagePath: resolvedPath,
      entryPath: drawingEntryPath,
      label: "world drawing",
    },
  );
  const parsedWorldMindmap = parseLuieDocumentOrThrow(
    worldMindmapRaw,
    LuieWorldMindmapSchema,
    {
      packagePath: resolvedPath,
      entryPath: mindmapEntryPath,
      label: "world mindmap",
    },
  );
  const parsedWorldScrapMemos = parseLuieDocumentOrThrow(
    worldScrapMemosRaw,
    LuieWorldScrapMemosSchema,
    {
      packagePath: resolvedPath,
      entryPath: memosEntryPath,
      label: "world scrap memos",
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
    synopsis: parsedWorldSynopsis
      ? {
          synopsis:
            typeof parsedWorldSynopsis.synopsis === "string"
              ? parsedWorldSynopsis.synopsis
              : "",
          status: parsedWorldSynopsis.status,
          genre: parsedWorldSynopsis.genre,
          targetAudience: parsedWorldSynopsis.targetAudience,
          logline: parsedWorldSynopsis.logline,
          updatedAt: parsedWorldSynopsis.updatedAt,
        }
      : undefined,
    plot: parsedWorldPlot
      ? {
          columns: parsedWorldPlot.columns ?? [],
          updatedAt: parsedWorldPlot.updatedAt,
        }
      : undefined,
    drawing: parsedWorldDrawing
      ? {
          paths: parsedWorldDrawing.paths ?? [],
          tool: parsedWorldDrawing.tool,
          iconType: parsedWorldDrawing.iconType,
          color: parsedWorldDrawing.color,
          lineWidth: parsedWorldDrawing.lineWidth,
          updatedAt: parsedWorldDrawing.updatedAt,
        }
      : undefined,
    mindmap: parsedWorldMindmap
      ? {
          nodes: parsedWorldMindmap.nodes ?? [],
          edges: parsedWorldMindmap.edges ?? [],
          updatedAt: parsedWorldMindmap.updatedAt,
        }
      : undefined,
    memos: parsedWorldScrapMemos
      ? {
          memos: parsedWorldScrapMemos.memos ?? [],
          updatedAt: parsedWorldScrapMemos.updatedAt,
        }
      : undefined,
    graph: parsedGraph
      ? {
          nodes: parsedGraph.nodes ?? [],
          edges: parsedGraph.edges ?? [],
          updatedAt: parsedGraph.updatedAt,
        }
      : undefined,
  };
};

export const openLuieProjectPackage = async (input: {
  packagePath: string;
  logger: LoggerLike;
  exportRecoveredPackage: (projectId: string, recoveryPath: string) => Promise<boolean>;
  getProjectById: (projectId: string) => Promise<unknown>;
}) => {
  const resolvedPath = normalizeLuiePackagePath(input.packagePath, "packagePath");
  const { meta, luieCorrupted, recoveryReason } = await readMetaOrMarkCorrupt(
    resolvedPath,
    input.logger,
  );
  const existingByPath = await findProjectByPath(resolvedPath);

  if (luieCorrupted) {
    if (!existingByPath) {
      throw new ServiceError(
        ErrorCode.FS_READ_FAILED,
        "Failed to read .luie meta",
        { packagePath: resolvedPath },
      );
    }
    const recoveryPath = await resolveRecoveredPackagePath(resolvedPath);
    const exported = await input.exportRecoveredPackage(existingByPath.id, recoveryPath);
    if (!exported) {
      throw new ServiceError(
        ErrorCode.FS_WRITE_FAILED,
        "Failed to write recovered .luie package",
        { packagePath: resolvedPath, recoveryPath },
      );
    }
    await setProjectAttachmentPath(existingByPath.id, recoveryPath);
    const project = await input.getProjectById(existingByPath.id);
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

  const { resolvedProjectId, legacyProjectId } = resolveImportIdentity(meta, existingByPath);
  const existing = (await db.getClient().project.findUnique({
    where: { id: resolvedProjectId },
    select: { id: true, updatedAt: true },
  })) as ExistingProjectLookup;

  const chaptersMeta = meta.chapters ?? [];
  const collections = await readLuieImportCollections(resolvedPath, input.logger);
  const chaptersForCreate = await buildChapterCreateRows({
    packagePath: resolvedPath,
    resolvedProjectId,
    chaptersMeta,
    readChapterEntry: async (entryPath: string) =>
      await readLuieEntry(resolvedPath, entryPath, input.logger),
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
    logger: input.logger,
  });

  const created = await applyProjectImportTransaction({
    resolvedProjectId,
    legacyProjectId,
    existing,
    meta,
    worldSynopsis: collections.synopsis,
    worldPlot: collections.plot,
    worldDrawing: collections.drawing,
    worldMindmap: collections.mindmap,
    worldScrapMemos: collections.memos,
    worldGraph: collections.graph,
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

  input.logger.info(".luie package hydrated", {
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

  return { project: created, conflict: "luie-newer" as const };
};
