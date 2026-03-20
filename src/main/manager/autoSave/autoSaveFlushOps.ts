import { DEFAULT_PROJECT_SNAPSHOT_KEEP_COUNT } from "../../../shared/constants/index.js";

const loadChapterService = async () =>
  (await import("../../services/core/chapterService.js")).chapterService;

const loadSnapshotService = async () =>
  (await import("../../services/features/snapshot/snapshotService.js"))
    .snapshotService;

type LoggerLike = {
  info: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
};

export type PendingSaveEntry = {
  chapterId: string;
  content: string;
  projectId: string;
};

type EnqueueProjectTask = (
  projectId: string,
  task: () => Promise<void>,
) => Promise<void>;

type PerformSave = (chapterId: string) => Promise<void>;

export const createScheduledSnapshot = async (
  projectId: string,
  logger: LoggerLike,
  chapterId?: string,
): Promise<void> => {
  try {
    const snapshotService = await loadSnapshotService();

    const latestSnapshot = chapterId
      ? await snapshotService.getLatestSnapshot(chapterId)
      : null;
    if (latestSnapshot?.createdAt) {
      const latestAt =
        latestSnapshot.createdAt instanceof Date
          ? latestSnapshot.createdAt.getTime()
          : new Date(String(latestSnapshot.createdAt)).getTime();
      if (Number.isFinite(latestAt) && Date.now() - latestAt < 60_000) {
        logger.info("Skipping scheduled snapshot (recent snapshot exists)", {
          projectId,
          chapterId,
        });
        return;
      }
    }

    const [chapterService, snapshotServiceInstance] = await Promise.all([
      loadChapterService(),
      Promise.resolve(snapshotService),
    ]);
    if (chapterId) {
      const chapter = await chapterService.getChapter(chapterId);
      const chapterData = chapter as { id?: unknown; content?: unknown };

      await snapshotServiceInstance.createSnapshot({
        projectId,
        chapterId: String(chapterData.id ?? chapterId),
        content: String(chapterData.content ?? ""),
        description: `자동 스냅샷 ${new Date().toLocaleString()}`,
      });
    } else {
      await snapshotServiceInstance.createSnapshot({
        projectId,
        content: JSON.stringify({ timestamp: Date.now() }),
        description: `프로젝트 스냅샷 ${new Date().toLocaleString()}`,
      });
    }

    await snapshotServiceInstance.deleteOldSnapshots(
      projectId,
      DEFAULT_PROJECT_SNAPSHOT_KEEP_COUNT,
    );
    logger.info("Snapshot created", { projectId, chapterId });
  } catch (error) {
    logger.error("Failed to create snapshot", error);
  }
};

export const flushAllPendingSaves = async (
  pendingSaves: Map<string, PendingSaveEntry>,
  enqueueProjectTask: EnqueueProjectTask,
  performSave: PerformSave,
): Promise<void> => {
  const projectIds = Array.from(
    new Set(Array.from(pendingSaves.values()).map((entry) => entry.projectId)),
  );
  for (const projectId of projectIds) {
    await enqueueProjectTask(projectId, async () => {
      const pending = Array.from(pendingSaves.entries()).filter(
        ([, entry]) => entry.projectId === projectId,
      );
      for (const [chapterId] of pending) {
        await performSave(chapterId);
      }
    });
  }
};

export const flushCriticalPendingSaves = async (
  pending: PendingSaveEntry[],
  writeLatestMirror: (
    projectId: string,
    chapterId: string,
    content: string,
  ) => Promise<void>,
  logger: LoggerLike,
): Promise<{ mirrored: number; snapshots: number }> => {
  if (pending.length === 0) {
    return { mirrored: 0, snapshots: 0 };
  }

  let mirrored = 0;
  let snapshots = 0;
  const snapshotService = await loadSnapshotService();

  for (const entry of pending) {
    try {
      await writeLatestMirror(entry.projectId, entry.chapterId, entry.content);
      mirrored += 1;
    } catch (error) {
      logger.error("Emergency mirror write failed", error);
    }
  }

  for (const entry of pending) {
    try {
      await snapshotService.createSnapshot({
        projectId: entry.projectId,
        chapterId: entry.chapterId,
        content: entry.content,
        description: `긴급 스냅샷 ${new Date().toLocaleString()}`,
      });
      snapshots += 1;
    } catch (error) {
      logger.error("Emergency snapshot failed", error);
    }
  }

  logger.info("Emergency flush completed", { mirrored, snapshots });
  return { mirrored, snapshots };
};
