import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../../database/index.js";
import { project, snapshot } from "../../../database/schema.js";
import {
  ErrorCode,
  DEFAULT_PROJECT_SNAPSHOT_KEEP_COUNT,
} from "../../../../shared/constants/index.js";
import { ServiceError } from "../../../utils/serviceError.js";

type LoggerLike = {
  info: (message: string, context?: unknown) => void;
  error: (message: string, context?: unknown) => void;
};

type RetentionHooks = {
  queueOrphanArtifactCleanup: (snapshotId: string) => void;
  ensureImmediatePackageExport: (input: {
    projectId: string;
    reason: "snapshot:delete-old" | "snapshot:prune";
  }) => Promise<void>;
  logger: LoggerLike;
};

export const deleteOldSnapshotRecords = async (
  projectId: string,
  keepCount: number = DEFAULT_PROJECT_SNAPSHOT_KEEP_COUNT,
  hooks: RetentionHooks,
) => {
  try {
    const allSnapshots = await db.getClient()
      .select()
      .from(snapshot)
      .where(eq(snapshot.projectId, projectId))
      .orderBy(desc(snapshot.createdAt));

    if (allSnapshots.length <= keepCount) {
      return { success: true, deletedCount: 0 };
    }

    const toDelete = allSnapshots.slice(keepCount);
    const now = new Date().toISOString();
    db.getClient().transaction((tx) => {
      tx.delete(snapshot)
        .where(and(
          eq(snapshot.projectId, projectId),
          inArray(snapshot.id, toDelete.map((s) => s.id)),
        ))
        .run();
      tx.update(project)
        .set({ updatedAt: now })
        .where(eq(project.id, projectId))
        .run();
    });
    for (const s of toDelete) {
      hooks.queueOrphanArtifactCleanup(s.id);
    }

    hooks.logger.info("Old snapshots deleted successfully", {
      projectId,
      deletedCount: toDelete.length,
    });

    await hooks.ensureImmediatePackageExport({
      projectId,
      reason: "snapshot:delete-old",
    });

    return { success: true, deletedCount: toDelete.length };
  } catch (error) {
    hooks.logger.error("Failed to delete old snapshots", error);
    throw new ServiceError(
      ErrorCode.DB_QUERY_FAILED,
      "Failed to delete old snapshots",
      { projectId, keepCount },
      error,
    );
  }
};

export const pruneSnapshotRecords = async (
  projectId: string,
  hooks: RetentionHooks,
) => {
  const now = Date.now();
  const oneHourMs = 60 * 60 * 1000;
  const oneDayMs = 24 * oneHourMs;
  const sevenDaysMs = 7 * oneDayMs;

  try {
    const snapshots = await db.getClient()
      .select({ id: snapshot.id, createdAt: snapshot.createdAt })
      .from(snapshot)
      .where(and(eq(snapshot.projectId, projectId), eq(snapshot.type, "AUTO")))
      .orderBy(desc(snapshot.createdAt));

    if (snapshots.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    const toDelete: string[] = [];
    const hourBuckets = new Set<string>();
    const dayBuckets = new Set<string>();

    for (const snap of snapshots) {
      const createdAt = new Date(snap.createdAt);
      const age = now - createdAt.getTime();

      if (age < oneDayMs) continue;
      if (age < sevenDaysMs) {
        const hourKey = createdAt.toISOString().slice(0, 13);
        if (hourBuckets.has(hourKey)) {
          toDelete.push(snap.id);
        } else {
          hourBuckets.add(hourKey);
        }
        continue;
      }

      const dayKey = createdAt.toISOString().slice(0, 10);
      if (dayBuckets.has(dayKey)) {
        toDelete.push(snap.id);
      } else {
        dayBuckets.add(dayKey);
      }
    }

    if (toDelete.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    const updateNow = new Date().toISOString();
    db.getClient().transaction((tx) => {
      tx.delete(snapshot)
        .where(and(eq(snapshot.projectId, projectId), inArray(snapshot.id, toDelete)))
        .run();
      tx.update(project)
        .set({ updatedAt: updateNow })
        .where(eq(project.id, projectId))
        .run();
    });
    for (const sid of toDelete) {
      hooks.queueOrphanArtifactCleanup(sid);
    }

    hooks.logger.info("Snapshots pruned", {
      projectId,
      deletedCount: toDelete.length,
    });

    await hooks.ensureImmediatePackageExport({
      projectId,
      reason: "snapshot:prune",
    });

    return { success: true, deletedCount: toDelete.length };
  } catch (error) {
    hooks.logger.error("Failed to prune snapshots", error);
    throw new ServiceError(
      ErrorCode.DB_QUERY_FAILED,
      "Failed to prune snapshots",
      { projectId },
      error,
    );
  }
};
