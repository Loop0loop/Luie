import { z } from "zod";

export const projectCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  projectPath: z.string().optional(),
});

export const projectUpdateSchema = z.object({
  id: z.string().uuid("Invalid project ID"),
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  projectPath: z.string().optional(),
});

export const chapterCreateSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  title: z.string().min(1, "Title is required"),
  synopsis: z.string().optional(),
});

export const chapterUpdateSchema = z.object({
  id: z.string().uuid("Invalid chapter ID"),
  title: z.string().min(1, "Title is required").optional(),
  content: z.string().optional(),
  synopsis: z.string().optional(),
});

export const characterCreateSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  firstAppearance: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const characterUpdateSchema = z.object({
  id: z.string().uuid("Invalid character ID"),
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  firstAppearance: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const termCreateSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  term: z.string().min(1, "Term is required"),
  definition: z.string().optional(),
  category: z.string().optional(),
  firstAppearance: z.string().optional(),
});

export const termUpdateSchema = z.object({
  id: z.string().uuid("Invalid term ID"),
  term: z.string().min(1, "Term is required").optional(),
  definition: z.string().optional(),
  category: z.string().optional(),
  firstAppearance: z.string().optional(),
});

export const projectIdSchema = z.string().uuid("Invalid project ID");
export const chapterIdSchema = z.string().uuid("Invalid chapter ID");
export const characterIdSchema = z.string().uuid("Invalid character ID");
export const termIdSchema = z.string().uuid("Invalid term ID");
export const snapshotIdSchema = z.string().uuid("Invalid snapshot ID");

export const autoSaveArgsSchema = z.tuple([
  chapterIdSchema,
  z.string(),
  projectIdSchema,
]);

export const characterAppearanceSchema = z.object({
  characterId: characterIdSchema,
  chapterId: chapterIdSchema,
  position: z.number().int().nonnegative(),
  context: z.string().optional(),
});

export const termAppearanceSchema = z.object({
  termId: termIdSchema,
  chapterId: chapterIdSchema,
  position: z.number().int().nonnegative(),
  context: z.string().optional(),
});

export const snapshotCreateSchema = z.object({
  projectId: projectIdSchema,
  chapterId: chapterIdSchema.optional(),
  content: z.string(),
  description: z.string().optional(),
  type: z.enum(["AUTO", "MANUAL"]).optional(),
});

export const searchQuerySchema = z.object({
  projectId: projectIdSchema,
  query: z.string().min(1, "Query is required"),
  type: z.enum(["all", "character", "term"]).optional(),
});

export const editorSettingsSchema = z.object({
  fontFamily: z.enum(["serif", "sans", "mono"]),
  fontPreset: z
    .enum([
      "default",
      "lora",
      "bitter",
      "source-serif",
      "montserrat",
      "nunito-sans",
      "victor-mono",
    ])
    .optional(),
  fontSize: z.number().int().positive(),
  lineHeight: z.number().positive(),
  maxWidth: z.number().int().positive(),
  theme: z.enum(["light", "dark", "sepia"]),
});

export const settingsAutoSaveSchema = z.object({
  enabled: z.boolean().optional(),
  interval: z.number().int().positive().optional(),
});

export const windowBoundsSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  x: z.number().int(),
  y: z.number().int(),
});
