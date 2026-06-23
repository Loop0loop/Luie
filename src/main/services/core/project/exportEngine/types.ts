import type { z } from "zod";
import type { LoggerLike as LuieWriterLogger } from "../../../io/luiePackageTypes.js";
import type {
  LuieWorldDrawingSchema,
  LuieWorldGraphSchema,
  LuieWorldMindmapSchema,
  LuieWorldPlotSchema,
  LuieWorldScrapMemosSchema,
  LuieWorldSynopsisSchema,
} from "../projectLuieSchemas.js";

export type LoggerLike = LuieWriterLogger & {
  info: (message: string, details?: unknown) => void;
  warn: (message: string, details?: unknown) => void;
};

export type ParsedWorldPayload = {
  synopsis: ReturnType<typeof LuieWorldSynopsisSchema.safeParse>;
  plot: ReturnType<typeof LuieWorldPlotSchema.safeParse>;
  drawing: ReturnType<typeof LuieWorldDrawingSchema.safeParse>;
  mindmap: ReturnType<typeof LuieWorldMindmapSchema.safeParse>;
  memos: ReturnType<typeof LuieWorldScrapMemosSchema.safeParse>;
  graph: ReturnType<typeof LuieWorldGraphSchema.safeParse>;
};

export type ReplicaParsedWorldPayload = {
  [K in keyof ParsedWorldPayload]: {
    found: boolean;
    parsed: ParsedWorldPayload[K];
  };
};

export type WorldPayloadSchema<T> = z.ZodType<T>;
