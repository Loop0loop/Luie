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

export const projectDeleteRequestSchema = z.object({
  id: z.string().uuid("Invalid project ID"),
  deleteFile: z.boolean().optional(),
});

export const projectDeleteArgSchema = z.union([
  z.string().uuid("Invalid project ID"),
  projectDeleteRequestSchema,
]);
