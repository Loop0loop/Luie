import { z } from "zod";
import {
  narrativeDataQualityLabelSchema,
  narrativeIdSchema,
  narrativeReviewStageSchema,
  narrativeReviewStatusSchema,
  narrativeSha256Schema,
} from "./common";

export const narrativeHumanReviewRecordSchema = z.strictObject({
  reviewId: narrativeIdSchema,
  targetType: z.enum([
    "world",
    "character",
    "event",
    "relationship_transition",
    "knowledge_state",
    "foreshadowing",
    "source_document",
    "retrieval_query",
    "reasoning_query",
  ]),
  targetId: narrativeIdSchema,
  stage: narrativeReviewStageSchema,
  reviewerId: narrativeIdSchema,
  reviewerRole: z.enum(["narrative", "benchmark", "adjudicator"]),
  label: narrativeDataQualityLabelSchema,
  status: narrativeReviewStatusSchema,
  reasonCodes: z
    .array(
      z.enum([
        "DIRECT_GOLD_LEAK",
        "REPEATED_TEMPLATE",
        "BROKEN_CAUSAL_CHAIN",
        "IMPOSSIBLE_CHARACTER_ACTION",
        "UNSUPPORTED_ANSWER",
        "MULTIPLE_VALID_ANSWERS",
        "INTENTIONAL_DISTRACTOR",
        "STALE_DRAFT",
      ]),
    )
    .max(50),
  comment: z.string().max(10_000),
  reviewedRevision: narrativeSha256Schema,
  reviewedAt: z.iso.datetime(),
});

export type NarrativeHumanReviewRecord = z.infer<
  typeof narrativeHumanReviewRecordSchema
>;
