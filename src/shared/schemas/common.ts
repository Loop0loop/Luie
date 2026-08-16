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

const entityIdSchema = (label: string) =>
  z.string().min(1, `${label} is required`).max(256, `${label} is too long`);

export const projectIdSchema = entityIdSchema("Project ID");
export const chapterIdSchema = entityIdSchema("Chapter ID");
export const characterIdSchema = entityIdSchema("Character ID");
export const eventIdSchema = entityIdSchema("Event ID");
export const factionIdSchema = entityIdSchema("Faction ID");
export const termIdSchema = entityIdSchema("Term ID");
export const sceneIdSchema = entityIdSchema("Scene ID");
export const noteIdSchema = entityIdSchema("Note ID");
export const synopsisIdSchema = entityIdSchema("Synopsis ID");
export const plotIdSchema = entityIdSchema("Plot ID");
export const scrapMemoIdSchema = entityIdSchema("Scrap memo ID");
export const snapshotIdSchema = entityIdSchema("Snapshot ID");
