import { ErrorCode } from "../../../shared/constants/index.js";
import { isServiceError } from "../../utils/serviceError.js";
import type {
  AutoSaveRuntimeCounters,
  PendingSave,
} from "./autoSaveTypes.js";

type ChapterServiceLike = {
  updateChapter: (input: { id: string; content: string }) => Promise<unknown>;
};

type LoggerLike = {
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
};

const recordSaveDuration = (
  stats: AutoSaveRuntimeCounters,
  saveStartedAt: number,
): void => {
  const durationMs = Math.max(0, Date.now() - saveStartedAt);
  stats.lastSaveDurationMs = durationMs;
  stats.saveDurationTotalMs += durationMs;
  stats.saveDurationSamples += 1;
};

export async function performAutoSave(input: {
  chapterId: string;
  pendingSaves: Map<string, PendingSave>;
  saveTimers: Map<string, NodeJS.Timeout>;
  lastSaveAt: Map<string, number>;
  firstQueuedAt: Map<string, number>;
  stats: AutoSaveRuntimeCounters;
  loadChapterService: () => Promise<ChapterServiceLike>;
  queueMirrorWrite: (pending: PendingSave) => void;
  maybeEnqueueSnapshot: (
    projectId: string,
    chapterId: string,
    content: string,
  ) => void;
  writeValidationBlockedSafetySnapshot: (pending: PendingSave) => Promise<void>;
  emitSaved: (chapterId: string) => void;
  emitSaveBlocked: (chapterId: string, error: unknown) => void;
  emitError: (chapterId: string, error: unknown) => void;
  canEmitError: () => boolean;
  logger: LoggerLike;
}): Promise<void> {
  const pending = input.pendingSaves.get(input.chapterId);
  if (!pending) return;

  const saveStartedAt = Date.now();
  input.stats.saveStarted += 1;
  const queuedAt = input.firstQueuedAt.get(input.chapterId);
  if (queuedAt) {
    const queueDelayMs = Math.max(0, saveStartedAt - queuedAt);
    input.stats.lastQueueDelayMs = queueDelayMs;
    input.stats.queueDelayTotalMs += queueDelayMs;
    input.stats.queueDelaySamples += 1;
  }

  try {
    const chapterService = await input.loadChapterService();
    await chapterService.updateChapter({
      id: pending.chapterId,
      content: pending.content,
    });

    input.pendingSaves.delete(input.chapterId);
    input.saveTimers.delete(input.chapterId);
    input.lastSaveAt.delete(input.chapterId);
    input.firstQueuedAt.delete(input.chapterId);
    input.emitSaved(input.chapterId);
    input.queueMirrorWrite(pending);
    input.maybeEnqueueSnapshot(
      pending.projectId,
      pending.chapterId,
      pending.content,
    );

    input.logger.info("Auto-save completed", { chapterId: input.chapterId });
    input.stats.saveSucceeded += 1;
    recordSaveDuration(input.stats, saveStartedAt);
  } catch (error) {
    if (isServiceError(error) && error.code === ErrorCode.VALIDATION_FAILED) {
      input.stats.validationBlocked += 1;
      input.logger.warn(
        "Auto-save blocked by validation; writing safety snapshot",
        {
          chapterId: input.chapterId,
          error,
        },
      );

      await input.writeValidationBlockedSafetySnapshot(pending);
      input.pendingSaves.delete(input.chapterId);
      input.saveTimers.delete(input.chapterId);
      input.lastSaveAt.delete(input.chapterId);
      input.firstQueuedAt.delete(input.chapterId);
      input.emitSaveBlocked(input.chapterId, error);
      input.stats.saveFailed += 1;
      recordSaveDuration(input.stats, saveStartedAt);
      return;
    }

    input.stats.saveFailed += 1;
    recordSaveDuration(input.stats, saveStartedAt);
    input.logger.error("Auto-save failed", error);
    if (input.canEmitError()) {
      input.emitError(input.chapterId, error);
    }
  }
}
