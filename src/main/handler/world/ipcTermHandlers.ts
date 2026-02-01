import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type {
  TermAppearanceInput,
  TermCreateInput,
  TermUpdateInput,
} from "../../../shared/types/index.js";
import { registerIpcHandler } from "../core/ipcHandler.js";
import {
  termCreateSchema,
  termUpdateSchema,
  termIdSchema,
  projectIdSchema,
  chapterIdSchema,
  termAppearanceSchema,
} from "../../../shared/schemas/index.js";
import { z } from "zod";

type LoggerLike = {
  error: (message: string, data?: unknown) => void;
};

type TermServiceLike = {
  createTerm: (input: TermCreateInput) => Promise<unknown>;
  getTerm: (id: string) => Promise<unknown>;
  getAllTerms: (projectId: string) => Promise<unknown>;
  updateTerm: (input: TermUpdateInput) => Promise<unknown>;
  deleteTerm: (id: string) => Promise<unknown>;
  recordAppearance: (input: TermAppearanceInput) => Promise<unknown>;
  getAppearancesByChapter: (chapterId: string) => Promise<unknown>;
};

export function registerTermIPCHandlers(
  logger: LoggerLike,
  termService: TermServiceLike,
): void {
  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.TERM_CREATE,
    logTag: "TERM_CREATE",
    failMessage: "Failed to create term",
    argsSchema: z.tuple([termCreateSchema]),
    handler: (input: TermCreateInput) => termService.createTerm(input),
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.TERM_GET,
    logTag: "TERM_GET",
    failMessage: "Failed to get term",
    argsSchema: z.tuple([termIdSchema]),
    handler: (id: string) => termService.getTerm(id),
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.TERM_GET_ALL,
    logTag: "TERM_GET_ALL",
    failMessage: "Failed to get all terms",
    argsSchema: z.tuple([projectIdSchema]),
    handler: (projectId: string) => termService.getAllTerms(projectId),
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.TERM_UPDATE,
    logTag: "TERM_UPDATE",
    failMessage: "Failed to update term",
    argsSchema: z.tuple([termUpdateSchema]),
    handler: (input: TermUpdateInput) => termService.updateTerm(input),
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.TERM_DELETE,
    logTag: "TERM_DELETE",
    failMessage: "Failed to delete term",
    argsSchema: z.tuple([termIdSchema]),
    handler: (id: string) => termService.deleteTerm(id),
  });

  registerIpcHandler({
    logger,
    channel: "term:record-appearance",
    logTag: "TERM_RECORD_APPEARANCE",
    failMessage: "Failed to record term appearance",
    argsSchema: z.tuple([termAppearanceSchema]),
    handler: (input: TermAppearanceInput) => termService.recordAppearance(input),
  });

  registerIpcHandler({
    logger,
    channel: "term:get-appearances",
    logTag: "TERM_GET_APPEARANCES",
    failMessage: "Failed to get term appearances",
    argsSchema: z.tuple([chapterIdSchema]),
    handler: (chapterId: string) => termService.getAppearancesByChapter(chapterId),
  });
}
