/**
 * Auto save manager - 자동 저장 관리 (디바운싱 포함)
 */

import { EventEmitter } from "events";
import { chapterService } from "../services/chapterService.js";
import { snapshotService } from "../services/snapshotService.js";
import { createLogger } from "../../shared/logger/index.js";

const logger = createLogger("AutoSaveManager");

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
  private pendingSaves: Map<string, { chapterId: string; content: string }> =
    new Map();

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
    }
  }

  getConfig(projectId: string): AutoSaveConfig {
    return (
      this.configs.get(projectId) || {
        enabled: true,
        interval: 30000,
        debounceMs: 1000,
      }
    );
  }

  async triggerSave(chapterId: string, content: string, projectId: string) {
    const config = this.getConfig(projectId);

    if (!config.enabled) {
      return;
    }

    this.pendingSaves.set(chapterId, { chapterId, content });

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

      this.emit("saved", { chapterId });

      logger.info("Auto-save completed", { chapterId });
    } catch (error) {
      logger.error("Auto-save failed", error);
      this.emit("error", { chapterId, error });
    }
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

      for (const [chapterId, _] of pendingSaves) {
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
  }

  async createSnapshot(projectId: string, chapterId?: string) {
    try {
      if (chapterId) {
        const chapter = await chapterService.getChapter(chapterId);

        await snapshotService.createSnapshot({
          projectId,
          chapterId: chapter.id,
          content: chapter.content,
          description: `Auto-snapshot at ${new Date().toLocaleString()}`,
        });
      } else {
        await snapshotService.createSnapshot({
          projectId,
          content: JSON.stringify({ timestamp: Date.now() }),
          description: `Project snapshot at ${new Date().toLocaleString()}`,
        });
      }

      await snapshotService.deleteOldSnapshots(projectId, 20);

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
    }, 60000);
  }

  private cleanupOldEntries() {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000;

    for (const [chapterId, timestamp] of Array.from(
      this.saveTimers.entries(),
    )) {
      if (typeof timestamp === "number" && now - timestamp > staleThreshold) {
        this.saveTimers.delete(chapterId);
        this.pendingSaves.delete(chapterId);
      }
    }
  }

  clearProject(projectId: string) {
    this.stopAutoSave(projectId);
    this.configs.delete(projectId);
  }
}

export const autoSaveManager = AutoSaveManager.getInstance();
