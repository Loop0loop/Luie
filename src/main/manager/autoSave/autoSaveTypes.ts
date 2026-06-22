export interface AutoSaveConfig {
  enabled: boolean;
  interval: number;
  debounceMs: number;
}

export interface PendingSave {
  chapterId: string;
  content: string;
  projectId: string;
  timestamp: number;
}

export interface AutoSaveRuntimeStats {
  triggered: number;
  skippedDisabled: number;
  skippedMissingChapter: number;
  duplicateTriggers: number;
  scheduled: number;
  rescheduled: number;
  saveStarted: number;
  saveSucceeded: number;
  saveFailed: number;
  validationBlocked: number;
  lastQueueDelayMs: number;
  averageQueueDelayMs: number;
  lastSaveDurationMs: number;
  averageSaveDurationMs: number;
  pendingCount: number;
  scheduledCount: number;
  snapshotQueueLength: number;
}

export interface AutoSaveRuntimeCounters {
  triggered: number;
  skippedDisabled: number;
  skippedMissingChapter: number;
  duplicateTriggers: number;
  scheduled: number;
  rescheduled: number;
  saveStarted: number;
  saveSucceeded: number;
  saveFailed: number;
  validationBlocked: number;
  queueDelayTotalMs: number;
  queueDelaySamples: number;
  saveDurationTotalMs: number;
  saveDurationSamples: number;
  lastQueueDelayMs: number;
  lastSaveDurationMs: number;
}
