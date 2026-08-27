import { z } from "zod";
import {
  NARRATIVE_BENCHMARK_SCHEMA_VERSION,
  narrativeBoundedTextSchema,
  narrativeChapterNumberSchema,
  narrativeGenreSchema,
  narrativeIdSchema,
  narrativeScaleTierSchema,
  narrativeSha256Schema,
} from "./common";

export const narrativeBenchmarkManifestSchema = z.strictObject({
  schemaVersion: z.literal(NARRATIVE_BENCHMARK_SCHEMA_VERSION),
  corpusId: narrativeIdSchema,
  title: z.string().min(1).max(255),
  language: z.string().min(2).max(35),
  scaleTier: narrativeScaleTierSchema,
  genres: z.array(narrativeGenreSchema).min(1).max(8),
  seed: z.string().min(1).max(255),
  revision: narrativeSha256Schema,
  benchmarkEligibility: z.boolean(),
  humanReviewStatus: z.enum(["unreviewed", "in_review", "approved"]),
});

export const narrativeWorldSchema = z.strictObject({
  worldId: narrativeIdSchema,
  name: z.string().min(1).max(255),
  rules: z
    .array(
      z.strictObject({
        ruleId: narrativeIdSchema,
        statement: narrativeBoundedTextSchema,
      }),
    )
    .max(200),
  revision: narrativeSha256Schema,
});

export const narrativeContinuitySchema = z.strictObject({
  continuityId: narrativeIdSchema,
  label: z.string().min(1).max(255),
  parentContinuityId: narrativeIdSchema.nullable(),
  divergenceChapter: narrativeChapterNumberSchema.nullable(),
});

export const narrativeAliasSchema = z.strictObject({
  aliasId: narrativeIdSchema,
  value: z.string().min(1).max(255),
  validFromChapter: narrativeChapterNumberSchema,
  validToChapter: narrativeChapterNumberSchema.nullable(),
  continuityId: narrativeIdSchema,
});

export const narrativeCharacterSchema = z.strictObject({
  characterId: narrativeIdSchema,
  canonicalName: z.string().min(1).max(255),
  aliases: z.array(narrativeAliasSchema).max(100),
  introducedChapter: narrativeChapterNumberSchema,
  revision: narrativeSha256Schema,
});

export const narrativeGoalSchema = z.strictObject({
  goalId: narrativeIdSchema,
  characterId: narrativeIdSchema,
  description: narrativeBoundedTextSchema,
  validFromChapter: narrativeChapterNumberSchema,
  validToChapter: narrativeChapterNumberSchema.nullable(),
  continuityId: narrativeIdSchema,
});

export const narrativeConflictSchema = z.strictObject({
  conflictId: narrativeIdSchema,
  participantIds: z.array(narrativeIdSchema).min(2).max(20),
  description: narrativeBoundedTextSchema,
  introducedChapter: narrativeChapterNumberSchema,
  resolvedChapter: narrativeChapterNumberSchema.nullable(),
  continuityId: narrativeIdSchema,
});

export const narrativePropositionSchema = z.strictObject({
  propositionId: narrativeIdSchema,
  statement: narrativeBoundedTextSchema,
  canonicalStatus: z.enum(["confirmed", "rejected", "unresolved"]),
  continuityId: narrativeIdSchema,
  validFromChapter: narrativeChapterNumberSchema,
  validToChapter: narrativeChapterNumberSchema.nullable(),
});

export type NarrativeBenchmarkManifest = z.infer<
  typeof narrativeBenchmarkManifestSchema
>;
export type NarrativeWorld = z.infer<typeof narrativeWorldSchema>;
export type NarrativeContinuity = z.infer<typeof narrativeContinuitySchema>;
export type NarrativeAlias = z.infer<typeof narrativeAliasSchema>;
export type NarrativeCharacter = z.infer<typeof narrativeCharacterSchema>;
export type NarrativeGoal = z.infer<typeof narrativeGoalSchema>;
export type NarrativeConflict = z.infer<typeof narrativeConflictSchema>;
export type NarrativeProposition = z.infer<typeof narrativePropositionSchema>;
