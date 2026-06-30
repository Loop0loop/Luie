import { z } from "zod";
import {
  baseContentSchema,
  chapterIdSchema,
  noteIdSchema,
  plotIdSchema,
  projectIdSchema,
  sceneIdSchema,
  scrapMemoIdSchema,
  synopsisIdSchema,
} from "./common";

export const chapterCreateSchema = z.object({
  projectId: projectIdSchema,
  title: z.string().min(1, "Title is required"),
  synopsis: z.string().optional(),
  clientMutationId: z.string().uuid("Invalid client mutation ID").optional(),
});

export const chapterUpdateSchema = z.object({
  id: chapterIdSchema,
  title: z.string().min(1, "Title is required").optional(),
  content: baseContentSchema.optional(),
  synopsis: z.string().optional(),
});

export const sceneCreateSchema = z.object({
  projectId: projectIdSchema,
  chapterId: chapterIdSchema,
  title: z.string().min(1, "Title is required"),
  body: baseContentSchema.optional(),
  startOffset: z.number().int().nonnegative().optional(),
  endOffset: z.number().int().nonnegative().optional(),
  order: z.number().int().nonnegative().optional(),
});

export const sceneUpdateSchema = z.object({
  id: sceneIdSchema,
  chapterId: chapterIdSchema.optional(),
  title: z.string().min(1, "Title is required").optional(),
  body: baseContentSchema.optional(),
  startOffset: z.number().int().nonnegative().nullable().optional(),
  endOffset: z.number().int().nonnegative().nullable().optional(),
  order: z.number().int().nonnegative().optional(),
});

export const noteCreateSchema = z.object({
  projectId: projectIdSchema,
  chapterId: chapterIdSchema.optional(),
  title: z.string().min(1, "Title is required"),
  body: baseContentSchema.optional(),
});

export const noteUpdateSchema = z.object({
  id: noteIdSchema,
  chapterId: chapterIdSchema.nullable().optional(),
  title: z.string().min(1, "Title is required").optional(),
  body: baseContentSchema.optional(),
});

export const synopsisCreateSchema = z.object({
  projectId: projectIdSchema,
  chapterId: chapterIdSchema.optional(),
  title: z.string().min(1, "Title is required"),
  body: baseContentSchema.optional(),
});

export const synopsisUpdateSchema = z.object({
  id: synopsisIdSchema,
  chapterId: chapterIdSchema.nullable().optional(),
  title: z.string().min(1, "Title is required").optional(),
  body: baseContentSchema.optional(),
});

export const plotCreateSchema = z.object({
  projectId: projectIdSchema,
  title: z.string().min(1, "Title is required"),
  body: baseContentSchema.optional(),
});

export const plotUpdateSchema = z.object({
  id: plotIdSchema,
  title: z.string().min(1, "Title is required").optional(),
  body: baseContentSchema.optional(),
});

export const scrapMemoCreateSchema = z.object({
  projectId: projectIdSchema,
  title: z.string().min(1, "Title is required"),
  content: baseContentSchema,
  tags: z.array(z.string()).max(50).optional(),
});

export const scrapMemoUpdateSchema = z.object({
  id: scrapMemoIdSchema,
  title: z.string().min(1, "Title is required").optional(),
  content: baseContentSchema.optional(),
  tags: z.array(z.string()).max(50).optional(),
});
export const autoSaveArgsSchema = z.tuple([
  chapterIdSchema,
  baseContentSchema,
  projectIdSchema,
]);
