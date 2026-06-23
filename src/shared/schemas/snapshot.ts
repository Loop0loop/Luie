import { z } from "zod";
import { basePathSchema, chapterIdSchema, projectIdSchema } from "./common";

export const snapshotCreateSchema = z.object({
  projectId: projectIdSchema,
  chapterId: chapterIdSchema.optional(),
  content: z.string(),
  description: z.string().optional(),
  type: z.enum(["AUTO", "MANUAL"]).optional(),
});

export const snapshotRestoreCandidateSchema = z.object({
  snapshotId: z.string().min(1),
  projectId: z.string().min(1),
  projectTitle: z.string().min(1),
  chapterTitle: z.string().min(1).optional(),
  savedAt: z.string().min(1),
  excerpt: z.string().min(1).optional(),
  filePath: basePathSchema,
});
