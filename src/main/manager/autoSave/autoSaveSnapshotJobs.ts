import { snapshotService } from "../../services/features/snapshot/snapshotService.js";
import { SNAPSHOT_KEEP_COUNT } from "../../../shared/constants/index.js";

export type SnapshotJob = {
  projectId: string;
  chapterId: string;
  content: string;
};

type LoggerLike = {
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
};

export const maybeCreateEmergencySnapshot = async (input: {
  projectId: string;
  chapterId: string;
  content: string;
  maxLength: number;
  minIntervalMs: number;
  lastSnapshotAtByChapterKey: Map<string, number>;
  writeTimestampedMirror: (
    projectId: string,
    chapterId: string,
    content: string,
  ) => Promise<void>;
  logger: LoggerLike;
}): Promise<void> => {
  const {
    projectId,
    chapterId,
    content,
    maxLength,
    minIntervalMs,
    lastSnapshotAtByChapterKey,
    writeTimestampedMirror,
    logger,
  } = input;

  if (content.length > maxLength) return;

  const key = `${projectId}:${chapterId}`;
  const now = Date.now();
  const lastAt = lastSnapshotAtByChapterKey.get(key) ?? 0;
  if (now - lastAt < minIntervalMs) return;

  lastSnapshotAtByChapterKey.set(key, now);

  try {
    await snapshotService.createSnapshot({
      projectId,
      chapterId,
      content,
      description: `긴급 마이크로 스냅샷 ${new Date().toLocaleString()}`,
    });
    await writeTimestampedMirror(projectId, chapterId, content);
  } catch (error) {
    logger.warn("Failed to create emergency micro snapshot", { error, chapterId });
  }
};

export const processSnapshotJobs = async (input: {
  jobs: SnapshotJob[];
  writeTimestampedMirror: (
    projectId: string,
    chapterId: string,
    content: string,
  ) => Promise<void>;
  logger: LoggerLike;
}): Promise<void> => {
  const { jobs, writeTimestampedMirror, logger } = input;
  while (jobs.length > 0) {
    const job = jobs.shift();
    if (!job) continue;

    try {
      await snapshotService.createSnapshot({
        projectId: job.projectId,
        chapterId: job.chapterId,
        content: job.content,
        description: `자동 스냅샷 ${new Date().toLocaleString()}`,
      });
      await snapshotService.deleteOldSnapshots(job.projectId, SNAPSHOT_KEEP_COUNT);
      await writeTimestampedMirror(job.projectId, job.chapterId, job.content);
    } catch (error) {
      logger.error("Failed to create snapshot", error);
    }
  }
};

