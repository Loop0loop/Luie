import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type { SynopsisCreateInput, SynopsisUpdateInput } from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import { projectIdSchema, synopsisCreateSchema, synopsisIdSchema, synopsisUpdateSchema } from "../../../shared/schemas/index.js";
import { z } from "zod";
import type { LoggerLike } from "../core/types.js";

type SynopsisServiceLike = {
  createSynopsis: (input: SynopsisCreateInput) => Promise<unknown>;
  getSynopsis: (id: string) => Promise<unknown>;
  getAllSynopsis: (projectId: string) => Promise<unknown>;
  updateSynopsis: (input: SynopsisUpdateInput) => Promise<unknown>;
  deleteSynopsis: (id: string) => Promise<unknown>;
};

export function registerSynopsisIPCHandlers(
  logger: LoggerLike,
  synopsisService: SynopsisServiceLike,
): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.SYNOPSIS_CREATE,
      logTag: "SYNOPSIS_CREATE",
      failMessage: "Failed to create synopsis",
      argsSchema: z.tuple([synopsisCreateSchema]),
      handler: (input: SynopsisCreateInput) => synopsisService.createSynopsis(input),
    },
    {
      channel: IPC_CHANNELS.SYNOPSIS_GET,
      logTag: "SYNOPSIS_GET",
      failMessage: "Failed to get synopsis",
      argsSchema: z.tuple([synopsisIdSchema]),
      handler: (id: string) => synopsisService.getSynopsis(id),
    },
    {
      channel: IPC_CHANNELS.SYNOPSIS_GET_ALL,
      logTag: "SYNOPSIS_GET_ALL",
      failMessage: "Failed to get synopsis list",
      argsSchema: z.tuple([projectIdSchema]),
      handler: (projectId: string) => synopsisService.getAllSynopsis(projectId),
    },
    {
      channel: IPC_CHANNELS.SYNOPSIS_UPDATE,
      logTag: "SYNOPSIS_UPDATE",
      failMessage: "Failed to update synopsis",
      argsSchema: z.tuple([synopsisUpdateSchema]),
      handler: (input: SynopsisUpdateInput) => synopsisService.updateSynopsis(input),
    },
    {
      channel: IPC_CHANNELS.SYNOPSIS_DELETE,
      logTag: "SYNOPSIS_DELETE",
      failMessage: "Failed to delete synopsis",
      argsSchema: z.tuple([synopsisIdSchema]),
      handler: (id: string) => synopsisService.deleteSynopsis(id),
    },
  ]);
}
