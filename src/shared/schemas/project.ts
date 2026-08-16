import { z } from "zod";
import { projectIdSchema } from "./common";

export const projectCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  projectPath: z.string().optional(),
});

export const projectUpdateSchema = z.object({
  id: projectIdSchema,
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  projectPath: z.string().optional(),
});

export const projectDeleteRequestSchema = z.object({
  id: projectIdSchema,
  deleteFile: z.boolean().optional(),
});

export const projectDeleteArgSchema = z.union([
  projectIdSchema,
  projectDeleteRequestSchema,
]);
