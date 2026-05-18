import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type { ScrapMemoCreateInput, ScrapMemoUpdateInput } from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import { projectIdSchema, scrapMemoCreateSchema, scrapMemoIdSchema, scrapMemoUpdateSchema } from "../../../shared/schemas/index.js";
import { z } from "zod";
import type { LoggerLike } from "../core/types.js";

type ScrapMemoServiceLike = {
  createScrapMemo: (input: ScrapMemoCreateInput) => Promise<unknown>;
  getAllScrapMemos: (projectId: string) => Promise<unknown>;
  updateScrapMemo: (input: ScrapMemoUpdateInput) => Promise<unknown>;
  deleteScrapMemo: (id: string) => Promise<unknown>;
};

export function registerScrapMemoIPCHandlers(
  logger: LoggerLike,
  scrapMemoService: ScrapMemoServiceLike,
): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.SCRAP_MEMO_CREATE,
      logTag: "SCRAP_MEMO_CREATE",
      failMessage: "Failed to create scrap memo",
      argsSchema: z.tuple([scrapMemoCreateSchema]),
      handler: (input: ScrapMemoCreateInput) => scrapMemoService.createScrapMemo(input),
    },
    {
      channel: IPC_CHANNELS.SCRAP_MEMO_GET_ALL,
      logTag: "SCRAP_MEMO_GET_ALL",
      failMessage: "Failed to get scrap memos",
      argsSchema: z.tuple([projectIdSchema]),
      handler: (projectId: string) => scrapMemoService.getAllScrapMemos(projectId),
    },
    {
      channel: IPC_CHANNELS.SCRAP_MEMO_UPDATE,
      logTag: "SCRAP_MEMO_UPDATE",
      failMessage: "Failed to update scrap memo",
      argsSchema: z.tuple([scrapMemoUpdateSchema]),
      handler: (input: ScrapMemoUpdateInput) => scrapMemoService.updateScrapMemo(input),
    },
    {
      channel: IPC_CHANNELS.SCRAP_MEMO_DELETE,
      logTag: "SCRAP_MEMO_DELETE",
      failMessage: "Failed to delete scrap memo",
      argsSchema: z.tuple([scrapMemoIdSchema]),
      handler: (id: string) => scrapMemoService.deleteScrapMemo(id),
    },
  ]);
}
