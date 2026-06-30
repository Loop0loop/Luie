import type { z } from "zod";
import {
  ErrorCode,
  LUIE_PACKAGE_EXTENSION,
  LUIE_WORLD_DIR,
  LUIE_WORLD_DRAWING_FILE,
  LUIE_WORLD_GRAPH_FILE,
  LUIE_WORLD_MINDMAP_FILE,
  LUIE_WORLD_PLOT_FILE,
  LUIE_WORLD_SCRAP_MEMOS_FILE,
  LUIE_WORLD_SYNOPSIS_FILE,
} from "../../../../../shared/constants/index.js";
import { ServiceError } from "../../../../utils/error/index.js";
import { readLuieContainerEntry } from "../../../io/luieContainer.js";
import { worldReplicaService } from "../../../features/worldReplica/index.js";
import {
  LuieWorldDrawingSchema,
  LuieWorldGraphSchema,
  LuieWorldMindmapSchema,
  LuieWorldPlotSchema,
  LuieWorldScrapMemosSchema,
  LuieWorldSynopsisSchema,
} from "../projectLuieSchemas.js";
import type {
  LoggerLike,
  ParsedWorldPayload,
  ReplicaParsedWorldPayload,
} from "./types.js";

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
    const details = {
      source: options.source,
      projectId: options.projectId,
      packagePath: options.packagePath,
      entryPath: options.entryPath,
      label: options.label,
      issues: parsed.error.issues,
    };
    if (options.source === "package") {
      throw new ServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Invalid .luie world document payload",
        details,
      );
    }
    logger.warn("Invalid world document payload during export; using default", details);
  }
  return parsed;
};

export const createEmptyParsedWorldPayload = (): ParsedWorldPayload => ({
  synopsis: LuieWorldSynopsisSchema.safeParse(null),
  plot: LuieWorldPlotSchema.safeParse(null),
  drawing: LuieWorldDrawingSchema.safeParse(null),
  mindmap: LuieWorldMindmapSchema.safeParse(null),
  memos: LuieWorldScrapMemosSchema.safeParse(null),
  graph: LuieWorldGraphSchema.safeParse(null),
});

export const readWorldPayloadFromPackage = async (
  projectPath: string | null | undefined,
  logger: LoggerLike,
  docTypes?: Array<keyof ParsedWorldPayload>,
): Promise<ParsedWorldPayload> => {
  if (
    !projectPath ||
    !projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)
  ) {
    return createEmptyParsedWorldPayload();
  }

  const selectedDocTypes = new Set<keyof ParsedWorldPayload>(
    docTypes ?? ["synopsis", "plot", "drawing", "mindmap", "memos", "graph"],
  );

  const readWorldDocument = async <T>(
    fileName: string,
    schema: z.ZodType<T>,
    label: string,
  ): Promise<ReturnType<z.ZodType<T>["safeParse"]>> => {
    const entryPath = `${LUIE_WORLD_DIR}/${fileName}`;
    const raw = await readLuieContainerEntry(projectPath, entryPath, logger);
    if (typeof raw !== "string" || raw.trim().length === 0) {
      return schema.safeParse(null);
    }
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch (error) {
      throw new ServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Invalid .luie world JSON",
        {
          projectPath,
          entryPath,
          label,
          error,
        },
      );
    }
    return safeParseWorldPayloadForExport(
      parsedJson,
      schema,
      {
        source: "package",
        packagePath: projectPath,
        entryPath,
        label,
      },
      logger,
    );
  };

  const [synopsis, plot, drawing, mindmap, memos, graph] = await Promise.all([
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
      ? readWorldDocument(
          LUIE_WORLD_DRAWING_FILE,
          LuieWorldDrawingSchema,
          "drawing",
        )
      : Promise.resolve(LuieWorldDrawingSchema.safeParse(null)),
    selectedDocTypes.has("mindmap")
      ? readWorldDocument(
          LUIE_WORLD_MINDMAP_FILE,
          LuieWorldMindmapSchema,
          "mindmap",
        )
      : Promise.resolve(LuieWorldMindmapSchema.safeParse(null)),
    selectedDocTypes.has("memos")
      ? readWorldDocument(
          LUIE_WORLD_SCRAP_MEMOS_FILE,
          LuieWorldScrapMemosSchema,
          "scrap-memos",
        )
      : Promise.resolve(LuieWorldScrapMemosSchema.safeParse(null)),
    selectedDocTypes.has("graph")
      ? readWorldDocument(LUIE_WORLD_GRAPH_FILE, LuieWorldGraphSchema, "graph")
      : Promise.resolve(LuieWorldGraphSchema.safeParse(null)),
  ]);

  return {
    synopsis,
    plot,
    drawing,
    mindmap,
    memos,
    graph,
  };
};

export const readWorldPayloadFromReplica = async (
  projectId: string,
  logger: LoggerLike,
): Promise<ReplicaParsedWorldPayload> => {
  const [synopsis, plot, drawing, mindmap, memos, graph] = await Promise.all([
    worldReplicaService.getDocument({ projectId, docType: "synopsis" }),
    worldReplicaService.getDocument({ projectId, docType: "plot" }),
    worldReplicaService.getDocument({ projectId, docType: "drawing" }),
    worldReplicaService.getDocument({ projectId, docType: "mindmap" }),
    worldReplicaService.getScrapMemos(projectId),
    worldReplicaService.getDocument({ projectId, docType: "graph" }),
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
    graph: {
      found: graph.found,
      parsed: safeParseWorldPayloadForExport(
        graph.payload,
        LuieWorldGraphSchema,
        {
          source: "replica",
          projectId,
          label: "graph",
        },
        logger,
      ),
    },
  };
};
