import { z } from "zod";
import {
  narrativeBoundedTextSchema,
  narrativeChapterNumberSchema,
  narrativeGenreSchema,
  narrativeIdSchema,
  narrativeSha256Schema,
  narrativeTaxonomySchema,
} from "./common";

export const narrativeQueryScopeSchema = z.strictObject({
  allowedUntilChapter: narrativeChapterNumberSchema,
  includeFuture: z.boolean(),
  allowedContinuityIds: z.array(narrativeIdSchema).min(1).max(20),
  forbiddenContinuityIds: z.array(narrativeIdSchema).max(20),
});

const narrativeQueryBaseSchema = z.strictObject({
  queryId: narrativeIdSchema,
  taxonomy: narrativeTaxonomySchema,
  secondaryTaxonomies: z.array(narrativeTaxonomySchema).max(9),
  question: z.string().min(1).max(4000),
  genre: narrativeGenreSchema,
  difficulty: z.enum([
    "single_hop",
    "multi_evidence",
    "multi_hop",
    "long_range",
    "cross_viewpoint",
    "cross_worldline",
  ]),
  scope: narrativeQueryScopeSchema,
  revision: narrativeSha256Schema,
});

export const narrativeRetrievalQuerySchema = narrativeQueryBaseSchema.extend({
  benchmarkLayer: z.literal("retrieval"),
  expectedEvidenceIds: z.array(narrativeIdSchema).min(1).max(100),
});

export const narrativeGoldAnswerSchema = z.discriminatedUnion("answerKind", [
  z.strictObject({ answerKind: z.literal("text"), text: narrativeBoundedTextSchema }),
  z.strictObject({
    answerKind: z.literal("boolean"),
    value: z.boolean(),
    explanation: narrativeBoundedTextSchema,
  }),
  z.strictObject({
    answerKind: z.literal("entity"),
    entityIds: z.array(narrativeIdSchema).min(1).max(100),
  }),
  z.strictObject({
    answerKind: z.literal("state"),
    value: narrativeBoundedTextSchema,
    validAtChapter: narrativeChapterNumberSchema,
  }),
  z.strictObject({
    answerKind: z.literal("ordered_events"),
    eventIds: z.array(narrativeIdSchema).min(2).max(100),
  }),
  z.strictObject({
    answerKind: z.literal("causal_chain"),
    eventIds: z.array(narrativeIdSchema).min(2).max(100),
  }),
]);

export const narrativeReasoningQuerySchema = narrativeQueryBaseSchema.extend({
  benchmarkLayer: z.literal("reasoning"),
  modes: z
    .array(z.enum(["oracle_context", "end_to_end"]))
    .min(1)
    .max(2),
  expectedAnswer: narrativeGoldAnswerSchema,
  requiredEvidenceIds: z.array(narrativeIdSchema).min(1).max(100),
  forbiddenClaimIds: z.array(narrativeIdSchema).max(100),
});

export type NarrativeQueryScope = z.infer<typeof narrativeQueryScopeSchema>;
export type NarrativeRetrievalQuery = z.infer<
  typeof narrativeRetrievalQuerySchema
>;
export type NarrativeGoldAnswer = z.infer<typeof narrativeGoldAnswerSchema>;
export type NarrativeReasoningQuery = z.infer<
  typeof narrativeReasoningQuerySchema
>;
