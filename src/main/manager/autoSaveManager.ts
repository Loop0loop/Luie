/**
 * Auto save manager - 자동 저장 관리 (디바운싱 포함)
 */

import { EventEmitter } from "events";
import { app } from "electron";
import { promises as fs } from "fs";
import { promisify } from "node:util";
import { gzip as gzipCallback } from "node:zlib";
import path from "path";
import { chapterService } from "../services/core/chapterService.js";
import { snapshotService } from "../services/features/snapshotService.js";
import { createLogger } from "../../shared/logger/index.js";
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
} from "../../shared/constants/index.js";

const logger = createLogger("AutoSaveManager");
const gzip = promisify(gzipCallback);

interface AutoSaveConfig {
  enabled: boolean;
  interval: number;
  debounceMs: number;
}

export class AutoSaveManager extends EventEmitter {
  private static instance: AutoSaveManager;
  private saveTimers: Map<string, NodeJS.Timeout> = new Map();
  private intervalTimers: Map<string, NodeJS.Timeout> = new Map();
  private configs: Map<string, AutoSaveConfig> = new Map();
  private pendingSaves: Map<string, { chapterId: string; content: string; projectId: string }> =
    new Map();
  private lastSaveAt: Map<string, number> = new Map();
  private snapshotTimers: Map<string, NodeJS.Timeout> = new Map();
  private lastSnapshotAt: Map<string, number> = new Map();
  private lastSnapshotHash: Map<string, number> = new Map();
  private lastSnapshotLength: Map<string, number> = new Map();
  private snapshotQueue: Array<{ projectId: string; chapterId: string; content: string }> = [];
  private snapshotProcessing = false;

  private static SNAPSHOT_INTERVAL_MS = SNAPSHOT_INTERVAL_MS;
  private static SNAPSHOT_KEEP_COUNT = SNAPSHOT_KEEP_COUNT;
  private static SNAPSHOT_FILE_KEEP_COUNT = SNAPSHOT_FILE_KEEP_COUNT;

  private constructor() {
    super();
    this.startCleanupInterval();
  }

  static getInstance(): AutoSaveManager {
    if (!AutoSaveManager.instance) {
      AutoSaveManager.instance = new AutoSaveManager();
    }
    return AutoSaveManager.instance;
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

  async triggerSave(chapterId: string, content: string, projectId: string) {
    const config = this.getConfig(projectId);

    if (!config.enabled) {
      return;
    }

    this.pendingSaves.set(chapterId, { chapterId, content, projectId });
    this.lastSaveAt.set(chapterId, Date.now());

    await this.writeLatestMirror(projectId, chapterId, content);

    const existingTimer = this.saveTimers.get(chapterId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      await this.performSave(chapterId);
    }, config.debounceMs);

    this.saveTimers.set(chapterId, timer);
  }

  private async performSave(chapterId: string) {
    const pending = this.pendingSaves.get(chapterId);

    if (!pending) {
      return;
    }

    try {
      await chapterService.updateChapter({
        id: pending.chapterId,
        content: pending.content,
      });

      this.pendingSaves.delete(chapterId);
      this.saveTimers.delete(chapterId);
      this.lastSaveAt.delete(chapterId);

      this.emit("saved", { chapterId });

      await this.writeLatestMirror(pending.projectId, pending.chapterId, pending.content);
      this.maybeEnqueueSnapshot(pending.projectId, pending.chapterId, pending.content);

      logger.info("Auto-save completed", { chapterId });
    } catch (error) {
      logger.error("Auto-save failed", error);
      this.emit("error", { chapterId, error });
    }
  }

  private maybeEnqueueSnapshot(projectId: string, chapterId: string, content: string) {
    const key = `${projectId}:${chapterId}`;
    const now = Date.now();
    const lastAt = this.lastSnapshotAt.get(key) ?? 0;

    if (now - lastAt < AutoSaveManager.SNAPSHOT_INTERVAL_MS) return;

    if (content.length < SNAPSHOT_MIN_CONTENT_LENGTH) return;

    const hash = this.hashContent(content);
    const lastHash = this.lastSnapshotHash.get(key);
    if (lastHash === hash) return;

    const lastLength = this.lastSnapshotLength.get(key) ?? 0;
    if (lastLength > 0) {
      const diff = Math.abs(content.length - lastLength);
      const ratio = diff / lastLength;
      if (ratio < SNAPSHOT_MIN_CHANGE_RATIO && diff < SNAPSHOT_MIN_CHANGE_ABSOLUTE) return;
    }

    this.lastSnapshotAt.set(key, now);
    this.lastSnapshotHash.set(key, hash);
    this.lastSnapshotLength.set(key, content.length);

    this.snapshotQueue.push({ projectId, chapterId, content });
    if (!this.snapshotProcessing) {
      this.snapshotProcessing = true;
      setImmediate(() => void this.processSnapshotQueue());
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
          description: `Auto snapshot ${new Date().toLocaleString()}`,
        });

        await snapshotService.deleteOldSnapshots(
          job.projectId,
          AutoSaveManager.SNAPSHOT_KEEP_COUNT,
        );

        await this.writeSnapshotMirror(job.projectId, job.chapterId, job.content);
      } catch (error) {
        logger.error("Failed to create snapshot", error);
      }
    }

    this.snapshotProcessing = false;
  }

  private async writeSnapshotMirror(projectId: string, chapterId: string, content: string) {
    try {
      const baseDir = path.join(
        app.getPath("userData"),
        SNAPSHOT_MIRROR_DIR,
        projectId,
        chapterId,
      );
      await fs.mkdir(baseDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filePath = path.join(baseDir, `${timestamp}.snap`);
      const payload = JSON.stringify(
        { projectId, chapterId, content, createdAt: new Date().toISOString() },
        null,
        2,
      );
      await this.writeSnapAtomic(filePath, payload);

      const files = (await fs.readdir(baseDir)).filter((name) => name.endsWith(".snap"));
      if (files.length > AutoSaveManager.SNAPSHOT_FILE_KEEP_COUNT) {
        const sorted = files.sort();
        const toDelete = sorted.slice(0, files.length - AutoSaveManager.SNAPSHOT_FILE_KEEP_COUNT);
        await Promise.all(
          toDelete.map((name) => fs.unlink(path.join(baseDir, name)).catch(() => undefined)),
        );
      }
    } catch (error) {
      logger.error("Failed to write snapshot mirror", error);
    }
  }

  private async writeLatestMirror(projectId: string, chapterId: string, content: string) {
    try {
      const baseDir = path.join(
        app.getPath("userData"),
        SNAPSHOT_MIRROR_DIR,
        projectId,
        chapterId,
      );
      await fs.mkdir(baseDir, { recursive: true });
      const targetPath = path.join(baseDir, "latest.snap");
      const payload = JSON.stringify(
        { projectId, chapterId, content, updatedAt: new Date().toISOString() },
        null,
        2,
      );
      await this.writeSnapAtomic(targetPath, payload);
    } catch (error) {
      logger.error("Failed to write latest mirror", error);
    }
  }

  private async writeSnapAtomic(targetPath: string, payload: string) {
    const dir = path.dirname(targetPath);
    const tempPath = path.join(dir, `${path.basename(targetPath)}.tmp-${Date.now()}`);
    const buffer = await gzip(Buffer.from(payload, "utf8"));
    await fs.writeFile(tempPath, buffer);
    const handle = await fs.open(tempPath, "r+");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(tempPath, targetPath);
  }

  private hashContent(content: string) {
    let hash = 0;
    for (let i = 0; i < content.length; i += 1) {
      hash = (hash * 31 + content.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  startAutoSave(projectId: string) {
    const config = this.getConfig(projectId);

    if (!config.enabled) {
      return;
    }

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
    }, AutoSaveManager.SNAPSHOT_INTERVAL_MS);

    this.snapshotTimers.set(projectId, timer);
    logger.info("Snapshot schedule started", {
      projectId,
      interval: AutoSaveManager.SNAPSHOT_INTERVAL_MS,
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
          description: `Auto-snapshot at ${new Date().toLocaleString()}`,
        });
      } else {
        await snapshotService.createSnapshot({
          projectId,
          content: JSON.stringify({ timestamp: Date.now() }),
          description: `Project snapshot at ${new Date().toLocaleString()}`,
        });
      }

      await snapshotService.deleteOldSnapshots(projectId, DEFAULT_PROJECT_SNAPSHOT_KEEP_COUNT);

      logger.info("Snapshot created", { projectId, chapterId });
    } catch (error) {
      logger.error("Failed to create snapshot", error);
    }
  }

  async flushAll() {
    const pendingSaves = Array.from(this.pendingSaves.keys());

    for (const chapterId of pendingSaves) {
      await this.performSave(chapterId);
    }
  }

  private startCleanupInterval() {
    setInterval(() => {
      this.cleanupOldEntries();
    }, AUTO_SAVE_CLEANUP_INTERVAL_MS);
  }

  private cleanupOldEntries() {
    const now = Date.now();
    const staleThreshold = AUTO_SAVE_STALE_THRESHOLD_MS;

    for (const [chapterId, timestamp] of Array.from(this.lastSaveAt.entries())) {
      if (now - timestamp > staleThreshold) {
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
