import type { z } from "zod";
import {
  ErrorCode,
  LUIE_MEMORY_CANONICAL_FILE,
  LUIE_MEMORY_DIR,
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
} from "../../../../../shared/constants/index.js";
import { ServiceError } from "../../../../utils/error/index.js";
import type { LoggerLike as LuieWriterLogger } from "../../../io/luiePackageTypes.js";
import { readLuieContainerEntry } from "../../../io/luieContainer.js";
import {
  LuieCharactersSchema,
  LuieMemoryCanonicalSchema,
  LuieSnapshotsSchema,
  LuieTermsSchema,
  LuieWorldDrawingSchema,
  LuieWorldGraphSchema,
  LuieWorldMindmapSchema,
  LuieWorldPlotSchema,
  LuieWorldScrapMemosSchema,
  LuieWorldSynopsisSchema,
} from "../projectLuieSchemas.js";

type LoggerLike = LuieWriterLogger;

export type LuieImportCollections = {
  characters: Array<Record<string, unknown>>;
  terms: Array<Record<string, unknown>>;
  snapshots: Array<NonNullable<z.infer<typeof LuieSnapshotsSchema>["snapshots"]>[number]>;
  synopsis?: z.infer<typeof LuieWorldSynopsisSchema>;
  plot?: z.infer<typeof LuieWorldPlotSchema>;
  drawing?: z.infer<typeof LuieWorldDrawingSchema>;
  mindmap?: z.infer<typeof LuieWorldMindmapSchema>;
  memos?: z.infer<typeof LuieWorldScrapMemosSchema>;
  graph?: z.infer<typeof LuieWorldGraphSchema>;
  memory?: z.infer<typeof LuieMemoryCanonicalSchema>;
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

export const readLuieImportCollections = async (
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
  const memoryEntryPath = `${LUIE_MEMORY_DIR}/${LUIE_MEMORY_CANONICAL_FILE}`;

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
    memoryRaw,
  ] = await Promise.all([
    readLuieContainerEntry(resolvedPath, charactersEntryPath, logger),
    readLuieContainerEntry(resolvedPath, termsEntryPath, logger),
    readLuieContainerEntry(resolvedPath, snapshotsEntryPath, logger),
    readLuieContainerEntry(resolvedPath, synopsisEntryPath, logger),
    readLuieContainerEntry(resolvedPath, plotEntryPath, logger),
    readLuieContainerEntry(resolvedPath, drawingEntryPath, logger),
    readLuieContainerEntry(resolvedPath, mindmapEntryPath, logger),
    readLuieContainerEntry(resolvedPath, memosEntryPath, logger),
    readLuieContainerEntry(resolvedPath, graphEntryPath, logger),
    readLuieContainerEntry(resolvedPath, memoryEntryPath, logger),
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
  const parsedMemory = parseLuieDocumentOrThrow(
    memoryRaw,
    LuieMemoryCanonicalSchema,
    {
      packagePath: resolvedPath,
      entryPath: memoryEntryPath,
      label: "canonical memory",
    },
  );

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
    memory: parsedMemory
      ? {
          schemaVersion: parsedMemory.schemaVersion ?? 1,
          exportedAt: parsedMemory.exportedAt,
          tables: parsedMemory.tables ?? {},
        }
      : undefined,
  };
};
