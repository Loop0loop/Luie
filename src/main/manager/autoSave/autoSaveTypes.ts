export interface AutoSaveConfig {
  enabled: boolean;
  interval: number;
  debounceMs: number;
}

export interface PendingSave {
  chapterId: string;
  content: string;
  projectId: string;
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
