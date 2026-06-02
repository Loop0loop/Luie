import {
  SNAPSHOT_INTERVAL_MS,
  SNAPSHOT_MIN_CHANGE_ABSOLUTE,
  SNAPSHOT_MIN_CHANGE_RATIO,
  SNAPSHOT_MIN_CONTENT_LENGTH,
} from "../../../shared/constants/index.js";
import {
  processSnapshotJobs,
  type SnapshotJob,
} from "./autoSaveSnapshotJobs.js";

type LoggerLike = {
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
};

export function hashContent(content: string): number {
  let hash = 0;
  for (let i = 0; i < content.length; i += 1) {
    hash = (hash * 31 + content.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function maybeEnqueueSnapshotJob(input: {
  projectId: string;
  chapterId: string;
  content: string;
  lastSnapshotAt: Map<string, number>;
  lastSnapshotHash: Map<string, number>;
  lastSnapshotLength: Map<string, number>;
  snapshotQueue: SnapshotJob[];
  isSnapshotProcessing: () => boolean;
  setSnapshotProcessing: (processing: boolean) => void;
  writeTimestampedMirror: (
    projectId: string,
    chapterId: string,
    content: string,
  ) => Promise<void>;
  logger: LoggerLike;
}): void {
  const key = `${input.projectId}:${input.chapterId}`;
  const now = Date.now();
  const lastAt = input.lastSnapshotAt.get(key) ?? 0;
  if (now - lastAt < SNAPSHOT_INTERVAL_MS) return;
  if (input.content.length < SNAPSHOT_MIN_CONTENT_LENGTH) return;

  const hash = hashContent(input.content);
  const lastHash = input.lastSnapshotHash.get(key);
  if (lastHash === hash) return;

  const lastLength = input.lastSnapshotLength.get(key) ?? 0;
  if (lastLength > 0) {
    const diff = Math.abs(input.content.length - lastLength);
    const ratio = diff / lastLength;
    if (
      ratio < SNAPSHOT_MIN_CHANGE_RATIO &&
      diff < SNAPSHOT_MIN_CHANGE_ABSOLUTE
    ) {
      return;
    }
  }

  input.lastSnapshotAt.set(key, now);
  input.lastSnapshotHash.set(key, hash);
  input.lastSnapshotLength.set(key, input.content.length);
  input.snapshotQueue.push({
    projectId: input.projectId,
    chapterId: input.chapterId,
    content: input.content,
  });

  if (input.isSnapshotProcessing()) return;
  input.setSnapshotProcessing(true);
  setImmediate(async () => {
    try {
      await processSnapshotJobs({
        jobs: input.snapshotQueue,
        writeTimestampedMirror: input.writeTimestampedMirror,
        logger: input.logger,
      });
    } finally {
      input.setSnapshotProcessing(false);
    }
  });
}
