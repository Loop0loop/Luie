import { app } from "electron";
import { promises as fs } from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { writeGzipAtomic, readMaybeGzip } from "../../utils/fs/index.js";
import {
  SNAPSHOT_MIRROR_DIR,
  SNAPSHOT_FILE_KEEP_COUNT,
} from "../../../shared/constants/index.js";

type LoggerLike = {
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
};

type MirrorPayload = {
  projectId: string;
  chapterId: string;
  content: string;
  updatedAt: string | null;
};

// NOTE: 미러를 스냅샷으로 승격할지 결정한다. 미러 내용이 이미 DB에 저장돼 있으면(동일하거나
// DB가 더 새면) 승격은 중복이고, 스냅샷 목록을 무의미한 항목으로 오염시킨다.
// 미러가 DB보다 새고 내용이 다를 때만(저장이 완료되지 못한 크래시 케이스) 승격한다.
export const shouldPromoteMirrorToSnapshot = (input: {
  mirrorContent: string;
  mirrorUpdatedAtMs: number;
  chapterContent: string | null;
  chapterUpdatedAtMs: number;
}): boolean => {
  if (input.mirrorContent === (input.chapterContent ?? "")) return false;
  if (
    input.mirrorUpdatedAtMs > 0 &&
    input.chapterUpdatedAtMs > 0 &&
    input.mirrorUpdatedAtMs <= input.chapterUpdatedAtMs
  ) {
    return false;
  }
  return true;
};

export class AutoSaveMirrorStore {
  constructor(private readonly logger: LoggerLike) {}

  getMirrorBaseDir(projectId: string, chapterId: string): string {
    return path.join(
      app.getPath("userData"),
      SNAPSHOT_MIRROR_DIR,
      projectId,
      chapterId,
    );
  }

  async writeLatestMirror(
    projectId: string,
    chapterId: string,
    content: string,
  ): Promise<void> {
    try {
      const baseDir = this.getMirrorBaseDir(projectId, chapterId);
      await fs.mkdir(baseDir, { recursive: true });
      const targetPath = path.join(baseDir, "latest.snap");
      const payload = JSON.stringify(
        { projectId, chapterId, content, updatedAt: new Date().toISOString() },
        null,
        2,
      );
      await writeGzipAtomic(targetPath, payload);
    } catch (error) {
      this.logger.error("Failed to write latest mirror", error);
    }
  }

  async writeTimestampedMirror(
    projectId: string,
    chapterId: string,
    content: string,
  ): Promise<void> {
    try {
      const baseDir = this.getMirrorBaseDir(projectId, chapterId);
      await fs.mkdir(baseDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filePath = path.join(baseDir, `${timestamp}.snap`);
      const payload = JSON.stringify(
        { projectId, chapterId, content, createdAt: new Date().toISOString() },
        null,
        2,
      );
      await writeGzipAtomic(filePath, payload);

      const files = (await fs.readdir(baseDir)).filter(
        (name) => name.endsWith(".snap") && name !== "latest.snap",
      );
      if (files.length > SNAPSHOT_FILE_KEEP_COUNT) {
        const sorted = files.sort();
        const toDelete = sorted.slice(
          0,
          files.length - SNAPSHOT_FILE_KEEP_COUNT,
        );
        await Promise.all(
          toDelete.map((name) =>
            fs.unlink(path.join(baseDir, name)).catch(() => undefined),
          ),
        );
      }
    } catch (error) {
      this.logger.error("Failed to write timestamped mirror", error);
    }
  }

  async flushMirrorsToSnapshots(
    reason: string,
  ): Promise<{ created: number; cleaned: number }> {
    const [{ db }, { snapshotService }] = await Promise.all([
      import("../../infra/database/index.js"),
      import("../../domains/recovery/index.js"),
    ]);
    const mirrorFiles = await this.listLatestMirrorFiles();
    let created = 0;
    let cleaned = 0;

    for (const filePath of mirrorFiles) {
      try {
        const payload = await this.readMirrorPayload(filePath);
        if (!payload) continue;

        const { chapter: chapterTable } = await import("../../infra/database/index.js");
        const rows = await db.getClient().select({
          id: chapterTable.id,
          projectId: chapterTable.projectId,
          deletedAt: chapterTable.deletedAt,
          updatedAt: chapterTable.updatedAt,
        }).from(chapterTable).where(eq(chapterTable.id, payload.chapterId)).limit(1);
        const chapter = rows[0] ?? null;

        if (!chapter) {
          this.logger.warn(
            "Mirror snapshot skipped (missing chapter), cleaning up stale mirror",
            {
              chapterId: payload.chapterId,
              filePath,
            },
          );
          await this.cleanStaleMirrorDir(filePath);
          cleaned += 1;
          continue;
        }
        const chapterDeletedAt = (chapter as { deletedAt?: unknown }).deletedAt;
        if (chapterDeletedAt !== null && chapterDeletedAt !== undefined) {
          this.logger.info(
            "Mirror snapshot skipped (chapter deleted), cleaning up",
            {
              chapterId: payload.chapterId,
              filePath,
            },
          );
          await this.cleanStaleMirrorDir(filePath);
          cleaned += 1;
          continue;
        }

        if (
          String((chapter as { projectId: unknown }).projectId) !==
          payload.projectId
        ) {
          this.logger.warn(
            "Mirror snapshot skipped (project mismatch), cleaning up",
            {
              chapterId: payload.chapterId,
              projectId: payload.projectId,
              filePath,
            },
          );
          await this.cleanStaleMirrorDir(filePath);
          cleaned += 1;
          continue;
        }

        const latest = await snapshotService.getLatestSnapshot(
          payload.chapterId,
        );
        const latestAt = latest?.createdAt
          ? new Date(String(latest.createdAt)).getTime()
          : 0;
        const mirrorAt = payload.updatedAt
          ? new Date(payload.updatedAt).getTime()
          : 0;

        if (mirrorAt && mirrorAt <= latestAt) {
          continue;
        }

        const { readChapterContent } = await import(
          "../../services/core/chapter/chapterContentStore.js"
        );
        const chapterContent = await readChapterContent(payload.chapterId);
        const chapterUpdatedAtMs = (() => {
          const value = (chapter as { updatedAt?: unknown }).updatedAt;
          if (!value) return 0;
          const parsed = new Date(String(value)).getTime();
          return Number.isFinite(parsed) ? parsed : 0;
        })();

        if (
          !shouldPromoteMirrorToSnapshot({
            mirrorContent: payload.content,
            mirrorUpdatedAtMs: mirrorAt,
            chapterContent,
            chapterUpdatedAtMs,
          })
        ) {
          this.logger.info(
            "Mirror snapshot skipped (mirror already persisted or stale)",
            {
              chapterId: payload.chapterId,
              mirrorAt,
              chapterUpdatedAtMs,
            },
          );
          continue;
        }

        await snapshotService.createSnapshot({
          projectId: payload.projectId,
          chapterId: payload.chapterId,
          content: payload.content,
          description: `미러 복구 스냅샷 (${reason}) ${new Date().toLocaleString()}`,
          type: "AUTO",
        });
        created += 1;
      } catch (error) {
        this.logger.warn("Failed to flush mirror snapshot", {
          error,
          filePath,
        });
      }
    }

    this.logger.info("Mirror snapshot flush completed", {
      created,
      cleaned,
      reason,
    });
    return { created, cleaned };
  }

  private async listLatestMirrorFiles(): Promise<string[]> {
    const baseDir = path.join(app.getPath("userData"), SNAPSHOT_MIRROR_DIR);
    const results: string[] = [];

    try {
      const projectDirs = await fs.readdir(baseDir, { withFileTypes: true });
      for (const projectDir of projectDirs) {
        if (!projectDir.isDirectory() || projectDir.name === "_emergency")
          continue;

        const projectPath = path.join(baseDir, projectDir.name);
        const chapterDirs = await fs.readdir(projectPath, {
          withFileTypes: true,
        });
        for (const chapterDir of chapterDirs) {
          if (!chapterDir.isDirectory()) continue;
          const latestPath = path.join(
            projectPath,
            chapterDir.name,
            "latest.snap",
          );
          try {
            await fs.stat(latestPath);
            results.push(latestPath);
          } catch {
            // NOTE: chapter별 latest snapshot은 아직 생성되지 않았을 수 있다.
          }
        }
      }
    } catch (error) {
      const fsError = error as NodeJS.ErrnoException;
      if (fsError?.code === "ENOENT") {
        return results;
      }
      this.logger.warn("Failed to list mirror files", error);
    }

    return results;
  }

  private async readMirrorPayload(
    filePath: string,
  ): Promise<MirrorPayload | null> {
    try {
      const raw = await readMaybeGzip(filePath);
      const payload = JSON.parse(raw) as Record<string, unknown>;

      if (
        typeof payload.projectId !== "string" ||
        typeof payload.chapterId !== "string"
      ) {
        return null;
      }

      return {
        projectId: payload.projectId,
        chapterId: payload.chapterId,
        content: typeof payload.content === "string" ? payload.content : "",
        updatedAt:
          typeof payload.updatedAt === "string" ? payload.updatedAt : null,
      };
    } catch (error) {
      this.logger.warn("Failed to read mirror payload", { filePath, error });
      return null;
    }
  }

  private async cleanStaleMirrorDir(mirrorFilePath: string): Promise<void> {
    try {
      const dir = path.dirname(mirrorFilePath);
      const files = await fs.readdir(dir);
      await Promise.all(
        files.map((name) =>
          fs.unlink(path.join(dir, name)).catch(() => undefined),
        ),
      );
      await fs.rmdir(dir).catch(() => undefined);
    } catch (error) {
      this.logger.warn("Failed to clean stale mirror directory", {
        mirrorFilePath,
        error,
      });
    }
  }
}
