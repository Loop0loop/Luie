import { z } from "zod";
import { TITLE_MAX_LENGTH, baseContentSchema, chapterIdSchema, projectIdSchema } from "./common";

export const exportRequestSchema = z.object({
  projectId: projectIdSchema,
  chapterId: chapterIdSchema,
  title: z.string().min(1).max(TITLE_MAX_LENGTH),
  content: baseContentSchema.min(1),
  format: z.enum(["DOCX", "HWPX"]),
  paperSize: z.enum(["A4", "Letter", "B5"]).optional(),
  marginTop: z.number().nonnegative().max(100).optional(),
  marginBottom: z.number().nonnegative().max(100).optional(),
  marginLeft: z.number().nonnegative().max(100).optional(),
  marginRight: z.number().nonnegative().max(100).optional(),
  fontFamily: z.string().min(1).max(100).optional(),
  fontSize: z.number().positive().max(96).optional(),
  lineHeight: z.string().min(1).max(20).optional(),
  normalizeLineSpacing: z.boolean().optional(),
  showPageNumbers: z.boolean().optional(),
  startPageNumber: z.number().int().min(1).max(100_000).optional(),
});

export const exportCreateArgsSchema = z.tuple([exportRequestSchema]);
