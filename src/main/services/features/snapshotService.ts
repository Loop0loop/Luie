/**
 * Snapshot service - 버전 관리 스냅샷 비즈니스 로직
 */

import * as fs from "fs";
import path from "path";
import { app } from "electron";
import { db } from "../../database/index.js";
import { createLogger } from "../../../shared/logger/index.js";
import {
  ErrorCode,
  DEFAULT_PROJECT_SNAPSHOT_KEEP_COUNT,
  DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
  LUIE_PACKAGE_EXTENSION,
  LUIE_PACKAGE_FORMAT,
  LUIE_PACKAGE_CONTAINER_DIR,
  LUIE_PACKAGE_VERSION,
} from "../../../shared/constants/index.js";
import type { SnapshotCreateInput } from "../../../shared/types/index.js";
import { projectService } from "../core/projectService.js";
import { ServiceError } from "../../utils/serviceError.js";
import {
  writeFullSnapshotArtifact,
  readFullSnapshotArtifact,
} from "./snapshotArtifacts.js";
import { writeLuiePackage } from "../../handler/system/ipcFsHandlers.js";

const logger = createLogger("SnapshotService");

export class SnapshotService {
  async createSnapshot(input: SnapshotCreateInput) {
    try {
      logger.info("Creating snapshot", {
        projectId: input.projectId,
        chapterId: input.chapterId,
        hasContent: Boolean(input.content),
        descriptionLength: input.description?.length ?? 0,
      });

      const snapshot = await db.getClient().snapshot.create({
        data: {
          projectId: input.projectId,
          chapterId: input.chapterId,
          content: input.content,
          description: input.description,
        },
      });

      await writeFullSnapshotArtifact(String(snapshot.id), input);

      logger.info("Snapshot created successfully", { snapshotId: snapshot.id });
      projectService.schedulePackageExport(input.projectId, "snapshot:create");
      return snapshot;
    } catch (error) {
      logger.error("Failed to create snapshot", {
        error,
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

  async deleteSnapshot(id: string) {
    try {
      const snapshot = await db.getClient().snapshot.findUnique({
        where: { id },
        select: { projectId: true },
      });

      await db.getClient().snapshot.delete({
        where: { id },
      });

      logger.info("Snapshot deleted successfully", { snapshotId: id });
      if ((snapshot as { projectId?: unknown })?.projectId) {
        projectService.schedulePackageExport(
          String((snapshot as { projectId: unknown }).projectId),
          "snapshot:delete",
        );
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
      const snapshot = await db.getClient().snapshot.findUnique({
        where: { id: snapshotId },
      });

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

      const snapshot = await readFullSnapshotArtifact(filePath);
      const projectData = snapshot.data.project;
      const settings = snapshot.data.settings as
        | { autoSave?: boolean; autoSaveInterval?: number }
        | undefined;

      const safeTitle = (projectData.title || "Recovered Snapshot")
        .replace(/[\\/:*?"<>|]/g, "-")
        .replace(/\s+/g, " ")
        .trim();
      const documentsDir = app.getPath("documents");
      let basePath = path.join(
        documentsDir,
        `${safeTitle || "Recovered Snapshot"}${LUIE_PACKAGE_EXTENSION}`,
      );

      if (fs.existsSync(basePath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        basePath = path.join(
          documentsDir,
          `${safeTitle || "Recovered Snapshot"}-${timestamp}${LUIE_PACKAGE_EXTENSION}`,
        );
      }

      const projectPath = basePath;

      const autoSave =
        typeof settings?.autoSave === "boolean" ? settings.autoSave : true;
      const autoSaveInterval =
        typeof settings?.autoSaveInterval === "number"
          ? settings.autoSaveInterval
          : DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS;

      const project = (await db.getClient().$transaction(
        async (tx: ReturnType<(typeof db)["getClient"]>) => {
        const created = await tx.project.create({
          data: {
            title: projectData.title || "Recovered Snapshot",
            description: projectData.description ?? undefined,
            projectPath,
            settings: {
              create: {
                autoSave,
                autoSaveInterval,
              },
            },
          },
          include: {
            settings: true,
          },
        });

        const projectId = created.id;

        if (snapshot.data.chapters.length > 0) {
          await tx.chapter.createMany({
            data: snapshot.data.chapters.map((chapter, index) => ({
              id: chapter.id,
              projectId,
              title: chapter.title,
              content: chapter.content ?? "",
              synopsis: chapter.synopsis ?? null,
              order: typeof chapter.order === "number" ? chapter.order : index,
              wordCount: chapter.wordCount ?? 0,
            })),
          });
        }

        if (snapshot.data.characters.length > 0) {
          await tx.character.createMany({
            data: snapshot.data.characters.map((character) => ({
              id: character.id,
              projectId,
              name: character.name,
              description: character.description ?? null,
              firstAppearance: character.firstAppearance ?? null,
              attributes:
                typeof character.attributes === "string"
                  ? character.attributes
                  : character.attributes
                    ? JSON.stringify(character.attributes)
                    : null,
            })),
          });
        }

        if (snapshot.data.terms.length > 0) {
          await tx.term.createMany({
            data: snapshot.data.terms.map((term) => ({
              id: term.id,
              projectId,
              term: term.term,
              definition: term.definition ?? null,
              category: term.category ?? null,
              firstAppearance: term.firstAppearance ?? null,
            })),
          });
        }

        return created;
      })) as {
        id: string;
        title: string;
        description?: string | null;
        createdAt: Date;
        updatedAt: Date;
      };

      const meta = {
        format: LUIE_PACKAGE_FORMAT,
        container: LUIE_PACKAGE_CONTAINER_DIR,
        version: LUIE_PACKAGE_VERSION,
        projectId: project.id,
        title: project.title,
        description: project.description ?? undefined,
        createdAt: project.createdAt?.toISOString?.() ?? String(project.createdAt),
        updatedAt: project.updatedAt?.toISOString?.() ?? String(project.updatedAt),
      };

      try {
        await writeLuiePackage(
          projectPath,
          {
            meta,
            chapters: snapshot.data.chapters.map((chapter) => ({
              id: chapter.id,
              content: chapter.content ?? "",
            })),
            characters: snapshot.data.characters.map((character) => ({
              id: character.id,
              name: character.name,
              description: character.description ?? null,
              firstAppearance: character.firstAppearance ?? null,
              attributes:
                typeof character.attributes === "string"
                  ? character.attributes
                  : character.attributes
                    ? JSON.stringify(character.attributes)
                    : null,
              createdAt: new Date(character.createdAt),
              updatedAt: new Date(character.updatedAt),
            })),
            terms: snapshot.data.terms.map((term) => ({
              id: term.id,
              term: term.term,
              definition: term.definition ?? null,
              category: term.category ?? null,
              firstAppearance: term.firstAppearance ?? null,
              createdAt: new Date(term.createdAt),
              updatedAt: new Date(term.updatedAt),
            })),
            snapshots: [],
          },
          logger,
        );
      } catch (error) {
        await db.getClient().project.delete({ where: { id: project.id } }).catch(() => undefined);
        throw error;
      }

      logger.info("Snapshot imported successfully", {
        projectId: project.id,
        filePath,
      });

      return project;
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

      logger.info("Old snapshots deleted successfully", {
        projectId,
        deletedCount: toDelete.length,
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
