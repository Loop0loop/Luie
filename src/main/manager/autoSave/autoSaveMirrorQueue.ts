import type { PendingSave } from "./autoSaveTypes.js";

type LoggerLike = {
  warn: (message: string, data?: unknown) => void;
};

export function queueLatestMirrorWrite(input: {
  pending: PendingSave;
  mirrorPendingPayload: Map<string, PendingSave>;
  mirrorWriteQueue: Map<string, Promise<void>>;
  writeLatestMirror: (
    projectId: string,
    chapterId: string,
    content: string,
  ) => Promise<void>;
  logger: LoggerLike;
}): void {
  const key = `${input.pending.projectId}:${input.pending.chapterId}`;
  input.mirrorPendingPayload.set(key, input.pending);
  if (input.mirrorWriteQueue.has(key)) {
    return;
  }

  const worker = (async () => {
    while (true) {
      const next = input.mirrorPendingPayload.get(key);
      if (!next) break;
      input.mirrorPendingPayload.delete(key);
      await input.writeLatestMirror(next.projectId, next.chapterId, next.content);
    }
  })()
    .catch((error) => {
      input.logger.warn("Mirror write queue processing failed", {
        key,
        error,
      });
    })
    .finally(() => {
      input.mirrorWriteQueue.delete(key);
      const pendingNext = input.mirrorPendingPayload.get(key);
      if (pendingNext) {
        queueLatestMirrorWrite({ ...input, pending: pendingNext });
      }
    });

  input.mirrorWriteQueue.set(key, worker);
}
