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
