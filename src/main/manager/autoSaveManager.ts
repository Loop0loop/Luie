/** Auto-save orchestration: debounce, mirror safety, snapshot scheduling, and shutdown flush. */

import { EventEmitter } from "events";
import { createLogger } from "../../shared/logger/index.js";
import {
  DEFAULT_AUTO_SAVE_DEBOUNCE_MS,
  DEFAULT_AUTO_SAVE_INTERVAL_MS,
  AUTO_SAVE_CLEANUP_INTERVAL_MS,
  AUTO_SAVE_STALE_THRESHOLD_MS,
  EMERGENCY_SNAPSHOT_MAX_LENGTH,
  EMERGENCY_SNAPSHOT_INTERVAL_MS,
  SNAPSHOT_INTERVAL_MS,
} from "../../shared/constants/index.js";
import { AutoSaveMirrorStore } from "./autoSave/autoSaveMirrorStore.js";
import type {
  AutoSaveConfig,
  AutoSaveRuntimeCounters,
  AutoSaveRuntimeStats,
  PendingSave,
} from "./autoSave/autoSaveTypes.js";
import {
  createAutoSaveRuntimeCounters,
  getAutoSaveRuntimeStats,
} from "./autoSave/autoSaveRuntimeStats.js";
import { verifyChapterProject } from "./autoSave/autoSaveChapterVerification.js";
import { queueLatestMirrorWrite } from "./autoSave/autoSaveMirrorQueue.js";
import { maybeEnqueueSnapshotJob } from "./autoSave/autoSaveSnapshotGate.js";
import {
  clearProjectState,
  cleanupOldPendingSaves,
  forgetChapterState,
  startAutoSaveCleanupInterval,
} from "./autoSave/autoSaveChapterCleanup.js";
import { writeValidationBlockedSafetySnapshot } from "./autoSave/autoSaveSafetySnapshot.js";
import { createAutoSaveInterval } from "./autoSave/autoSaveInterval.js";
import { performAutoSave } from "./autoSave/autoSavePerformSave.js";
import {
  createScheduledSnapshot,
  flushAllPendingSaves,
  flushCriticalPendingSaves,
} from "./autoSave/autoSaveFlushOps.js";
import {
  maybeCreateEmergencySnapshot,
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

  private saveTimers = new Map<string, NodeJS.Timeout>();
  private intervalTimers = new Map<string, NodeJS.Timeout>();
  private configs = new Map<string, AutoSaveConfig>();
  private pendingSaves = new Map<string, PendingSave>();
  private lastSaveAt = new Map<string, number>();
  private firstQueuedAt = new Map<string, number>();
  private verifiedChapterProjectId = new Map<string, string>();
  private mirrorWriteQueue = new Map<string, Promise<void>>();
  private mirrorPendingPayload = new Map<string, PendingSave>();
  private warmupPromise: Promise<void> | null = null;

  private stats: AutoSaveRuntimeCounters = createAutoSaveRuntimeCounters();

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
    void this.prewarmDependencies();
  }

  static getInstance(): AutoSaveManager {
    if (!AutoSaveManager.instance) {
      AutoSaveManager.instance = new AutoSaveManager();
    }
    return AutoSaveManager.instance;
  }

  hasPendingSaves(): boolean {
    return this.pendingSaves.size > 0;
  }

  getPendingSaveCount(): number {
    return this.pendingSaves.size;
  }

  getPendingChapterIds(): string[] {
    return Array.from(this.pendingSaves.keys());
  }

  getRuntimeStats(): AutoSaveRuntimeStats {
    return getAutoSaveRuntimeStats({
      counters: this.stats,
      pendingCount: this.pendingSaves.size,
      scheduledCount: this.saveTimers.size,
      snapshotQueueLength: this.snapshotQueue.length,
    });
  }

  async forgetChapter(projectId: string, chapterId: string): Promise<void> {
    this.snapshotQueue = await forgetChapterState({
      projectId,
      chapterId,
      saveTimers: this.saveTimers,
      pendingSaves: this.pendingSaves,
      lastSaveAt: this.lastSaveAt,
      firstQueuedAt: this.firstQueuedAt,
      verifiedChapterProjectId: this.verifiedChapterProjectId,
      mirrorPendingPayload: this.mirrorPendingPayload,
      lastSnapshotAt: this.lastSnapshotAt,
      lastSnapshotHash: this.lastSnapshotHash,
      lastSnapshotLength: this.lastSnapshotLength,
      lastEmergencySnapshotAt: this.lastEmergencySnapshotAt,
      snapshotQueue: this.snapshotQueue,
      getMirrorBaseDir: (targetProjectId, targetChapterId) =>
        this.mirrorStore.getMirrorBaseDir(targetProjectId, targetChapterId),
      logger,
    });
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
    this.stats.triggered += 1;
    const config = this.getConfig(projectId);

    if (!config.enabled) {
      this.stats.skippedDisabled += 1;
      return;
    }

    const knownProjectId = this.verifiedChapterProjectId.get(chapterId);
    if (knownProjectId !== projectId) {
      const isValidChapter = await verifyChapterProject({
        chapterId,
        projectId,
        loadDb,
      });
      if (!isValidChapter) {
        this.stats.skippedMissingChapter += 1;
        logger.info("Skipping auto-save for missing/deleted chapter", {
          chapterId,
          projectId,
        });
        return;
      }
      this.verifiedChapterProjectId.set(chapterId, projectId);
    }

    const existingPending = this.pendingSaves.get(chapterId);
    if (existingPending && existingPending.content === content) {
      this.stats.duplicateTriggers += 1;
    }
    if (!this.firstQueuedAt.has(chapterId)) {
      this.firstQueuedAt.set(chapterId, Date.now());
    }
    this.pendingSaves.set(chapterId, { chapterId, content, projectId, timestamp: Date.now() });
    this.lastSaveAt.set(chapterId, Date.now());

    this.queueMirrorWrite({
      projectId,
      chapterId,
      content,
      timestamp: Date.now(),
    });

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

    const existingTimer = this.saveTimers.get(chapterId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.stats.rescheduled += 1;
    }

    const timer = setTimeout(async () => {
      await this.performSave(chapterId);
    }, config.debounceMs);
    if (typeof timer.unref === "function") {
      timer.unref();
    }

    this.saveTimers.set(chapterId, timer);
    this.stats.scheduled += 1;
  }

  private async performSave(chapterId: string) {
    await performAutoSave({
      chapterId,
      pendingSaves: this.pendingSaves,
      saveTimers: this.saveTimers,
      lastSaveAt: this.lastSaveAt,
      firstQueuedAt: this.firstQueuedAt,
      stats: this.stats,
      loadChapterService,
      queueMirrorWrite: (pending) => this.queueMirrorWrite(pending),
      maybeEnqueueSnapshot: (projectId, targetChapterId, content) =>
        this.maybeEnqueueSnapshot(projectId, targetChapterId, content),
      writeValidationBlockedSafetySnapshot: (pending) =>
        writeValidationBlockedSafetySnapshot({
          pending,
          loadSnapshotService,
          writeLatestMirror: (projectId, targetChapterId, targetContent) =>
            this.mirrorStore.writeLatestMirror(
              projectId,
              targetChapterId,
              targetContent,
            ),
          writeTimestampedMirror: (
            projectId,
            targetChapterId,
            targetContent,
          ) =>
            this.mirrorStore.writeTimestampedMirror(
              projectId,
              targetChapterId,
              targetContent,
            ),
          logger,
        }),
      emitSaved: (targetChapterId) =>
        this.emit("saved", { chapterId: targetChapterId }),
      emitSaveBlocked: (targetChapterId, error) =>
        this.emit("save-blocked", { chapterId: targetChapterId, error }),
      emitError: (targetChapterId, error) =>
        this.emit("error", { chapterId: targetChapterId, error }),
      canEmitError: () => this.listenerCount("error") > 0,
      logger,
    });
  }

  private maybeEnqueueSnapshot(
    projectId: string,
    chapterId: string,
    content: string,
  ) {
    maybeEnqueueSnapshotJob({
      projectId,
      chapterId,
      content,
      lastSnapshotAt: this.lastSnapshotAt,
      lastSnapshotHash: this.lastSnapshotHash,
      lastSnapshotLength: this.lastSnapshotLength,
      snapshotQueue: this.snapshotQueue,
      isSnapshotProcessing: () => this.snapshotProcessing,
      setSnapshotProcessing: (processing) => {
        this.snapshotProcessing = processing;
      },
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

  async flushMirrorsToSnapshots(reason: string) {
    return this.mirrorStore.flushMirrorsToSnapshots(reason);
  }

  startAutoSave(projectId: string) {
    const config = this.getConfig(projectId);
    if (!config.enabled) return;

    const existingTimer = this.intervalTimers.get(projectId);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    const timer = createAutoSaveInterval({
      projectId,
      config,
      pendingSaves: this.pendingSaves,
      lastSaveAt: this.lastSaveAt,
      enqueueProjectTask: (targetProjectId, task) =>
        this.enqueueProjectTask(targetProjectId, task),
      performSave: (targetChapterId) => this.performSave(targetChapterId),
    });

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

  async flushAll() {
    await flushAllPendingSaves(
      this.pendingSaves,
      (projectId, task) => this.enqueueProjectTask(projectId, task),
      (chapterId) => this.performSave(chapterId),
    );
  }

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

  private startCleanupInterval() {
    startAutoSaveCleanupInterval({
      intervalMs: AUTO_SAVE_CLEANUP_INTERVAL_MS,
      cleanup: () => this.cleanupOldEntries(),
    });
  }

  private cleanupOldEntries() {
    cleanupOldPendingSaves({
      now: Date.now(),
      staleThresholdMs: AUTO_SAVE_STALE_THRESHOLD_MS,
      saveTimers: this.saveTimers,
      pendingSaves: this.pendingSaves,
      lastSaveAt: this.lastSaveAt,
      firstQueuedAt: this.firstQueuedAt,
      logger,
    });
  }

  clearProject(projectId: string) {
    clearProjectState({
      projectId,
      configs: this.configs,
      verifiedChapterProjectId: this.verifiedChapterProjectId,
      stopAutoSave: (targetProjectId) => this.stopAutoSave(targetProjectId),
    });
  }

  private prewarmDependencies(): void {
    if (this.warmupPromise) return;
    this.warmupPromise = Promise.all([
      loadChapterService(),
      loadSnapshotService(),
      loadDb(),
    ])
      .then(() => undefined)
      .catch((error) => {
        logger.warn("Auto-save dependency prewarm failed", { error });
      });
  }

  private queueMirrorWrite(pending: PendingSave): void {
    queueLatestMirrorWrite({
      pending,
      mirrorPendingPayload: this.mirrorPendingPayload,
      mirrorWriteQueue: this.mirrorWriteQueue,
      writeLatestMirror: (projectId, chapterId, content) =>
        this.mirrorStore.writeLatestMirror(projectId, chapterId, content),
      logger,
    });
  }
}

export const autoSaveManager = AutoSaveManager.getInstance();
