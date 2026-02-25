/**
 * Auto save manager - 자동 저장 관리 (디바운싱 포함)
 *
 * 책임:
 *   1. 디바운스 기반 자동 저장 (chapter → DB)
 *   2. 스냅샷 미러 파일 관리 (latest.snap + 타임스탬프.snap)
 *   3. 스냅샷 큐 처리 (Time Machine 스타일)
 *   4. 종료/크래시 시 긴급 스냅샷
 *   5. 미러 → DB 스냅샷 변환 (startup/shutdown recovery)
 *
 * 크래시 안전 보장:
 *   - 모든 파일 I/O는 atomicWrite 유틸을 사용 (temp → fsync → rename → dir fsync)
 *   - 매 triggerSave마다 latest.snap 미러를 즉시 기록
 *   - 앱 시작 시 미러를 DB 스냅샷으로 복구
 */

import { EventEmitter } from "events";
import { app } from "electron";
import { promises as fs } from "fs";
import path from "path";
import { chapterService } from "../services/core/chapterService.js";
import { snapshotService } from "../services/features/snapshotService.js";
import { createLogger } from "../../shared/logger/index.js";
import { ErrorCode } from "../../shared/constants/index.js";
import { isServiceError } from "../utils/serviceError.js";
import { db } from "../database/index.js";
import { writeGzipAtomic, readMaybeGzip } from "../utils/atomicWrite.js";
import {
  DEFAULT_AUTO_SAVE_DEBOUNCE_MS,
  DEFAULT_AUTO_SAVE_INTERVAL_MS,
  AUTO_SAVE_CLEANUP_INTERVAL_MS,
  AUTO_SAVE_STALE_THRESHOLD_MS,
  DEFAULT_PROJECT_SNAPSHOT_KEEP_COUNT,
  SNAPSHOT_MIRROR_DIR,
  SNAPSHOT_FILE_KEEP_COUNT,
  SNAPSHOT_INTERVAL_MS,
  SNAPSHOT_KEEP_COUNT,
  SNAPSHOT_MIN_CONTENT_LENGTH,
  SNAPSHOT_MIN_CHANGE_RATIO,
  SNAPSHOT_MIN_CHANGE_ABSOLUTE,
  EMERGENCY_SNAPSHOT_MAX_LENGTH,
  EMERGENCY_SNAPSHOT_INTERVAL_MS,
} from "../../shared/constants/index.js";

const logger = createLogger("AutoSaveManager");

// ─── Types ───────────────────────────────────────────────────────────────────

interface AutoSaveConfig {
  enabled: boolean;
  interval: number;
  debounceMs: number;
}

interface PendingSave {
  chapterId: string;
  content: string;
  projectId: string;
}

interface SnapshotJob {
  projectId: string;
  chapterId: string;
  content: string;
}

interface MirrorPayload {
  projectId: string;
  chapterId: string;
  content: string;
  updatedAt: string | null;
}

// ─── AutoSaveManager ────────────────────────────────────────────────────────

export class AutoSaveManager extends EventEmitter {
  private static instance: AutoSaveManager;

  // Save state
  private saveTimers = new Map<string, NodeJS.Timeout>();
  private intervalTimers = new Map<string, NodeJS.Timeout>();
  private configs = new Map<string, AutoSaveConfig>();
  private pendingSaves = new Map<string, PendingSave>();
  private lastSaveAt = new Map<string, number>();

  // Snapshot state
  private snapshotTimers = new Map<string, NodeJS.Timeout>();
  private lastSnapshotAt = new Map<string, number>();
  private lastSnapshotHash = new Map<string, number>();
  private lastSnapshotLength = new Map<string, number>();
  private lastEmergencySnapshotAt = new Map<string, number>();
  private snapshotQueue: SnapshotJob[] = [];
  private snapshotProcessing = false;

  private constructor() {
    super();
    this.on("error", (payload) => {
      logger.warn("Auto-save error event", payload);
    });
    this.startCleanupInterval();
  }

  static getInstance(): AutoSaveManager {
    if (!AutoSaveManager.instance) {
      AutoSaveManager.instance = new AutoSaveManager();
    }
    return AutoSaveManager.instance;
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /** Check if there are unsaved changes pending IPC or DB write. */
  hasPendingSaves(): boolean {
    return this.pendingSaves.size > 0;
  }

  /** Get count of pending saves - used for quit dialog. */
  getPendingSaveCount(): number {
    return this.pendingSaves.size;
  }

  /** Get list of pending chapter IDs for diagnostics. */
  getPendingChapterIds(): string[] {
    return Array.from(this.pendingSaves.keys());
  }

  async forgetChapter(projectId: string, chapterId: string): Promise<void> {
    const timer = this.saveTimers.get(chapterId);
    if (timer) {
      clearTimeout(timer);
      this.saveTimers.delete(chapterId);
    }

    this.pendingSaves.delete(chapterId);
    this.lastSaveAt.delete(chapterId);

    const snapshotKey = `${projectId}:${chapterId}`;
    this.lastSnapshotAt.delete(snapshotKey);
    this.lastSnapshotHash.delete(snapshotKey);
    this.lastSnapshotLength.delete(snapshotKey);
    this.lastEmergencySnapshotAt.delete(snapshotKey);
    this.snapshotQueue = this.snapshotQueue.filter(
      (job) => !(job.projectId === projectId && job.chapterId === chapterId),
    );

    try {
      const baseDir = this.getMirrorBaseDir(projectId, chapterId);
      await fs.rm(baseDir, { recursive: true, force: true });
    } catch (error) {
      logger.warn("Failed to purge chapter mirrors", { projectId, chapterId, error });
    }
  }

  setConfig(projectId: string, config: AutoSaveConfig) {
    this.configs.set(projectId, config);

    if (!config.enabled) {
      this.stopAutoSave(projectId);
    } else {
      this.startAutoSave(projectId);
      this.startSnapshotSchedule(projectId);
    }
  }

  getConfig(projectId: string): AutoSaveConfig {
    return (
      this.configs.get(projectId) || {
        enabled: true,
        interval: DEFAULT_AUTO_SAVE_INTERVAL_MS,
        debounceMs: DEFAULT_AUTO_SAVE_DEBOUNCE_MS,
      }
    );
  }

  // ─── Trigger Save (entry point from IPC) ─────────────────────────────────

  async triggerSave(chapterId: string, content: string, projectId: string) {
    const config = this.getConfig(projectId);

    if (!config.enabled) {
      return;
    }

    const chapter = await db.getClient().chapter.findUnique({
      where: { id: chapterId },
      select: { projectId: true, deletedAt: true },
    });
    if (
      !chapter ||
      String((chapter as { projectId: unknown }).projectId) !== projectId ||
      Boolean((chapter as { deletedAt?: unknown }).deletedAt)
    ) {
      logger.info("Skipping auto-save for missing/deleted chapter", {
        chapterId,
        projectId,
      });
      return;
    }

    // Track pending content
    this.pendingSaves.set(chapterId, { chapterId, content, projectId });
    this.lastSaveAt.set(chapterId, Date.now());

    // Immediately write mirror (crash safety net)
    await this.writeLatestMirror(projectId, chapterId, content);

    // Emergency micro snapshot for very short content
    void this.maybeCreateEmergencySnapshot(projectId, chapterId, content);

    // Debounce the actual DB save
    const existingTimer = this.saveTimers.get(chapterId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      await this.performSave(chapterId);
    }, config.debounceMs);

    this.saveTimers.set(chapterId, timer);
  }

  // ─── Core Save Logic ─────────────────────────────────────────────────────

  private async performSave(chapterId: string) {
    const pending = this.pendingSaves.get(chapterId);
    if (!pending) return;

    try {
      await chapterService.updateChapter({
        id: pending.chapterId,
        content: pending.content,
      });

      this.pendingSaves.delete(chapterId);
      this.saveTimers.delete(chapterId);
      this.lastSaveAt.delete(chapterId);
      this.emit("saved", { chapterId });

      // Post-save: update mirror and maybe enqueue snapshot
      await this.writeLatestMirror(pending.projectId, pending.chapterId, pending.content);
      this.maybeEnqueueSnapshot(pending.projectId, pending.chapterId, pending.content);

      logger.info("Auto-save completed", { chapterId });
    } catch (error) {
      // Validation-blocked save: still create safety snapshot
      if (isServiceError(error) && error.code === ErrorCode.VALIDATION_FAILED) {
        logger.warn("Auto-save blocked by validation; writing safety snapshot", {
          chapterId,
          error,
        });

        try {
          await this.writeLatestMirror(pending.projectId, pending.chapterId, pending.content);
          await this.writeTimestampedMirror(pending.projectId, pending.chapterId, pending.content);
          await snapshotService.createSnapshot({
            projectId: pending.projectId,
            chapterId: pending.chapterId,
            content: pending.content,
            description: `Safety snapshot (블로킹된 저장) ${new Date().toLocaleString()}`,
          });
        } catch (mirrorError) {
          logger.error("Failed to write safety snapshot after validation block", mirrorError);
        }

        this.pendingSaves.delete(chapterId);
        this.saveTimers.delete(chapterId);
        this.lastSaveAt.delete(chapterId);
        this.emit("save-blocked", { chapterId, error });
        return;
      }

      logger.error("Auto-save failed", error);
      if (this.listenerCount("error") > 0) {
        this.emit("error", { chapterId, error });
      }
    }
  }

  // ─── Snapshot Scheduling (Time Machine style) ────────────────────────────

  private maybeEnqueueSnapshot(projectId: string, chapterId: string, content: string) {
    const key = `${projectId}:${chapterId}`;
    const now = Date.now();
    const lastAt = this.lastSnapshotAt.get(key) ?? 0;

    // Time-based gating
    if (now - lastAt < SNAPSHOT_INTERVAL_MS) return;

    // Content length minimum
    if (content.length < SNAPSHOT_MIN_CONTENT_LENGTH) return;

    // Content hash dedup
    const hash = this.hashContent(content);
    const lastHash = this.lastSnapshotHash.get(key);
    if (lastHash === hash) return;

    // Change threshold check
    const lastLength = this.lastSnapshotLength.get(key) ?? 0;
    if (lastLength > 0) {
      const diff = Math.abs(content.length - lastLength);
      const ratio = diff / lastLength;
      if (ratio < SNAPSHOT_MIN_CHANGE_RATIO && diff < SNAPSHOT_MIN_CHANGE_ABSOLUTE) return;
    }

    // Accept snapshot
    this.lastSnapshotAt.set(key, now);
    this.lastSnapshotHash.set(key, hash);
    this.lastSnapshotLength.set(key, content.length);

    this.snapshotQueue.push({ projectId, chapterId, content });
    if (!this.snapshotProcessing) {
      this.snapshotProcessing = true;
      setImmediate(() => void this.processSnapshotQueue());
    }
  }

  /**
   * Emergency micro snapshot for very short content (≤ EMERGENCY_SNAPSHOT_MAX_LENGTH chars).
   * Runs on a shorter interval than normal snapshots to ensure even tiny
   * amounts of text are captured.
   */
  private async maybeCreateEmergencySnapshot(
    projectId: string,
    chapterId: string,
    content: string,
  ) {
    if (content.length > EMERGENCY_SNAPSHOT_MAX_LENGTH) return;

    const key = `${projectId}:${chapterId}`;
    const now = Date.now();
    const lastAt = this.lastEmergencySnapshotAt.get(key) ?? 0;
    if (now - lastAt < EMERGENCY_SNAPSHOT_INTERVAL_MS) return;

    this.lastEmergencySnapshotAt.set(key, now);

    try {
      await snapshotService.createSnapshot({
        projectId,
        chapterId,
        content,
        description: `긴급 마이크로 스냅샷 ${new Date().toLocaleString()}`,
      });
      await this.writeTimestampedMirror(projectId, chapterId, content);
    } catch (error) {
      logger.warn("Failed to create emergency micro snapshot", { error, chapterId });
    }
  }

  private async processSnapshotQueue() {
    while (this.snapshotQueue.length > 0) {
      const job = this.snapshotQueue.shift();
      if (!job) continue;

      try {
        await snapshotService.createSnapshot({
          projectId: job.projectId,
          chapterId: job.chapterId,
          content: job.content,
          description: `자동 스냅샷 ${new Date().toLocaleString()}`,
        });

        await snapshotService.deleteOldSnapshots(job.projectId, SNAPSHOT_KEEP_COUNT);
        await this.writeTimestampedMirror(job.projectId, job.chapterId, job.content);
      } catch (error) {
        logger.error("Failed to create snapshot", error);
      }
    }

    this.snapshotProcessing = false;
  }

  // ─── Mirror File I/O ─────────────────────────────────────────────────────

  private getMirrorBaseDir(projectId: string, chapterId: string): string {
    return path.join(
      app.getPath("userData"),
      SNAPSHOT_MIRROR_DIR,
      projectId,
      chapterId,
    );
  }

  /**
   * Write `latest.snap` – always reflects the most recent content.
   * This is the primary crash-safety mirror read at startup.
   */
  private async writeLatestMirror(projectId: string, chapterId: string, content: string) {
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
      logger.error("Failed to write latest mirror", error);
    }
  }

  /**
   * Write timestamped `.snap` file for point-in-time recovery.
   * Old files are pruned to SNAPSHOT_FILE_KEEP_COUNT.
   */
  private async writeTimestampedMirror(projectId: string, chapterId: string, content: string) {
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

      // Prune old timestamped mirrors
      const files = (await fs.readdir(baseDir)).filter(
        (name) => name.endsWith(".snap") && name !== "latest.snap",
      );
      if (files.length > SNAPSHOT_FILE_KEEP_COUNT) {
        const sorted = files.sort();
        const toDelete = sorted.slice(0, files.length - SNAPSHOT_FILE_KEEP_COUNT);
        await Promise.all(
          toDelete.map((name) => fs.unlink(path.join(baseDir, name)).catch(() => undefined)),
        );
      }
    } catch (error) {
      logger.error("Failed to write timestamped mirror", error);
    }
  }

  // ─── Mirror Recovery (startup / shutdown) ─────────────────────────────────

  private async listLatestMirrorFiles(): Promise<string[]> {
    const baseDir = path.join(app.getPath("userData"), SNAPSHOT_MIRROR_DIR);
    const results: string[] = [];

    try {
      const projectDirs = await fs.readdir(baseDir, { withFileTypes: true });
      for (const projectDir of projectDirs) {
        if (!projectDir.isDirectory() || projectDir.name === "_emergency") continue;

        const projectPath = path.join(baseDir, projectDir.name);
        const chapterDirs = await fs.readdir(projectPath, { withFileTypes: true });
        for (const chapterDir of chapterDirs) {
          if (!chapterDir.isDirectory()) continue;
          const latestPath = path.join(projectPath, chapterDir.name, "latest.snap");
          try {
            await fs.stat(latestPath);
            results.push(latestPath);
          } catch {
            // No latest.snap in this chapter dir
          }
        }
      }
    } catch (error) {
      const fsError = error as NodeJS.ErrnoException;
      if (fsError?.code === "ENOENT") {
        return results;
      }
      logger.warn("Failed to list mirror files", error);
    }

    return results;
  }

  private async readMirrorPayload(filePath: string): Promise<MirrorPayload | null> {
    try {
      const raw = await readMaybeGzip(filePath);
      const payload = JSON.parse(raw) as Record<string, unknown>;

      if (typeof payload.projectId !== "string" || typeof payload.chapterId !== "string") {
        return null;
      }

      return {
        projectId: payload.projectId,
        chapterId: payload.chapterId,
        content: typeof payload.content === "string" ? payload.content : "",
        updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : null,
      };
    } catch (error) {
      logger.warn("Failed to read mirror payload", { filePath, error });
      return null;
    }
  }

  /**
   * Convert on-disk mirror files to DB snapshots.
   *
   * - Validates that the chapter still exists in DB (FK safety).
   * - Skips mirrors older than the latest DB snapshot.
   * - Deletes stale mirror files for missing chapters (disk cleanup).
   */
  async flushMirrorsToSnapshots(reason: string) {
    const mirrorFiles = await this.listLatestMirrorFiles();
    let created = 0;
    let cleaned = 0;

    for (const filePath of mirrorFiles) {
      try {
        const payload = await this.readMirrorPayload(filePath);
        if (!payload) continue;

        // FK safety: verify chapter exists
        const chapter = await db.getClient().chapter.findUnique({
          where: { id: payload.chapterId },
          select: { id: true, projectId: true, deletedAt: true },
        });

        if (!chapter) {
          logger.warn("Mirror snapshot skipped (missing chapter), cleaning up stale mirror", {
            chapterId: payload.chapterId,
            filePath,
          });
          await this.cleanStaleMirrorDir(filePath);
          cleaned += 1;
          continue;
        }
        const chapterDeletedAt = (chapter as { deletedAt?: unknown }).deletedAt;
        if (chapterDeletedAt !== null && chapterDeletedAt !== undefined) {
          logger.info("Mirror snapshot skipped (chapter deleted), cleaning up", {
            chapterId: payload.chapterId,
            filePath,
          });
          await this.cleanStaleMirrorDir(filePath);
          cleaned += 1;
          continue;
        }

        if (String((chapter as { projectId: unknown }).projectId) !== payload.projectId) {
          logger.warn("Mirror snapshot skipped (project mismatch), cleaning up", {
            chapterId: payload.chapterId,
            projectId: payload.projectId,
            filePath,
          });
          await this.cleanStaleMirrorDir(filePath);
          cleaned += 1;
          continue;
        }

        // Time check: skip if mirror is older than latest DB snapshot
        const latest = await snapshotService.getLatestSnapshot(payload.chapterId);
        const latestAt = latest?.createdAt
          ? new Date(String(latest.createdAt)).getTime()
          : 0;
        const mirrorAt = payload.updatedAt ? new Date(payload.updatedAt).getTime() : 0;

        if (mirrorAt && mirrorAt <= latestAt) {
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
        logger.warn("Failed to flush mirror snapshot", { error, filePath });
      }
    }

    logger.info("Mirror snapshot flush completed", { created, cleaned, reason });
    return { created, cleaned };
  }

  /**
   * Remove stale mirror directory (for deleted chapters).
   * Deletes all .snap files and the directory itself.
   */
  private async cleanStaleMirrorDir(mirrorFilePath: string) {
    try {
      const dir = path.dirname(mirrorFilePath);
      const files = await fs.readdir(dir);
      await Promise.all(
        files.map((name) => fs.unlink(path.join(dir, name)).catch(() => undefined)),
      );
      await fs.rmdir(dir).catch(() => undefined);
    } catch (error) {
      logger.warn("Failed to clean stale mirror directory", { mirrorFilePath, error });
    }
  }

  // ─── Auto Save Scheduling ────────────────────────────────────────────────

  startAutoSave(projectId: string) {
    const config = this.getConfig(projectId);
    if (!config.enabled) return;

    const existingTimer = this.intervalTimers.get(projectId);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    const timer = setInterval(async () => {
      const pendingSaves = Array.from(this.pendingSaves.entries());
      for (const [chapterId] of pendingSaves) {
        await this.performSave(chapterId);
      }
    }, config.interval);

    this.intervalTimers.set(projectId, timer);
    logger.info("Auto-save started", { projectId, interval: config.interval });
  }

  stopAutoSave(projectId: string) {
    const timer = this.intervalTimers.get(projectId);
    if (timer) {
      clearInterval(timer);
      this.intervalTimers.delete(projectId);
      logger.info("Auto-save stopped", { projectId });
    }

    const snapshotTimer = this.snapshotTimers.get(projectId);
    if (snapshotTimer) {
      clearInterval(snapshotTimer);
      this.snapshotTimers.delete(projectId);
      logger.info("Snapshot schedule stopped", { projectId });
    }
  }

  private startSnapshotSchedule(projectId: string) {
    const existing = this.snapshotTimers.get(projectId);
    if (existing) {
      clearInterval(existing);
    }

    void this.createSnapshot(projectId);

    const timer = setInterval(() => {
      void this.createSnapshot(projectId);
    }, SNAPSHOT_INTERVAL_MS);

    this.snapshotTimers.set(projectId, timer);
    logger.info("Snapshot schedule started", {
      projectId,
      interval: SNAPSHOT_INTERVAL_MS,
    });
  }

  async createSnapshot(projectId: string, chapterId?: string) {
    try {
      if (chapterId) {
        const chapter = await chapterService.getChapter(chapterId);
        const chapterData = chapter as { id?: unknown; content?: unknown };

        await snapshotService.createSnapshot({
          projectId,
          chapterId: String(chapterData.id ?? chapterId),
          content: String(chapterData.content ?? ""),
          description: `자동 스냅샷 ${new Date().toLocaleString()}`,
        });
      } else {
        await snapshotService.createSnapshot({
          projectId,
          content: JSON.stringify({ timestamp: Date.now() }),
          description: `프로젝트 스냅샷 ${new Date().toLocaleString()}`,
        });
      }

      await snapshotService.deleteOldSnapshots(projectId, DEFAULT_PROJECT_SNAPSHOT_KEEP_COUNT);
      logger.info("Snapshot created", { projectId, chapterId });
    } catch (error) {
      logger.error("Failed to create snapshot", error);
    }
  }

  // ─── Flush (quit / critical) ──────────────────────────────────────────────

  /**
   * Flush ALL pending saves to DB. Used during normal quit.
   */
  async flushAll() {
    const pendingSaves = Array.from(this.pendingSaves.keys());
    for (const chapterId of pendingSaves) {
      await this.performSave(chapterId);
    }
  }

  /**
   * Emergency flush: write mirrors + snapshots for all pending content.
   * Called when time is critical (app crashing, OS killing process).
   * Returns counts for diagnostics.
   */
  async flushCritical(): Promise<{ mirrored: number; snapshots: number }> {
    const pending = Array.from(this.pendingSaves.values());
    if (pending.length === 0) {
      return { mirrored: 0, snapshots: 0 };
    }

    let mirrored = 0;
    let snapshots = 0;

    // Phase 1: write mirrors (fastest, most important)
    for (const entry of pending) {
      try {
        await this.writeLatestMirror(entry.projectId, entry.chapterId, entry.content);
        mirrored += 1;
      } catch (error) {
        logger.error("Emergency mirror write failed", error);
      }
    }

    // Phase 2: create DB snapshots (slower but more accessible)
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
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  private hashContent(content: string): number {
    let hash = 0;
    for (let i = 0; i < content.length; i += 1) {
      hash = (hash * 31 + content.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  private startCleanupInterval() {
    setInterval(() => {
      this.cleanupOldEntries();
    }, AUTO_SAVE_CLEANUP_INTERVAL_MS);
  }

  private cleanupOldEntries() {
    const now = Date.now();
    for (const [chapterId, timestamp] of Array.from(this.lastSaveAt.entries())) {
      if (now - timestamp > AUTO_SAVE_STALE_THRESHOLD_MS) {
        const timer = this.saveTimers.get(chapterId);
        if (timer) {
          clearTimeout(timer);
        }
        this.saveTimers.delete(chapterId);
        this.pendingSaves.delete(chapterId);
        this.lastSaveAt.delete(chapterId);
      }
    }
  }

  clearProject(projectId: string) {
    this.stopAutoSave(projectId);
    this.configs.delete(projectId);
  }
}

export const autoSaveManager = AutoSaveManager.getInstance();
