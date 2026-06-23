import { z } from "zod";
import { baseContentSchema, chapterIdSchema, projectIdSchema } from "./common";

export const chapterCreateSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  title: z.string().min(1, "Title is required"),
  synopsis: z.string().optional(),
  clientMutationId: z.string().uuid("Invalid client mutation ID").optional(),
});

export const chapterUpdateSchema = z.object({
  id: z.string().uuid("Invalid chapter ID"),
  title: z.string().min(1, "Title is required").optional(),
  content: baseContentSchema.optional(),
  synopsis: z.string().optional(),
});

export const sceneCreateSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  chapterId: z.string().uuid("Invalid chapter ID"),
  title: z.string().min(1, "Title is required"),
  body: baseContentSchema.optional(),
  startOffset: z.number().int().nonnegative().optional(),
  endOffset: z.number().int().nonnegative().optional(),
  order: z.number().int().nonnegative().optional(),
});

export const sceneUpdateSchema = z.object({
  id: z.string().uuid("Invalid scene ID"),
  chapterId: z.string().uuid("Invalid chapter ID").optional(),
  title: z.string().min(1, "Title is required").optional(),
  body: baseContentSchema.optional(),
  startOffset: z.number().int().nonnegative().nullable().optional(),
  endOffset: z.number().int().nonnegative().nullable().optional(),
  order: z.number().int().nonnegative().optional(),
});

export const noteCreateSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  chapterId: z.string().uuid("Invalid chapter ID").optional(),
  title: z.string().min(1, "Title is required"),
  body: baseContentSchema.optional(),
});

export const noteUpdateSchema = z.object({
  id: z.string().uuid("Invalid note ID"),
  chapterId: z.string().uuid("Invalid chapter ID").nullable().optional(),
  title: z.string().min(1, "Title is required").optional(),
  body: baseContentSchema.optional(),
});

export const synopsisCreateSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  chapterId: z.string().uuid("Invalid chapter ID").optional(),
  title: z.string().min(1, "Title is required"),
  body: baseContentSchema.optional(),
});

export const synopsisUpdateSchema = z.object({
  id: z.string().uuid("Invalid synopsis ID"),
  chapterId: z.string().uuid("Invalid chapter ID").nullable().optional(),
  title: z.string().min(1, "Title is required").optional(),
  body: baseContentSchema.optional(),
});

export const plotCreateSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  title: z.string().min(1, "Title is required"),
  body: baseContentSchema.optional(),
});

export const plotUpdateSchema = z.object({
  id: z.string().uuid("Invalid plot ID"),
  title: z.string().min(1, "Title is required").optional(),
  body: baseContentSchema.optional(),
});

export const scrapMemoCreateSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  title: z.string().min(1, "Title is required"),
  content: baseContentSchema,
  tags: z.array(z.string()).max(50).optional(),
});

export const scrapMemoUpdateSchema = z.object({
  id: z.string().uuid("Invalid scrap memo ID"),
  title: z.string().min(1, "Title is required").optional(),
  content: baseContentSchema.optional(),
  tags: z.array(z.string()).max(50).optional(),
});
export const autoSaveArgsSchema = z.tuple([
  chapterIdSchema,
  baseContentSchema,
  projectIdSchema,
]);
