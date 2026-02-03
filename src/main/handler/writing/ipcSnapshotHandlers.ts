import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type { SnapshotCreateInput } from "../../../shared/types/index.js";
import { registerIpcHandler } from "../core/ipcHandler.js";
import {
  snapshotCreateSchema,
  snapshotIdSchema,
  projectIdSchema,
  chapterIdSchema,
} from "../../../shared/schemas/index.js";
import { z } from "zod";

type LoggerLike = {
  error: (message: string, data?: unknown) => void;
};

type SnapshotServiceLike = {
  createSnapshot: (input: SnapshotCreateInput) => Promise<unknown>;
  getSnapshotsByProject: (projectId: string) => Promise<unknown>;
  getSnapshotsByChapter: (chapterId: string) => Promise<unknown>;
  deleteSnapshot: (id: string) => Promise<unknown>;
  restoreSnapshot: (id: string) => Promise<unknown>;
};

export function registerSnapshotIPCHandlers(
  logger: LoggerLike,
  snapshotService: SnapshotServiceLike,
): void {
  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.SNAPSHOT_CREATE,
    logTag: "SNAPSHOT_CREATE",
    failMessage: "Failed to create snapshot",
    argsSchema: z.tuple([snapshotCreateSchema]),
    handler: (input: SnapshotCreateInput) => snapshotService.createSnapshot(input),
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.SNAPSHOT_GET_BY_PROJECT,
    logTag: "SNAPSHOT_GET_BY_PROJECT",
    failMessage: "Failed to get snapshots by project",
    argsSchema: z.tuple([projectIdSchema]),
    handler: (projectId: string) => snapshotService.getSnapshotsByProject(projectId),
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.SNAPSHOT_GET_ALL,
    logTag: "SNAPSHOT_GET_ALL",
    failMessage: "Failed to get snapshots",
    argsSchema: z.tuple([projectIdSchema]),
    handler: (projectId: string) => snapshotService.getSnapshotsByProject(projectId),
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.SNAPSHOT_GET_BY_CHAPTER,
    logTag: "SNAPSHOT_GET_BY_CHAPTER",
    failMessage: "Failed to get snapshots by chapter",
    argsSchema: z.tuple([chapterIdSchema]),
    handler: (chapterId: string) => snapshotService.getSnapshotsByChapter(chapterId),
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.SNAPSHOT_DELETE,
    logTag: "SNAPSHOT_DELETE",
    failMessage: "Failed to delete snapshot",
    argsSchema: z.tuple([snapshotIdSchema]),
    handler: (id: string) => snapshotService.deleteSnapshot(id),
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.SNAPSHOT_RESTORE,
    logTag: "SNAPSHOT_RESTORE",
    failMessage: "Failed to restore snapshot",
    argsSchema: z.tuple([snapshotIdSchema]),
    handler: (id: string) => snapshotService.restoreSnapshot(id),
  });
}
