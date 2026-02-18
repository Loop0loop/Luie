import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type {
  TermCreateInput,
  TermUpdateInput,
} from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import {
  termCreateSchema,
  termUpdateSchema,
  termIdSchema,
  projectIdSchema,
} from "../../../shared/schemas/index.js";
import { z } from "zod";
import type { LoggerLike } from "../core/types.js";

type TermServiceLike = {
  createTerm: (input: TermCreateInput) => Promise<unknown>;
  getTerm: (id: string) => Promise<unknown>;
  getAllTerms: (projectId: string) => Promise<unknown>;
  updateTerm: (input: TermUpdateInput) => Promise<unknown>;
  deleteTerm: (id: string) => Promise<unknown>;
};

export function registerTermIPCHandlers(
  logger: LoggerLike,
  termService: TermServiceLike,
): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.TERM_CREATE,
      logTag: "TERM_CREATE",
      failMessage: "Failed to create term",
      argsSchema: z.tuple([termCreateSchema]),
      handler: (input: TermCreateInput) => termService.createTerm(input),
    },
    {
      channel: IPC_CHANNELS.TERM_GET,
      logTag: "TERM_GET",
      failMessage: "Failed to get term",
      argsSchema: z.tuple([termIdSchema]),
      handler: (id: string) => termService.getTerm(id),
    },
    {
      channel: IPC_CHANNELS.TERM_GET_ALL,
      logTag: "TERM_GET_ALL",
      failMessage: "Failed to get all terms",
      argsSchema: z.tuple([projectIdSchema]),
      handler: (projectId: string) => termService.getAllTerms(projectId),
    },
    {
      channel: IPC_CHANNELS.TERM_UPDATE,
      logTag: "TERM_UPDATE",
      failMessage: "Failed to update term",
      argsSchema: z.tuple([termUpdateSchema]),
      handler: (input: TermUpdateInput) => termService.updateTerm(input),
    },
    {
      channel: IPC_CHANNELS.TERM_DELETE,
      logTag: "TERM_DELETE",
      failMessage: "Failed to delete term",
      argsSchema: z.tuple([termIdSchema]),
      handler: (id: string) => termService.deleteTerm(id),
    },
  ]);
}
