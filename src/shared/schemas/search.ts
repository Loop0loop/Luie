import { z } from "zod";
import { chapterIdSchema, projectIdSchema } from "./common";

export const searchQuerySchema = z.object({
  projectId: projectIdSchema,
  query: z.string().min(1, "Query is required"),
  type: z.enum(["all", "character", "term"]).optional(),
});

export const memoryChunkSearchSchema = z.object({
  projectId: projectIdSchema,
  query: z.string().min(1, "Query is required"),
  limit: z.number().int().positive().max(100).optional(),
});

export const narrativeMemoryQuerySchema = z.object({
  projectId: projectIdSchema,
  question: z.string().trim().min(1, "Question is required").max(20_000, "Question is too large"),
  chapterId: chapterIdSchema.optional(),
  entityId: z.string().trim().min(1).optional(),
  entityName: z.string().trim().min(1).optional(),
  entityType: z.string().trim().min(1).optional(),
});

export const memoryChunkIdSchema = z.string().uuid("Invalid chunk ID");
export const memoryChapterSummaryIdSchema = chapterIdSchema;

export const rebuildMemoryChunksSchema = z.object({
  projectId: projectIdSchema,
  sourceType: z.string().min(1).optional(),
  sourceId: z.string().min(1).optional(),
});

export const memorySummaryStatusSchema = z.object({
  projectId: projectIdSchema,
});

export const memoryEmbeddingStatusSchema = z.object({
  projectId: projectIdSchema,
});

export const ragQaRequestSchema = z.object({
  projectId: projectIdSchema,
  question: z.string().min(1, "Question is required").max(20_000, "Question is too large"),
  chapterId: chapterIdSchema.optional(),
});

export const ragQaStopSchema = z.object({
  runId: z.string().optional(),
});
