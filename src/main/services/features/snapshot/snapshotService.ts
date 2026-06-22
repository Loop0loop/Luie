/**
 * Snapshot service - 버전 관리 스냅샷 비즈니스 로직
 */

import { createHash, randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "../../../infra/database/index.js";
import {
  chapter,
  chapterBody,
  project,
  snapshot,
} from "../../../infra/database/index.js";
import { createLogger } from "../../../../shared/logger/index.js";
import {
  ErrorCode,
  DEFAULT_PROJECT_SNAPSHOT_KEEP_COUNT,
} from "../../../../shared/constants/index.js";
import type { SnapshotCreateInput } from "../../../../shared/types/index.js";
import { projectService } from "../../core/projectService.js";
import { ServiceError } from "../../../utils/error/index.js";
import {
  cleanupOrphanSnapshotArtifacts,
  listSnapshotRestoreCandidates,
  writeFullSnapshotArtifact,
} from "./snapshotArtifacts.js";
import { writeEmergencySnapshotFile } from "./snapshotEmergencyFile.js";
import { importSnapshotFromFile } from "./snapshotImportFromFile.js";
import {
  deleteOldSnapshotRecords,
  pruneSnapshotRecords,
} from "./snapshotRetention.js";

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
    await projectService.persistPackageAfterMutation(
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

      const now = new Date().toISOString();
      const [created] = await db
        .getClient()
        .insert(snapshot)
        .values({
          id: snapshotId,
          projectId: input.projectId,
          chapterId: input.chapterId,
          content: input.content,
          contentLength,
          type: snapshotType,
          description: input.description,
        })
        .returning();
      db.getClient().transaction((tx) => {
        tx.update(project)
          .set({ updatedAt: now })
          .where(eq(project.id, input.projectId))
          .run();
      });

      logger.info("Snapshot created successfully", { snapshotId: created.id });
      await this.ensureImmediatePackageExport({
        projectId: input.projectId,
        reason: "snapshot:create",
      });
      this.scheduleOrphanArtifactCleanup();
      return created;
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
      const rows = await db
        .getClient()
        .select()
        .from(snapshot)
        .where(eq(snapshot.id, id))
        .limit(1);
      const found = rows[0] ?? null;

      if (!found) {
        throw new ServiceError(
          ErrorCode.SNAPSHOT_RESTORE_FAILED,
          "Snapshot not found",
          { id },
        );
      }

      return found;
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
      const snapshots = await db
        .getClient()
        .select()
        .from(snapshot)
        .where(eq(snapshot.projectId, projectId))
        .orderBy(desc(snapshot.createdAt));

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
      const snapshots = await db
        .getClient()
        .select()
        .from(snapshot)
        .where(eq(snapshot.chapterId, chapterId))
        .orderBy(desc(snapshot.createdAt));

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
      const rows = await db
        .getClient()
        .select({ projectId: snapshot.projectId })
        .from(snapshot)
        .where(eq(snapshot.id, id))
        .limit(1);
      const found = rows[0] ?? null;

      const now = new Date().toISOString();
      db.getClient().transaction((tx) => {
        tx.delete(snapshot).where(eq(snapshot.id, id)).run();
        if (found?.projectId) {
          tx.update(project)
            .set({ updatedAt: now })
            .where(eq(project.id, found.projectId))
            .run();
        }
      });
      this.queueOrphanArtifactCleanup(id);

      logger.info("Snapshot deleted successfully", { snapshotId: id });
      if (found?.projectId) {
        await this.ensureImmediatePackageExport({
          projectId: found.projectId,
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
      const rows = await db
        .getClient()
        .select()
        .from(snapshot)
        .where(eq(snapshot.id, snapshotId))
        .limit(1);
      const found = rows[0] ?? null;

      if (!found) {
        throw new ServiceError(
          ErrorCode.SNAPSHOT_RESTORE_FAILED,
          "Snapshot not found",
          { snapshotId },
        );
      }

      if (!found.chapterId) {
        throw new ServiceError(
          ErrorCode.SNAPSHOT_RESTORE_FAILED,
          "Cannot restore project-level snapshot",
          { snapshotId },
        );
      }
      const chapterId = found.chapterId;

      const nextContent =
        typeof found.content === "string" ? found.content : "";

      const contentHash = createHash("sha256")
        .update(nextContent)
        .digest("hex");
      const now = new Date().toISOString();
      db.getClient().transaction((tx) => {
        tx.update(chapter)
          .set({
            content: nextContent,
            wordCount: nextContent.length,
            updatedAt: now,
          })
          .where(eq(chapter.id, chapterId))
          .run();
        tx.insert(chapterBody)
          .values({
            chapterId,
            content: nextContent,
            contentHash,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [chapterBody.chapterId],
            set: { content: nextContent, contentHash, updatedAt: now },
          })
          .run();
        tx.update(project)
          .set({ updatedAt: now })
          .where(eq(project.id, found.projectId))
          .run();
      });

      logger.info("Snapshot restored successfully", {
        snapshotId,
        chapterId: found.chapterId,
      });

      await this.ensureImmediatePackageExport({
        projectId: found.projectId,
        reason: "snapshot:restore",
      });

      return {
        success: true,
        chapterId: found.chapterId,
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
    return await deleteOldSnapshotRecords(projectId, keepCount, {
      queueOrphanArtifactCleanup: (snapshotId) =>
        this.queueOrphanArtifactCleanup(snapshotId),
      ensureImmediatePackageExport: (input) =>
        this.ensureImmediatePackageExport(input),
      logger,
    });
  }

  async pruneSnapshots(projectId: string) {
    return await pruneSnapshotRecords(projectId, {
      queueOrphanArtifactCleanup: (snapshotId) =>
        this.queueOrphanArtifactCleanup(snapshotId),
      ensureImmediatePackageExport: (input) =>
        this.ensureImmediatePackageExport(input),
      logger,
    });
  }

  async pruneSnapshotsAllProjects() {
    const projects = await db
      .getClient()
      .select({ id: project.id })
      .from(project);

    const results = await Promise.all(
      projects.map((p) => this.pruneSnapshots(p.id)),
    );

    const deletedCount = results.reduce(
      (sum, result) => sum + (result.deletedCount ?? 0),
      0,
    );

    return { success: true, deletedCount };
  }

  async getLatestSnapshot(chapterId: string) {
    try {
      const rows = await db
        .getClient()
        .select()
        .from(snapshot)
        .where(eq(snapshot.chapterId, chapterId))
        .orderBy(desc(snapshot.createdAt))
        .limit(1);
      const found = rows[0] ?? null;

      return found;
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
