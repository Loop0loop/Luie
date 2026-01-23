/**
 * Snapshot service - 버전 관리 스냅샷 비즈니스 로직
 */

import { db } from "../database/index.js";
import { createLogger } from "../../shared/logger/index.js";
import { ErrorCode, DEFAULT_PROJECT_SNAPSHOT_KEEP_COUNT } from "../../shared/constants/index.js";
import type { SnapshotCreateInput } from "../../shared/types/index.js";

const logger = createLogger("SnapshotService");

export class SnapshotService {
  async createSnapshot(input: SnapshotCreateInput) {
    try {
      logger.info("Creating snapshot", {
        projectId: input.projectId,
        chapterId: input.chapterId,
      });

      const snapshot = await db.getClient().snapshot.create({
        data: {
          projectId: input.projectId,
          chapterId: input.chapterId,
          content: input.content,
          description: input.description,
        },
      });

      logger.info("Snapshot created successfully", { snapshotId: snapshot.id });
      return snapshot;
    } catch (error) {
      logger.error("Failed to create snapshot", error);
      throw new Error(ErrorCode.SNAPSHOT_CREATE_FAILED);
    }
  }

  async getSnapshot(id: string) {
    try {
      const snapshot = await db.getClient().snapshot.findUnique({
        where: { id },
      });

      if (!snapshot) {
        throw new Error("Snapshot not found");
      }

      return snapshot;
    } catch (error) {
      logger.error("Failed to get snapshot", error);
      throw error;
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
      throw error;
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
      throw error;
    }
  }

  async deleteSnapshot(id: string) {
    try {
      await db.getClient().snapshot.delete({
        where: { id },
      });

      logger.info("Snapshot deleted successfully", { snapshotId: id });
      return { success: true };
    } catch (error) {
      logger.error("Failed to delete snapshot", error);
      throw new Error(ErrorCode.SNAPSHOT_DELETE_FAILED);
    }
  }

  async restoreSnapshot(snapshotId: string) {
    try {
      const snapshot = await db.getClient().snapshot.findUnique({
        where: { id: snapshotId },
      });

      if (!snapshot) {
        throw new Error("Snapshot not found");
      }

      if (!snapshot.chapterId) {
        throw new Error("Cannot restore project-level snapshot");
      }

      await db.getClient().chapter.update({
        where: { id: snapshot.chapterId },
        data: {
          content: snapshot.content,
        },
      });

      logger.info("Snapshot restored successfully", {
        snapshotId,
        chapterId: snapshot.chapterId,
      });

      return {
        success: true,
        chapterId: snapshot.chapterId,
      };
    } catch (error) {
      logger.error("Failed to restore snapshot", error);
      throw new Error(ErrorCode.SNAPSHOT_RESTORE_FAILED);
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

      const toDelete = allSnapshots.slice(keepCount);
      const deletePromises = toDelete.map((snapshot: { id: string }) =>
        db.getClient().snapshot.delete({
          where: { id: snapshot.id },
        }),
      );

      await Promise.all(deletePromises);

      logger.info("Old snapshots deleted successfully", {
        projectId,
        deletedCount: toDelete.length,
      });

      return { success: true, deletedCount: toDelete.length };
    } catch (error) {
      logger.error("Failed to delete old snapshots", error);
      throw error;
    }
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
      throw error;
    }
  }
}

export const snapshotService = new SnapshotService();
