import { z } from "zod";

export const PATH_MAX_LENGTH = 4096;
export const TITLE_MAX_LENGTH = 255;
export const LARGE_TEXT_MAX_LENGTH = 10_000_000;

export const basePathSchema = z
  .string()
  .min(1, "Path is required")
  .max(PATH_MAX_LENGTH, "Path is too long")
  .refine((value) => !value.includes("\0"), "Path must not contain null bytes");

export const baseContentSchema = z
  .string()
  .max(LARGE_TEXT_MAX_LENGTH, "Content is too large");

const dialogFilterSchema = z.strictObject({
  name: z.string().min(1).max(100),
  extensions: z.array(z.string().min(1).max(20)).max(20),
});

export const dialogOptionsSchema = z.strictObject({
  filters: z.array(dialogFilterSchema).max(20).optional(),
  defaultPath: basePathSchema.optional(),
  title: z.string().min(1).max(200).optional(),
});

export const projectIdSchema = z.string().uuid("Invalid project ID");
export const chapterIdSchema = z.string().uuid("Invalid chapter ID");
export const characterIdSchema = z.string().uuid("Invalid character ID");
export const eventIdSchema = z.string().uuid("Invalid event ID");
export const factionIdSchema = z.string().uuid("Invalid faction ID");
export const termIdSchema = z.string().uuid("Invalid term ID");
export const sceneIdSchema = z.string().uuid("Invalid scene ID");
export const noteIdSchema = z.string().uuid("Invalid note ID");
export const synopsisIdSchema = z.string().uuid("Invalid synopsis ID");
export const plotIdSchema = z.string().uuid("Invalid plot ID");
export const scrapMemoIdSchema = z.string().uuid("Invalid scrap memo ID");
export const snapshotIdSchema = z.string().uuid("Invalid snapshot ID");
