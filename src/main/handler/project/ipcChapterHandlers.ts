import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type {
  ChapterCreateInput,
  ChapterUpdateInput,
} from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import type { LoggerLike } from "../core/types.js";
import {
  chapterCreateSchema,
  chapterUpdateSchema,
  chapterIdSchema,
  projectIdSchema,
} from "../../../shared/schemas/index.js";
import { z } from "zod";

type ChapterServiceLike = {
  createChapter: (input: ChapterCreateInput) => Promise<unknown>;
  getChapter: (id: string) => Promise<unknown>;
  getAllChapters: (projectId: string) => Promise<unknown>;
  updateChapter: (input: ChapterUpdateInput) => Promise<unknown>;
  deleteChapter: (id: string) => Promise<unknown>;
  reorderChapters: (projectId: string, chapterIds: string[]) => Promise<unknown>;
};

export function registerChapterIPCHandlers(
  logger: LoggerLike,
  chapterService: ChapterServiceLike,
): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.CHAPTER_CREATE,
      logTag: "CHAPTER_CREATE",
      failMessage: "Failed to create chapter",
      argsSchema: z.tuple([chapterCreateSchema]),
      handler: (input: ChapterCreateInput) => chapterService.createChapter(input),
    },
    {
      channel: IPC_CHANNELS.CHAPTER_GET,
      logTag: "CHAPTER_GET",
      failMessage: "Failed to get chapter",
      argsSchema: z.tuple([chapterIdSchema]),
      handler: (id: string) => chapterService.getChapter(id),
    },
    {
      channel: IPC_CHANNELS.CHAPTER_GET_ALL,
      logTag: "CHAPTER_GET_ALL",
      failMessage: "Failed to get all chapters",
      argsSchema: z.tuple([projectIdSchema]),
      handler: (projectId: string) => chapterService.getAllChapters(projectId),
    },
    {
      channel: IPC_CHANNELS.CHAPTER_UPDATE,
      logTag: "CHAPTER_UPDATE",
      failMessage: "Failed to update chapter",
      argsSchema: z.tuple([chapterUpdateSchema]),
      handler: (input: ChapterUpdateInput) => chapterService.updateChapter(input),
    },
    {
      channel: IPC_CHANNELS.CHAPTER_DELETE,
      logTag: "CHAPTER_DELETE",
      failMessage: "Failed to delete chapter",
      argsSchema: z.tuple([chapterIdSchema]),
      handler: (id: string) => chapterService.deleteChapter(id),
    },
    {
      channel: IPC_CHANNELS.CHAPTER_REORDER,
      logTag: "CHAPTER_REORDER",
      failMessage: "Failed to reorder chapters",
      argsSchema: z.tuple([projectIdSchema, z.array(chapterIdSchema)]),
      handler: (projectId: string, chapterIds: string[]) =>
        chapterService.reorderChapters(projectId, chapterIds),
    },
  ]);
}
