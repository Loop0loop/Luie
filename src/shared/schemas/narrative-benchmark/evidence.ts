import { z } from "zod";
import {
  narrativeBoundedTextSchema,
  narrativeChapterNumberSchema,
  narrativeIdSchema,
  narrativeSha256Schema,
} from "./common";

export const narrativeChapterPlanSchema = z.strictObject({
  chapterId: narrativeIdSchema,
  chapterNumber: narrativeChapterNumberSchema,
  title: z.string().min(1).max(255),
  continuityId: narrativeIdSchema,
  eventIds: z.array(narrativeIdSchema).min(1).max(100),
  cliffhanger: narrativeBoundedTextSchema.nullable(),
  sourceId: narrativeIdSchema,
});

export const narrativeSceneSchema = z.strictObject({
  sceneId: narrativeIdSchema,
  chapterId: narrativeIdSchema,
  sceneOrder: z.number().int().positive(),
  continuityId: narrativeIdSchema,
  eventIds: z.array(narrativeIdSchema).min(1).max(100),
  participantIds: z.array(narrativeIdSchema).min(1).max(100),
  locationId: narrativeIdSchema.nullable(),
});

export const narrativeEvidenceSchema = z.strictObject({
  evidenceId: narrativeIdSchema,
  sourceId: narrativeIdSchema,
  chapterId: narrativeIdSchema,
  sceneId: narrativeIdSchema,
  continuityId: narrativeIdSchema,
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().positive(),
  quote: narrativeBoundedTextSchema,
  sourceSha256: narrativeSha256Schema,
});

export const narrativeSourceDocumentSchema = z.strictObject({
  sourceId: narrativeIdSchema,
  chapterId: narrativeIdSchema,
  content: z.string().max(10_000_000),
  sha256: narrativeSha256Schema,
});

export type NarrativeChapterPlan = z.infer<typeof narrativeChapterPlanSchema>;
export type NarrativeScene = z.infer<typeof narrativeSceneSchema>;
export type NarrativeEvidence = z.infer<typeof narrativeEvidenceSchema>;
export type NarrativeSourceDocument = z.infer<
  typeof narrativeSourceDocumentSchema
>;
