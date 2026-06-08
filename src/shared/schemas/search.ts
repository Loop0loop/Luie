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
  question: z
    .string()
    .trim()
    .min(1, "Question is required")
    .max(20_000, "Question is too large"),
  chapterId: chapterIdSchema.optional(),
  entityId: z.string().trim().min(1).optional(),
  entityName: z.string().trim().min(1).optional(),
  entityNames: z.array(z.string().trim().min(1)).optional(),
  entityType: z.string().trim().min(1).optional(),
  includePriorMemory: z.boolean().optional(),
});

export const memoryConflictQueueQuerySchema = z.object({
  projectId: projectIdSchema,
  chapterId: chapterIdSchema.optional(),
  includePriorMemory: z.boolean().optional(),
  entityId: z.string().trim().min(1).optional(),
  entityName: z.string().trim().min(1).optional(),
  entityType: z.string().trim().min(1).optional(),
  limit: z.number().int().positive().max(200).optional(),
});

export const memoryEvalRunSchema = z.object({
  projectId: projectIdSchema,
  label: z.string().trim().min(1, "Eval label is required").max(200),
  topK: z.number().int().positive().max(100).optional(),
});

export const memoryIntentCalibrationRunSchema = z.object({
  projectId: projectIdSchema,
  useLlm: z.boolean().optional(),
});

export const memoryEpisodeCalibrationRunSchema = z.object({
  projectId: projectIdSchema,
});

export const memoryEpisodeReviewQueueSchema = z.object({
  projectId: projectIdSchema,
  limit: z.number().int().positive().max(200).optional(),
});

export const memoryEpisodeRejectSchema = z.object({
  projectId: projectIdSchema,
  episodeId: z.string().uuid("Invalid episode ID"),
  reason: z.string().trim().min(1, "Rejection reason is required").max(1000),
});

export const memoryTemporalFactReviewQueueSchema = z.object({
  projectId: projectIdSchema,
  limit: z.number().int().positive().max(200).optional(),
});

export const memoryTemporalFactConfirmSchema = z.object({
  projectId: projectIdSchema,
  factId: z.string().uuid("Invalid fact ID"),
});

export const memoryTemporalFactRejectSchema = z.object({
  projectId: projectIdSchema,
  factId: z.string().uuid("Invalid fact ID"),
  reason: z.string().trim().min(1, "Rejection reason is required").max(1000),
});

export const memoryTemporalFactConflictResolveSchema = z.object({
  projectId: projectIdSchema,
  conflictId: z.string().uuid("Invalid conflict ID"),
  winnerFactId: z.string().uuid("Invalid fact ID"),
  reason: z.string().trim().min(1).max(1000).optional(),
});

export const memoryEntityAliasReviewQueueSchema = z.object({
  projectId: projectIdSchema,
  limit: z.number().int().positive().max(200).optional(),
});

export const memoryEntityReviewQueueSchema = z.object({
  projectId: projectIdSchema,
  limit: z.number().int().positive().max(200).optional(),
});

export const memoryEntityConfirmSchema = z.object({
  projectId: projectIdSchema,
  entityId: z.string().uuid("Invalid entity ID"),
});

export const memoryEntityRejectSchema = z.object({
  projectId: projectIdSchema,
  entityId: z.string().uuid("Invalid entity ID"),
});

export const memoryEntityAliasConfirmSchema = z.object({
  projectId: projectIdSchema,
  aliasId: z.string().uuid("Invalid alias ID"),
});

export const memoryEntityAliasRejectSchema = z.object({
  projectId: projectIdSchema,
  aliasId: z.string().uuid("Invalid alias ID"),
});

export const memoryEntityMergeSchema = z.object({
  projectId: projectIdSchema,
  targetEntityId: z.string().uuid("Invalid target entity ID"),
  sourceEntityId: z.string().uuid("Invalid source entity ID"),
});

export const memoryEntityAliasSplitSchema = z.object({
  projectId: projectIdSchema,
  aliasId: z.string().uuid("Invalid alias ID"),
  canonicalName: z.string().trim().min(1, "Canonical name is required").max(200),
});

export const memoryChunkIdSchema = z.string().uuid("Invalid chunk ID");
export const memoryChunkWindowSchema = z.object({
  projectId: projectIdSchema,
  chunkId: memoryChunkIdSchema,
  unit: z.enum(["chunk", "paragraph"]).optional(),
  before: z.number().int().min(0).max(10).optional(),
  after: z.number().int().min(0).max(10).optional(),
});
export const memoryChapterSummaryIdSchema = chapterIdSchema;

export const rebuildMemoryChunksSchema = z.object({
  projectId: projectIdSchema,
  sourceType: z.string().min(1).optional(),
  sourceId: z.string().min(1).optional(),
});

export const memorySummaryStatusSchema = z.object({
  projectId: projectIdSchema,
});

export const memoryNarrativeSummaryStatusSchema = z.object({
  projectId: projectIdSchema,
});

export const memoryEmbeddingStatusSchema = z.object({
  projectId: projectIdSchema,
});

export const ragQaRequestSchema = z.object({
  projectId: projectIdSchema,
  question: z
    .string()
    .min(1, "Question is required")
    .max(20_000, "Question is too large"),
  chapterId: chapterIdSchema.optional(),
  includePriorMemory: z.boolean().optional(),
});

export const ragQaStopSchema = z.object({
  runId: z.string().optional(),
});
