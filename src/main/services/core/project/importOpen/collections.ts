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
import { MEMORY_CANONICAL_UNKNOWN_ROW_FIELD_POLICY } from "../../../features/memory/persistence/memoryPersistencePolicy.js";
import type { ProjectImportWarning } from "../../../../../shared/types/project.js";

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
  importWarnings: ProjectImportWarning[];
};

const MEMORY_CANONICAL_KNOWN_ROW_FIELDS: Record<string, Set<string>> = {
  MemoryEntity: new Set([
    "id",
    "projectId",
    "entityType",
    "canonicalName",
    "status",
    "provenanceKind",
    "canonStatus",
    "confidence",
    "createdBy",
    "createdAt",
    "updatedAt",
    "deletedAt",
  ]),
  MemoryEntityAlias: new Set([
    "id",
    "projectId",
    "entityId",
    "entityType",
    "alias",
    "normalizedAlias",
    "status",
    "provenanceKind",
    "canonStatus",
    "createdAt",
    "updatedAt",
  ]),
  MemoryEpisode: new Set([
    "id",
    "projectId",
    "sourceType",
    "sourceId",
    "chapterId",
    "sceneId",
    "sourceContentHash",
    "extractorVersion",
    "episodeType",
    "title",
    "summary",
    "status",
    "provenanceKind",
    "canonStatus",
    "confidence",
    "createdAt",
    "updatedAt",
    "rejectedAt",
    "rejectionReason",
  ]),
  MemoryEpisodeEvidence: new Set([
    "id",
    "projectId",
    "episodeId",
    "chapterId",
    "chunkId",
    "contentHash",
    "sourceContentHash",
    "startOffset",
    "endOffset",
    "quote",
    "provenanceKind",
    "canonStatus",
    "createdAt",
    "updatedAt",
  ]),
  MemoryFact: new Set([
    "id",
    "projectId",
    "subjectEntityId",
    "predicate",
    "objectEntityId",
    "objectValue",
    "valueType",
    "validFromChapterId",
    "validFromChapterOrder",
    "validToChapterId",
    "validToChapterOrder",
    "observedAtChapterId",
    "observedAtChapterOrder",
    "confidence",
    "status",
    "provenanceKind",
    "canonStatus",
    "extractorVersion",
    "sourceContentHash",
    "invalidatedByFactId",
    "createdAt",
    "updatedAt",
    "rejectedAt",
    "rejectionReason",
  ]),
  MemoryFactEvidence: new Set([
    "id",
    "projectId",
    "factId",
    "evidenceId",
    "createdAt",
    "updatedAt",
  ]),
  MemoryFactInvalidation: new Set([
    "id",
    "projectId",
    "invalidatedFactId",
    "invalidatingFactId",
    "reason",
    "reviewStatus",
    "reviewerNote",
    "reviewedAt",
    "createdAt",
    "updatedAt",
  ]),
  MemoryEvalCase: new Set([
    "id",
    "projectId",
    "name",
    "question",
    "caseType",
    "expectedAnswer",
    "temporalScopeStartChapterId",
    "temporalScopeEndChapterId",
    "queryChapterOrder",
    "severity",
    "createdAt",
    "updatedAt",
  ]),
  MemoryEvalEvidence: new Set([
    "id",
    "caseId",
    "projectId",
    "chapterId",
    "expectedChunkId",
    "startOffset",
    "endOffset",
    "quote",
    "createdAt",
    "updatedAt",
  ]),
  MemoryEvalEntity: new Set([
    "id",
    "caseId",
    "projectId",
    "name",
    "entityType",
    "expectedAttributes",
    "createdAt",
    "updatedAt",
  ]),
  MemoryEvalRelation: new Set([
    "id",
    "caseId",
    "projectId",
    "sourceName",
    "targetName",
    "relation",
    "temporalScope",
    "expectedAttributes",
    "createdAt",
    "updatedAt",
  ]),
};

const summarizeUnknownCanonicalMemoryRowFields = (
  memory: z.infer<typeof LuieMemoryCanonicalSchema> | null,
): ProjectImportWarning[] => {
  const warnings: ProjectImportWarning[] = [];
  for (const [table, rows] of Object.entries(memory?.tables ?? {})) {
    const knownFields = MEMORY_CANONICAL_KNOWN_ROW_FIELDS[table];
    if (!knownFields) continue;
    const unknownFields = new Set<string>();
    for (const row of rows) {
      for (const field of Object.keys(row)) {
        if (!knownFields.has(field)) {
          unknownFields.add(field);
        }
      }
    }
    if (unknownFields.size > 0) {
      warnings.push({
        code: "canonical_memory_unknown_row_fields_discarded",
        policy: MEMORY_CANONICAL_UNKNOWN_ROW_FIELD_POLICY,
        table,
        fields: Array.from(unknownFields).sort(),
      });
    }
  }
  return warnings;
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
  const importWarnings = summarizeUnknownCanonicalMemoryRowFields(parsedMemory);
  for (const warning of importWarnings) {
    logger.warn?.(
      "Discarded unknown canonical memory row fields during .luie import",
      {
        packagePath: resolvedPath,
        table: warning.table,
        fields: warning.fields,
        policy: warning.policy,
      },
    );
  }

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
    graph: parsedGraph ?? undefined,
    memory: parsedMemory
      ? {
          schemaVersion: parsedMemory.schemaVersion ?? 1,
          exportedAt: parsedMemory.exportedAt,
          tables: parsedMemory.tables ?? {},
        }
      : undefined,
    importWarnings,
  };
};
