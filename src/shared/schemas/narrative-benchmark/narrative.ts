import { z } from "zod";
import {
  narrativeBoundedTextSchema,
  narrativeChapterNumberSchema,
  narrativeIdSchema,
  narrativeSha256Schema,
} from "./common";

export const narrativeEventSchema = z.strictObject({
  eventId: narrativeIdSchema,
  continuityId: narrativeIdSchema,
  eventTime: z.string().min(1).max(255),
  firstNarratedChapter: narrativeChapterNumberSchema,
  participantIds: z.array(narrativeIdSchema).min(1).max(100),
  preconditionEventIds: z.array(narrativeIdSchema).max(100),
  effectEventIds: z.array(narrativeIdSchema).max(100),
  description: narrativeBoundedTextSchema,
  canonicalStatus: z.enum(["confirmed", "suspected", "retracted"]),
  revision: narrativeSha256Schema,
});

export const narrativeCausalEdgeSchema = z.strictObject({
  causalEdgeId: narrativeIdSchema,
  causeEventId: narrativeIdSchema,
  effectEventId: narrativeIdSchema,
  continuityId: narrativeIdSchema,
  strength: z.enum(["direct", "contributing", "enabling"]),
  evidenceIds: z.array(narrativeIdSchema).min(1).max(100),
});

export const narrativeRelationshipStateSchema = z.strictObject({
  relationshipStateId: narrativeIdSchema,
  sourceCharacterId: narrativeIdSchema,
  targetCharacterId: narrativeIdSchema,
  dimension: z.enum([
    "trust",
    "affection",
    "official_status",
    "political_alignment",
    "family",
    "mentorship",
    "hostility",
  ]),
  value: z.number().min(-1).max(1),
  label: z.string().min(1).max(255),
  validFromChapter: narrativeChapterNumberSchema,
  validToChapter: narrativeChapterNumberSchema.nullable(),
  continuityId: narrativeIdSchema,
  evidenceIds: z.array(narrativeIdSchema).min(1).max(100),
});

export const narrativeRelationshipTransitionSchema = z.strictObject({
  transitionId: narrativeIdSchema,
  beforeStateId: narrativeIdSchema,
  afterStateId: narrativeIdSchema,
  triggerEventIds: z.array(narrativeIdSchema).min(1).max(100),
  validFromChapter: narrativeChapterNumberSchema,
  continuityId: narrativeIdSchema,
  revision: narrativeSha256Schema,
});

export const narrativeKnowledgeStateSchema = z.strictObject({
  knowledgeStateId: narrativeIdSchema,
  characterId: narrativeIdSchema,
  propositionId: narrativeIdSchema,
  state: z.enum([
    "unknown",
    "suspected",
    "believed",
    "known",
    "misinformed",
    "forgotten",
  ]),
  confidence: z.number().min(0).max(1),
  acquiredByEventId: narrativeIdSchema.nullable(),
  validFromChapter: narrativeChapterNumberSchema,
  validToChapter: narrativeChapterNumberSchema.nullable(),
  continuityId: narrativeIdSchema,
  evidenceIds: z.array(narrativeIdSchema).max(100),
  revision: narrativeSha256Schema,
});

export const narrativeTimelineEntrySchema = z.strictObject({
  timelineEntryId: narrativeIdSchema,
  eventId: narrativeIdSchema,
  continuityId: narrativeIdSchema,
  eventTime: z.string().min(1).max(255),
  narrativeChapter: narrativeChapterNumberSchema,
  mode: z.enum([
    "present",
    "flashback",
    "forecast",
    "recording",
    "if_observation",
  ]),
});

export const narrativeForeshadowingSchema = z.strictObject({
  foreshadowId: narrativeIdSchema,
  continuityId: narrativeIdSchema,
  setupEvidenceIds: z.array(narrativeIdSchema).min(1).max(100),
  reminderEvidenceIds: z.array(narrativeIdSchema).max(100),
  payoffEvidenceIds: z.array(narrativeIdSchema).max(100),
  interpretationBefore: narrativeBoundedTextSchema,
  interpretationAfter: narrativeBoundedTextSchema,
  status: z.enum(["open", "resolved", "abandoned"]),
  revision: narrativeSha256Schema,
});

export type NarrativeEvent = z.infer<typeof narrativeEventSchema>;
export type NarrativeCausalEdge = z.infer<typeof narrativeCausalEdgeSchema>;
export type NarrativeRelationshipState = z.infer<
  typeof narrativeRelationshipStateSchema
>;
export type NarrativeRelationshipTransition = z.infer<
  typeof narrativeRelationshipTransitionSchema
>;
export type NarrativeKnowledgeState = z.infer<
  typeof narrativeKnowledgeStateSchema
>;
export type NarrativeTimelineEntry = z.infer<
  typeof narrativeTimelineEntrySchema
>;
export type NarrativeForeshadowing = z.infer<
  typeof narrativeForeshadowingSchema
>;
