/**
 * Snapshot service - 버전 관리 스냅샷 비즈니스 로직
 */

import { randomUUID } from "node:crypto";
import { db } from "../../../database/index.js";
import { createLogger } from "../../../../shared/logger/index.js";
import {
  ErrorCode,
  DEFAULT_PROJECT_SNAPSHOT_KEEP_COUNT,
} from "../../../../shared/constants/index.js";
import type { SnapshotCreateInput } from "../../../../shared/types/index.js";
import { projectService } from "../../core/projectService.js";
import { ServiceError } from "../../../utils/serviceError.js";
import {
  cleanupOrphanSnapshotArtifacts,
  listSnapshotRestoreCandidates,
  writeFullSnapshotArtifact,
} from "./snapshotArtifacts.js";
import { writeEmergencySnapshotFile } from "./snapshotEmergencyFile.js";
import { importSnapshotFromFile } from "./snapshotImportFromFile.js";

const logger = createLogger("SnapshotService");
const ORPHAN_CLEANUP_IDLE_DELAY_MS = 30_000;
const ORPHAN_CLEANUP_MIN_AGE_MS = 10_000;

export class SnapshotService {
  private orphanArtifactIds = new Set<string>();
  private orphanCleanupTimer: NodeJS.Timeout | null = null;

  private async ensureImmediatePackageExport(input: {
    projectId: string;
    reason:
      | "snapshot:create"
      | "snapshot:delete"
      | "snapshot:restore"
      | "snapshot:delete-old"
      | "snapshot:prune";
  }): Promise<void> {
    await projectService.ensureImmediatePackageExport(
      input.projectId,
      input.reason,
    );
  }

  private scheduleOrphanArtifactCleanup(): void {
    if (this.orphanCleanupTimer) return;
    this.orphanCleanupTimer = setTimeout(() => {
      this.orphanCleanupTimer = null;
      void this.cleanupOrphanArtifacts("idle").catch((error) => {
        logger.warn("Idle orphan artifact cleanup failed", { error });
      });
    }, ORPHAN_CLEANUP_IDLE_DELAY_MS);
    if (typeof this.orphanCleanupTimer.unref === "function") {
      this.orphanCleanupTimer.unref();
    }
  }

  private queueOrphanArtifactCleanup(snapshotId: string): void {
    this.orphanArtifactIds.add(snapshotId);
    this.scheduleOrphanArtifactCleanup();
  }

  async cleanupOrphanArtifacts(
    trigger: "startup" | "idle" = "idle",
  ): Promise<{ scanned: number; deleted: number }> {
    if (trigger === "startup") {
      const result = await cleanupOrphanSnapshotArtifacts();
      logger.info("Startup orphan artifact cleanup completed", result);
      return result;
    }

    const queuedIds = Array.from(this.orphanArtifactIds);
    if (queuedIds.length === 0) {
      return { scanned: 0, deleted: 0 };
    }

    for (const id of queuedIds) {
      this.orphanArtifactIds.delete(id);
    }

    try {
      const result = await cleanupOrphanSnapshotArtifacts({
        snapshotIds: queuedIds,
        minAgeMs: ORPHAN_CLEANUP_MIN_AGE_MS,
      });
      logger.info("Queued orphan artifact cleanup completed", {
        queued: queuedIds.length,
        ...result,
      });
      return result;
    } catch (error) {
      for (const id of queuedIds) {
        this.orphanArtifactIds.add(id);
      }
      throw error;
    }
  }

  async createSnapshot(input: SnapshotCreateInput) {
    const snapshotId = randomUUID();
    try {
      const snapshotType = input.type ?? "AUTO";
      const contentLength = input.content.length;
      logger.info("Creating snapshot", {
        snapshotId,
        projectId: input.projectId,
        chapterId: input.chapterId,
        hasContent: Boolean(input.content),
        descriptionLength: input.description?.length ?? 0,
        type: snapshotType,
      });

      await writeFullSnapshotArtifact(snapshotId, input);

      const snapshot = await db.getClient().snapshot.create({
        data: {
          id: snapshotId,
          projectId: input.projectId,
          chapterId: input.chapterId,
          content: input.content,
          contentLength,
          type: snapshotType,
          description: input.description,
        },
      });

      logger.info("Snapshot created successfully", { snapshotId: snapshot.id });
      await this.ensureImmediatePackageExport({
        projectId: input.projectId,
        reason: "snapshot:create",
      });
      this.scheduleOrphanArtifactCleanup();
      return snapshot;
    } catch (error) {
      this.queueOrphanArtifactCleanup(snapshotId);
      await writeEmergencySnapshotFile(input, logger, error);
      logger.error("Failed to create snapshot", {
        error,
        snapshotId,
        projectId: input.projectId,
        chapterId: input.chapterId,
      });
      throw new ServiceError(
        ErrorCode.SNAPSHOT_CREATE_FAILED,
        "Failed to create snapshot",
        { input },
        error,
      );
    }
  }

  async getSnapshot(id: string) {
    try {
      const snapshot = await db.getClient().snapshot.findUnique({
        where: { id },
      });

      if (!snapshot) {
        throw new ServiceError(
          ErrorCode.SNAPSHOT_RESTORE_FAILED,
          "Snapshot not found",
          { id },
        );
      }

      return snapshot;
    } catch (error) {
      logger.error("Failed to get snapshot", error);
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to get snapshot",
        { id },
        error,
      );
    }
  }

  async getSnapshotsByProject(projectId: string) {
    try {
      const snapshots = await db.getClient().snapshot.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      });

      return snapshots;
    } catch (error) {
      logger.error("Failed to get snapshots by project", error);
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to get snapshots by project",
        { projectId },
        error,
      );
    }
  }

  async getSnapshotsByChapter(chapterId: string) {
    try {
      const snapshots = await db.getClient().snapshot.findMany({
        where: { chapterId },
        orderBy: { createdAt: "desc" },
      });

      return snapshots;
    } catch (error) {
      logger.error("Failed to get snapshots by chapter", error);
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to get snapshots by chapter",
        { chapterId },
        error,
      );
    }
  }

  async listRestoreCandidates() {
    try {
      return await listSnapshotRestoreCandidates();
    } catch (error) {
      logger.error("Failed to list snapshot restore candidates", error);
      throw new ServiceError(
        ErrorCode.SNAPSHOT_RESTORE_FAILED,
        "Failed to list snapshot restore candidates",
        undefined,
        error,
      );
    }
  }

  async deleteSnapshot(id: string) {
    try {
      const snapshot = await db.getClient().snapshot.findUnique({
        where: { id },
        select: { projectId: true },
      });

      await db.getClient().snapshot.delete({
        where: { id },
      });
      this.queueOrphanArtifactCleanup(id);

      logger.info("Snapshot deleted successfully", { snapshotId: id });
      if ((snapshot as { projectId?: unknown })?.projectId) {
        await this.ensureImmediatePackageExport({
          projectId: String((snapshot as { projectId: unknown }).projectId),
          reason: "snapshot:delete",
        });
      }
      return { success: true };
    } catch (error) {
      logger.error("Failed to delete snapshot", error);
      throw new ServiceError(
        ErrorCode.SNAPSHOT_DELETE_FAILED,
        "Failed to delete snapshot",
        { id },
        error,
      );
    }
  }

  async restoreSnapshot(snapshotId: string) {
    try {
      const snapshot = (await db.getClient().snapshot.findUnique({
        where: { id: snapshotId },
      })) as {
        id: string;
        projectId: string;
        chapterId?: string | null;
        content?: string | null;
      } | null;

      if (!snapshot) {
        throw new ServiceError(
          ErrorCode.SNAPSHOT_RESTORE_FAILED,
          "Snapshot not found",
          { snapshotId },
        );
      }

      if (!snapshot.chapterId) {
        throw new ServiceError(
          ErrorCode.SNAPSHOT_RESTORE_FAILED,
          "Cannot restore project-level snapshot",
          { snapshotId },
        );
      }

      const nextContent =
        typeof snapshot.content === "string" ? snapshot.content : "";

      await db.getClient().chapter.update({
        where: { id: snapshot.chapterId },
        data: {
          content: nextContent,
          wordCount: nextContent.length,
        },
      });

      logger.info("Snapshot restored successfully", {
        snapshotId,
        chapterId: snapshot.chapterId,
      });

      await this.ensureImmediatePackageExport({
        projectId: String(snapshot.projectId),
        reason: "snapshot:restore",
      });

      return {
        success: true,
        chapterId: snapshot.chapterId,
      };
    } catch (error) {
      logger.error("Failed to restore snapshot", error);
      if (error instanceof ServiceError) {
        throw error;
      }
      throw new ServiceError(
        ErrorCode.SNAPSHOT_RESTORE_FAILED,
        "Failed to restore snapshot",
        { snapshotId },
        error,
      );
    }
  }

  async importSnapshotFile(filePath: string) {
    try {
      logger.info("Importing snapshot file", { filePath });
      const created = await importSnapshotFromFile(filePath, logger);
      logger.info("Snapshot imported successfully", {
        projectId: created.id,
        filePath,
      });

      return created;
    } catch (error) {
      logger.error("Failed to import snapshot file", error);
      throw new ServiceError(
        ErrorCode.SNAPSHOT_RESTORE_FAILED,
        "Failed to import snapshot file",
        { filePath },
        error,
      );
    }
  }

  async deleteOldSnapshots(
    projectId: string,
    keepCount: number = DEFAULT_PROJECT_SNAPSHOT_KEEP_COUNT,
  ) {
    try {
      const allSnapshots = await db.getClient().snapshot.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      });

      if (allSnapshots.length <= keepCount) {
        return { success: true, deletedCount: 0 };
      }

      const toDelete = allSnapshots.slice(keepCount) as Array<{ id: string }>;
      const deletePromises = toDelete.map((snapshot) =>
        db.getClient().snapshot.delete({
          where: { id: snapshot.id },
        }),
      );

      await Promise.all(deletePromises);
      for (const snapshot of toDelete) {
        this.queueOrphanArtifactCleanup(snapshot.id);
      }

      logger.info("Old snapshots deleted successfully", {
        projectId,
        deletedCount: toDelete.length,
      });

      await this.ensureImmediatePackageExport({
        projectId,
        reason: "snapshot:delete-old",
      });

      return { success: true, deletedCount: toDelete.length };
    } catch (error) {
      logger.error("Failed to delete old snapshots", error);
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to delete old snapshots",
        { projectId, keepCount },
        error,
      );
    }
  }

  async pruneSnapshots(projectId: string) {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    const ONE_DAY = 24 * ONE_HOUR;
    const SEVEN_DAYS = 7 * ONE_DAY;

    try {
      const snapshots = (await db.getClient().snapshot.findMany({
        where: { projectId, type: "AUTO" },
        orderBy: { createdAt: "desc" },
        select: { id: true, createdAt: true },
      })) as Array<{ id: string; createdAt: Date }>;

      if (snapshots.length === 0) {
        return { success: true, deletedCount: 0 };
      }

      const toDelete: string[] = [];
      const hourBuckets = new Set<string>();
      const dayBuckets = new Set<string>();

      for (const snap of snapshots) {
        const createdAt =
          snap.createdAt instanceof Date
            ? snap.createdAt
            : new Date(String(snap.createdAt));
        const age = now - createdAt.getTime();

        if (age < ONE_DAY) {
          continue;
        }

        if (age < SEVEN_DAYS) {
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

      await db.getClient().snapshot.deleteMany({
        where: { id: { in: toDelete } },
      });
      for (const snapshotId of toDelete) {
        this.queueOrphanArtifactCleanup(snapshotId);
      }

      logger.info("Snapshots pruned", {
        projectId,
        deletedCount: toDelete.length,
      });

      await this.ensureImmediatePackageExport({
        projectId,
        reason: "snapshot:prune",
      });

      return { success: true, deletedCount: toDelete.length };
    } catch (error) {
      logger.error("Failed to prune snapshots", error);
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to prune snapshots",
        { projectId },
        error,
      );
    }
  }

  async pruneSnapshotsAllProjects() {
    const projects = await db.getClient().project.findMany({
      select: { id: true },
    });

    const results = await Promise.all(
      projects.map((project: { id: string }) =>
        this.pruneSnapshots(String(project.id)),
      ),
    );

    const deletedCount = results.reduce(
      (sum, result) => sum + (result.deletedCount ?? 0),
      0,
    );

    return { success: true, deletedCount };
  }

  async getLatestSnapshot(chapterId: string) {
    try {
      const snapshot = await db.getClient().snapshot.findFirst({
        where: { chapterId },
        orderBy: { createdAt: "desc" },
      });

      return snapshot;
    } catch (error) {
      logger.error("Failed to get latest snapshot", error);
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to get latest snapshot",
        { chapterId },
        error,
      );
    }
  }
}

export const snapshotService = new SnapshotService();
