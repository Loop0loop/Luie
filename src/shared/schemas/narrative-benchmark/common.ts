import { z } from "zod";

export const NARRATIVE_BENCHMARK_SCHEMA_VERSION = "narrative-benchmark/v1" as const;

export const narrativeIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, "ID must use lowercase kebab-case");
export const narrativeSha256Schema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, "Invalid SHA-256");
export const narrativeChapterNumberSchema = z.number().int().positive();
export const narrativeBoundedTextSchema = z.string().min(1).max(20_000);

export const narrativeTaxonomySchema = z.enum([
  "entity_retrieval",
  "fact_retrieval",
  "relationship_state",
  "relationship_change",
  "temporal_order",
  "event_causality",
  "character_knowledge",
  "foreshadowing",
  "contradiction",
  "worldline_isolation",
]);

export const narrativeGenreSchema = z.enum([
  "romance",
  "fantasy",
  "contemporary",
  "mystery",
  "regression",
  "murim",
  "scifi",
  "thriller",
]);

export const narrativeScaleTierSchema = z.enum(["S", "M", "ML", "L", "XL"]);
export const narrativeDataQualityLabelSchema = z.enum([
  "GOOD",
  "BAD",
  "AMBIGUOUS",
  "NOISE",
]);
export const narrativeReviewStageSchema = z.enum([
  "blueprint",
  "manuscript",
  "query_gold",
]);
export const narrativeReviewStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "needs_adjudication",
  "stale",
]);

export type NarrativeTaxonomy = z.infer<typeof narrativeTaxonomySchema>;
export type NarrativeGenre = z.infer<typeof narrativeGenreSchema>;
export type NarrativeScaleTier = z.infer<typeof narrativeScaleTierSchema>;
export type NarrativeDataQualityLabel = z.infer<
  typeof narrativeDataQualityLabelSchema
>;
export type NarrativeReviewStage = z.infer<typeof narrativeReviewStageSchema>;
export type NarrativeReviewStatus = z.infer<typeof narrativeReviewStatusSchema>;
