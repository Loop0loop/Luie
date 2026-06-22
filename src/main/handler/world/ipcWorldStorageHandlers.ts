import { z } from "zod";
import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import {
  projectIdSchema,
  worldReplicaDocumentGetSchema,
  worldReplicaDocumentSetSchema,
  worldReplicaScrapMemosSetSchema,
} from "../../../shared/schemas/index.js";
import type {
  ReplicaWorldDocumentType,
  WorldScrapMemosData,
} from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import type { LoggerLike } from "../core/types.js";

type WorldReplicaServiceLike = {
  getDocument: (input: {
    projectId: string;
    docType: ReplicaWorldDocumentType;
  }) => Promise<unknown>;
  setDocument: (input: {
    projectId: string;
    docType: ReplicaWorldDocumentType;
    payload: unknown;
  }) => Promise<unknown>;
  getScrapMemos: (projectId: string) => Promise<unknown>;
  setScrapMemos: (input: {
    projectId: string;
    data: WorldScrapMemosData;
  }) => Promise<void>;
};

export function registerWorldStorageIPCHandlers(
  logger: LoggerLike,
  worldReplicaService: WorldReplicaServiceLike,
): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.WORLD_STORAGE_GET_DOCUMENT,
      logTag: "WORLD_STORAGE_GET_DOCUMENT",
      failMessage: "Failed to get world replica document",
      argsSchema: z.tuple([worldReplicaDocumentGetSchema]),
      handler: (input: {
        projectId: string;
        docType: ReplicaWorldDocumentType;
      }) => worldReplicaService.getDocument(input),
    },
    {
      channel: IPC_CHANNELS.WORLD_STORAGE_SET_DOCUMENT,
      logTag: "WORLD_STORAGE_SET_DOCUMENT",
      failMessage: "Failed to save world replica document",
      argsSchema: z.tuple([worldReplicaDocumentSetSchema]),
      handler: (input: {
        projectId: string;
        docType: ReplicaWorldDocumentType;
        payload: unknown;
      }) => worldReplicaService.setDocument(input),
    },
    {
      channel: IPC_CHANNELS.WORLD_STORAGE_GET_SCRAP_MEMOS,
      logTag: "WORLD_STORAGE_GET_SCRAP_MEMOS",
      failMessage: "Failed to get world replica scrap memos",
      argsSchema: z.tuple([projectIdSchema]),
      handler: (projectId: string) => worldReplicaService.getScrapMemos(projectId),
    },
    {
      channel: IPC_CHANNELS.WORLD_STORAGE_SET_SCRAP_MEMOS,
      logTag: "WORLD_STORAGE_SET_SCRAP_MEMOS",
      failMessage: "Failed to save world replica scrap memos",
      argsSchema: z.tuple([worldReplicaScrapMemosSetSchema]),
      handler: (input: {
        projectId: string;
        data: WorldScrapMemosData;
      }) => worldReplicaService.setScrapMemos(input),
    },
  ]);
}
