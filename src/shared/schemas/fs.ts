import { z } from "zod";
import { PATH_MAX_LENGTH, TITLE_MAX_LENGTH, baseContentSchema, basePathSchema, dialogOptionsSchema } from "./common";
import { chapterIdSchema } from "./common";

export const fsSelectDialogArgsSchema = z.tuple([
  dialogOptionsSchema.optional(),
]);
export const fsSaveProjectArgsSchema = z.tuple([
  z.string().min(1).max(TITLE_MAX_LENGTH),
  basePathSchema,
  baseContentSchema,
]);
export const fsReadFileArgsSchema = z.tuple([basePathSchema]);
export const fsReadLuieEntryArgsSchema = z.tuple([
  basePathSchema,
  z.string().min(1).max(PATH_MAX_LENGTH),
]);
export const fsWriteFileArgsSchema = z.tuple([
  basePathSchema,
  baseContentSchema,
]);
export const fsCreateLuiePackageArgsSchema = z.tuple([
  basePathSchema,
  z.unknown(),
]);
export const fsWriteProjectFileArgsSchema = z.tuple([
  basePathSchema,
  z.string().min(1).max(PATH_MAX_LENGTH),
  baseContentSchema,
]);
export const fsApproveProjectPathArgsSchema = z.tuple([basePathSchema]);

export const windowSetFullscreenArgsSchema = z.tuple([z.boolean()]);
export const windowOpenExportArgsSchema = z.tuple([chapterIdSchema]);
