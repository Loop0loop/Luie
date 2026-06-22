import { promises as fs } from "fs";
import type { PendingSave } from "./autoSaveTypes.js";
import type { SnapshotJob } from "./autoSaveSnapshotJobs.js";

type LoggerLike = {
  warn: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
};

export async function forgetChapterState(input: {
  projectId: string;
  chapterId: string;
  saveTimers: Map<string, NodeJS.Timeout>;
  pendingSaves: Map<string, PendingSave>;
  lastSaveAt: Map<string, number>;
  firstQueuedAt: Map<string, number>;
  verifiedChapterProjectId: Map<string, string>;
  mirrorPendingPayload: Map<string, PendingSave>;
  lastSnapshotAt: Map<string, number>;
  lastSnapshotHash: Map<string, number>;
  lastSnapshotLength: Map<string, number>;
  lastEmergencySnapshotAt: Map<string, number>;
  snapshotQueue: SnapshotJob[];
  getMirrorBaseDir: (projectId: string, chapterId: string) => string;
  logger: LoggerLike;
}): Promise<SnapshotJob[]> {
  const timer = input.saveTimers.get(input.chapterId);
  if (timer) {
    clearTimeout(timer);
    input.saveTimers.delete(input.chapterId);
  }

  input.pendingSaves.delete(input.chapterId);
  input.lastSaveAt.delete(input.chapterId);
  input.firstQueuedAt.delete(input.chapterId);
  input.verifiedChapterProjectId.delete(input.chapterId);
  input.mirrorPendingPayload.delete(`${input.projectId}:${input.chapterId}`);

  const snapshotKey = `${input.projectId}:${input.chapterId}`;
  input.lastSnapshotAt.delete(snapshotKey);
  input.lastSnapshotHash.delete(snapshotKey);
  input.lastSnapshotLength.delete(snapshotKey);
  input.lastEmergencySnapshotAt.delete(snapshotKey);

  try {
    const baseDir = input.getMirrorBaseDir(input.projectId, input.chapterId);
    await fs.rm(baseDir, { recursive: true, force: true });
  } catch (error) {
    input.logger.warn("Failed to purge chapter mirrors", {
      projectId: input.projectId,
      chapterId: input.chapterId,
      error,
    });
  }

  return input.snapshotQueue.filter(
    (job) =>
      !(job.projectId === input.projectId && job.chapterId === input.chapterId),
  );
}

export function cleanupOldPendingSaves(input: {
  now: number;
  staleThresholdMs: number;
  saveTimers: Map<string, NodeJS.Timeout>;
  pendingSaves: Map<string, PendingSave>;
  lastSaveAt: Map<string, number>;
  firstQueuedAt: Map<string, number>;
  logger: LoggerLike;
}): void {
  for (const [chapterId, pending] of Array.from(input.pendingSaves.entries())) {
    if (input.now - pending.timestamp <= input.staleThresholdMs) continue;

    const timer = input.saveTimers.get(chapterId);
    if (timer) {
      clearTimeout(timer);
    }
    input.saveTimers.delete(chapterId);
    input.pendingSaves.delete(chapterId);
    input.lastSaveAt.delete(chapterId);
    input.firstQueuedAt.delete(chapterId);
    input.logger.info("Cleaned up stale pending save", { chapterId });
  }
}

export function clearProjectState(input: {
  projectId: string;
  configs: Map<string, unknown>;
  verifiedChapterProjectId: Map<string, string>;
  stopAutoSave: (projectId: string) => void;
}): void {
  input.stopAutoSave(input.projectId);
  input.configs.delete(input.projectId);
  for (const [chapterId, knownProjectId] of input.verifiedChapterProjectId) {
    if (knownProjectId === input.projectId) {
      input.verifiedChapterProjectId.delete(chapterId);
    }
  }
}

export function startAutoSaveCleanupInterval(input: {
  intervalMs: number;
  cleanup: () => void;
}): void {
  const cleanupTimer = setInterval(input.cleanup, input.intervalMs);
  if (typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }
}
