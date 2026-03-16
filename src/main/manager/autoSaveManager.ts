/** Auto-save orchestration: debounce, mirror safety, snapshot scheduling, and shutdown flush. */

import { EventEmitter } from "events";
import { promises as fs } from "fs";
import { createLogger } from "../../shared/logger/index.js";
import { ErrorCode } from "../../shared/constants/index.js";
import { isServiceError } from "../utils/serviceError.js";
import {
  DEFAULT_AUTO_SAVE_DEBOUNCE_MS,
  DEFAULT_AUTO_SAVE_INTERVAL_MS,
  AUTO_SAVE_CLEANUP_INTERVAL_MS,
  AUTO_SAVE_STALE_THRESHOLD_MS,
  SNAPSHOT_INTERVAL_MS,
  SNAPSHOT_MIN_CONTENT_LENGTH,
  SNAPSHOT_MIN_CHANGE_RATIO,
  SNAPSHOT_MIN_CHANGE_ABSOLUTE,
  EMERGENCY_SNAPSHOT_MAX_LENGTH,
  EMERGENCY_SNAPSHOT_INTERVAL_MS,
} from "../../shared/constants/index.js";
import { AutoSaveMirrorStore } from "./autoSave/autoSaveMirrorStore.js";
import type { AutoSaveConfig, PendingSave } from "./autoSave/autoSaveTypes.js";
import {
  createScheduledSnapshot,
  flushAllPendingSaves,
  flushCriticalPendingSaves,
} from "./autoSave/autoSaveFlushOps.js";
import {
  maybeCreateEmergencySnapshot,
  processSnapshotJobs,
  type SnapshotJob,
} from "./autoSave/autoSaveSnapshotJobs.js";

const logger = createLogger("AutoSaveManager");

const loadChapterService = async () =>
  (await import("../services/core/chapterService.js")).chapterService;

const loadSnapshotService = async () =>
  (await import("../services/features/snapshot/snapshotService.js"))
    .snapshotService;

const loadDb = async () => (await import("../database/index.js")).db;

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
  private projectTaskQueue = new Map<string, Promise<void>>();
  private criticalFlushPromise: Promise<{
    mirrored: number;
    snapshots: number;
  }> | null = null;
  private readonly mirrorStore = new AutoSaveMirrorStore(logger);

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
      const baseDir = this.mirrorStore.getMirrorBaseDir(projectId, chapterId);
      await fs.rm(baseDir, { recursive: true, force: true });
    } catch (error) {
      logger.warn("Failed to purge chapter mirrors", {
        projectId,
        chapterId,
        error,
      });
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

    const db = await loadDb();
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
    await this.mirrorStore.writeLatestMirror(projectId, chapterId, content);

    // Emergency micro snapshot for very short content
    void maybeCreateEmergencySnapshot({
      projectId,
      chapterId,
      content,
      maxLength: EMERGENCY_SNAPSHOT_MAX_LENGTH,
      minIntervalMs: EMERGENCY_SNAPSHOT_INTERVAL_MS,
      lastSnapshotAtByChapterKey: this.lastEmergencySnapshotAt,
      writeTimestampedMirror: (
        targetProjectId,
        targetChapterId,
        targetContent,
      ) =>
        this.mirrorStore.writeTimestampedMirror(
          targetProjectId,
          targetChapterId,
          targetContent,
        ),
      logger,
    });

    // Debounce the actual DB save
    const existingTimer = this.saveTimers.get(chapterId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      await this.performSave(chapterId);
    }, config.debounceMs);
    if (typeof timer.unref === "function") {
      timer.unref();
    }

    this.saveTimers.set(chapterId, timer);
  }

  // ─── Core Save Logic ─────────────────────────────────────────────────────

  private async performSave(chapterId: string) {
    const pending = this.pendingSaves.get(chapterId);
    if (!pending) return;

    try {
      const chapterService = await loadChapterService();
      await chapterService.updateChapter({
        id: pending.chapterId,
        content: pending.content,
      });

      this.pendingSaves.delete(chapterId);
      this.saveTimers.delete(chapterId);
      this.lastSaveAt.delete(chapterId);
      this.emit("saved", { chapterId });

      // Post-save: update mirror and maybe enqueue snapshot
      await this.mirrorStore.writeLatestMirror(
        pending.projectId,
        pending.chapterId,
        pending.content,
      );
      this.maybeEnqueueSnapshot(
        pending.projectId,
        pending.chapterId,
        pending.content,
      );

      logger.info("Auto-save completed", { chapterId });
    } catch (error) {
      // Validation-blocked save: still create safety snapshot
      if (isServiceError(error) && error.code === ErrorCode.VALIDATION_FAILED) {
        logger.warn(
          "Auto-save blocked by validation; writing safety snapshot",
          {
            chapterId,
            error,
          },
        );

        try {
          const snapshotService = await loadSnapshotService();
          await this.mirrorStore.writeLatestMirror(
            pending.projectId,
            pending.chapterId,
            pending.content,
          );
          await this.mirrorStore.writeTimestampedMirror(
            pending.projectId,
            pending.chapterId,
            pending.content,
          );
          await snapshotService.createSnapshot({
            projectId: pending.projectId,
            chapterId: pending.chapterId,
            content: pending.content,
            description: `Safety snapshot (블로킹된 저장) ${new Date().toLocaleString()}`,
          });
        } catch (mirrorError) {
          logger.error(
            "Failed to write safety snapshot after validation block",
            mirrorError,
          );
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

  private maybeEnqueueSnapshot(
    projectId: string,
    chapterId: string,
    content: string,
  ) {
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
      if (
        ratio < SNAPSHOT_MIN_CHANGE_RATIO &&
        diff < SNAPSHOT_MIN_CHANGE_ABSOLUTE
      )
        return;
    }

    // Accept snapshot
    this.lastSnapshotAt.set(key, now);
    this.lastSnapshotHash.set(key, hash);
    this.lastSnapshotLength.set(key, content.length);

    this.snapshotQueue.push({ projectId, chapterId, content });
    if (!this.snapshotProcessing) {
      this.snapshotProcessing = true;
      setImmediate(async () => {
        try {
          await processSnapshotJobs({
            jobs: this.snapshotQueue,
            writeTimestampedMirror: (
              targetProjectId,
              targetChapterId,
              targetContent,
            ) =>
              this.mirrorStore.writeTimestampedMirror(
                targetProjectId,
                targetChapterId,
                targetContent,
              ),
            logger,
          });
        } finally {
          this.snapshotProcessing = false;
        }
      });
    }
  }

  private enqueueProjectTask(
    projectId: string,
    task: () => Promise<void>,
  ): Promise<void> {
    const previous = this.projectTaskQueue.get(projectId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(task);
    const marker = next.finally(() => {
      if (this.projectTaskQueue.get(projectId) === marker) {
        this.projectTaskQueue.delete(projectId);
      }
    });
    this.projectTaskQueue.set(projectId, marker);
    return marker;
  }

  // ─── Mirror Recovery (startup / shutdown) ─────────────────────────────────

  async flushMirrorsToSnapshots(reason: string) {
    return this.mirrorStore.flushMirrorsToSnapshots(reason);
  }

  // ─── Auto Save Scheduling ────────────────────────────────────────────────

  startAutoSave(projectId: string) {
    const config = this.getConfig(projectId);
    if (!config.enabled) return;

    const existingTimer = this.intervalTimers.get(projectId);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    const timer = setInterval(() => {
      void this.enqueueProjectTask(projectId, async () => {
        const pendingSaves = Array.from(this.pendingSaves.entries()).filter(
          ([, pending]) => pending.projectId === projectId,
        );
        await pendingSaves.reduce<Promise<void>>(
          (chain, [chapterId]) =>
            chain.then(async () => {
              await this.performSave(chapterId);
            }),
          Promise.resolve(),
        );
      });
    }, config.interval);
    if (typeof timer.unref === "function") {
      timer.unref();
    }

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

    void this.enqueueProjectTask(projectId, async () => {
      await this.createSnapshot(projectId);
    });

    const timer = setInterval(() => {
      void this.enqueueProjectTask(projectId, async () => {
        await this.createSnapshot(projectId);
      });
    }, SNAPSHOT_INTERVAL_MS);
    if (typeof timer.unref === "function") {
      timer.unref();
    }

    this.snapshotTimers.set(projectId, timer);
    logger.info("Snapshot schedule started", {
      projectId,
      interval: SNAPSHOT_INTERVAL_MS,
    });
  }

  async createSnapshot(projectId: string, chapterId?: string) {
    await createScheduledSnapshot(projectId, logger, chapterId);
  }

  // ─── Flush (quit / critical) ──────────────────────────────────────────────

  /**
   * Flush ALL pending saves to DB. Used during normal quit.
   */
  async flushAll() {
    await flushAllPendingSaves(
      this.pendingSaves,
      (projectId, task) => this.enqueueProjectTask(projectId, task),
      (chapterId) => this.performSave(chapterId),
    );
  }

  /**
   * Emergency flush: write mirrors + snapshots for all pending content.
   * Called when time is critical (app crashing, OS killing process).
   * Returns counts for diagnostics.
   */
  async flushCritical(): Promise<{ mirrored: number; snapshots: number }> {
    if (this.criticalFlushPromise) {
      return this.criticalFlushPromise;
    }

    this.criticalFlushPromise = flushCriticalPendingSaves(
      Array.from(this.pendingSaves.values()),
      (projectId, chapterId, content) =>
        this.mirrorStore.writeLatestMirror(projectId, chapterId, content),
      logger,
    );

    try {
      return await this.criticalFlushPromise;
    } finally {
      this.criticalFlushPromise = null;
    }
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
    const cleanupTimer = setInterval(() => {
      this.cleanupOldEntries();
    }, AUTO_SAVE_CLEANUP_INTERVAL_MS);
    if (typeof cleanupTimer.unref === "function") {
      cleanupTimer.unref();
    }
  }

  private cleanupOldEntries() {
    const now = Date.now();
    for (const [chapterId, timestamp] of Array.from(
      this.lastSaveAt.entries(),
    )) {
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
