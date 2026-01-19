import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type {
  ChapterCreateInput,
  ChapterUpdateInput,
} from "../../../shared/types/index.js";
import { registerIpcHandler } from "../core/ipcHandler.js";

type LoggerLike = {
  error: (message: string, data?: unknown) => void;
};

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
  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.CHAPTER_CREATE,
    logTag: "CHAPTER_CREATE",
    failMessage: "Failed to create chapter",
    handler: (input: ChapterCreateInput) => chapterService.createChapter(input),
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.CHAPTER_GET,
    logTag: "CHAPTER_GET",
    failMessage: "Failed to get chapter",
    handler: (id: string) => chapterService.getChapter(id),
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.CHAPTER_GET_ALL,
    logTag: "CHAPTER_GET_ALL",
    failMessage: "Failed to get all chapters",
    handler: (projectId: string) => chapterService.getAllChapters(projectId),
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.CHAPTER_UPDATE,
    logTag: "CHAPTER_UPDATE",
    failMessage: "Failed to update chapter",
    handler: (input: ChapterUpdateInput) => chapterService.updateChapter(input),
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.CHAPTER_DELETE,
    logTag: "CHAPTER_DELETE",
    failMessage: "Failed to delete chapter",
    handler: (id: string) => chapterService.deleteChapter(id),
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.CHAPTER_REORDER,
    logTag: "CHAPTER_REORDER",
    failMessage: "Failed to reorder chapters",
    handler: (projectId: string, chapterIds: string[]) =>
      chapterService.reorderChapters(projectId, chapterIds),
  });
}
