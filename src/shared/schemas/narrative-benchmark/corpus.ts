import { z } from "zod";
import {
  narrativeChapterPlanSchema,
  narrativeEvidenceSchema,
  narrativeSceneSchema,
  narrativeSourceDocumentSchema,
} from "./evidence";
import {
  narrativeReasoningQuerySchema,
  narrativeRetrievalQuerySchema,
} from "./evaluation";
import {
  narrativeCausalEdgeSchema,
  narrativeEventSchema,
  narrativeForeshadowingSchema,
  narrativeKnowledgeStateSchema,
  narrativeRelationshipStateSchema,
  narrativeRelationshipTransitionSchema,
  narrativeTimelineEntrySchema,
} from "./narrative";
import { narrativeHumanReviewRecordSchema } from "./review";
import {
  narrativeBenchmarkManifestSchema,
  narrativeCharacterSchema,
  narrativeConflictSchema,
  narrativeContinuitySchema,
  narrativeGoalSchema,
  narrativePropositionSchema,
  narrativeWorldSchema,
} from "./world";

export const narrativeBenchmarkCorpusShapeSchema = z.strictObject({
  manifest: narrativeBenchmarkManifestSchema,
  world: narrativeWorldSchema,
  continuities: z.array(narrativeContinuitySchema).min(1).max(20),
  characters: z.array(narrativeCharacterSchema).min(1).max(1000),
  goals: z.array(narrativeGoalSchema).max(5000),
  conflicts: z.array(narrativeConflictSchema).max(5000),
  propositions: z.array(narrativePropositionSchema).max(10_000),
  events: z.array(narrativeEventSchema).min(1).max(100_000),
  causalEdges: z.array(narrativeCausalEdgeSchema).max(100_000),
  relationshipStates: z.array(narrativeRelationshipStateSchema).max(100_000),
  relationshipTransitions: z
    .array(narrativeRelationshipTransitionSchema)
    .max(100_000),
  knowledgeStates: z.array(narrativeKnowledgeStateSchema).max(100_000),
  timeline: z.array(narrativeTimelineEntrySchema).min(1).max(100_000),
  foreshadowing: z.array(narrativeForeshadowingSchema).max(10_000),
  chapters: z.array(narrativeChapterPlanSchema).min(1).max(10_000),
  scenes: z.array(narrativeSceneSchema).min(1).max(100_000),
  evidence: z.array(narrativeEvidenceSchema).min(1).max(100_000),
  retrievalQueries: z.array(narrativeRetrievalQuerySchema).max(100_000),
  reasoningQueries: z.array(narrativeReasoningQuerySchema).max(100_000),
  humanReviews: z.array(narrativeHumanReviewRecordSchema).max(100_000),
});

export const narrativeBenchmarkValidationInputSchema = z.strictObject({
  corpus: narrativeBenchmarkCorpusShapeSchema,
  sourceDocuments: z
    .array(narrativeSourceDocumentSchema)
    .min(1)
    .max(10_000),
});

export type NarrativeBenchmarkCorpus = z.infer<
  typeof narrativeBenchmarkCorpusShapeSchema
>;
export type NarrativeBenchmarkValidationInput = z.infer<
  typeof narrativeBenchmarkValidationInputSchema
>;
