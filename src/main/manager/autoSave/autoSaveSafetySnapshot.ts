import type { PendingSave } from "./autoSaveTypes.js";

type SnapshotServiceLike = {
  createSnapshot: (input: {
    projectId: string;
    chapterId: string;
    content: string;
    description: string;
  }) => Promise<unknown>;
};

type LoggerLike = {
  error: (message: string, data?: unknown) => void;
};

export async function writeValidationBlockedSafetySnapshot(input: {
  pending: PendingSave;
  loadSnapshotService: () => Promise<SnapshotServiceLike>;
  writeLatestMirror: (
    projectId: string,
    chapterId: string,
    content: string,
  ) => Promise<void>;
  writeTimestampedMirror: (
    projectId: string,
    chapterId: string,
    content: string,
  ) => Promise<void>;
  logger: LoggerLike;
}): Promise<void> {
  try {
    const snapshotService = await input.loadSnapshotService();
    await input.writeLatestMirror(
      input.pending.projectId,
      input.pending.chapterId,
      input.pending.content,
    );
    await input.writeTimestampedMirror(
      input.pending.projectId,
      input.pending.chapterId,
      input.pending.content,
    );
    await snapshotService.createSnapshot({
      projectId: input.pending.projectId,
      chapterId: input.pending.chapterId,
      content: input.pending.content,
      description: `Safety snapshot (블로킹된 저장) ${new Date().toLocaleString()}`,
    });
  } catch (error) {
    input.logger.error(
      "Failed to write safety snapshot after validation block",
      error,
    );
  }
}
