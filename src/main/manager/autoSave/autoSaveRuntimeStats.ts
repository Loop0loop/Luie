import type {
  AutoSaveRuntimeCounters,
  AutoSaveRuntimeStats,
} from "./autoSaveTypes.js";

export const createAutoSaveRuntimeCounters = (): AutoSaveRuntimeCounters => ({
  triggered: 0,
  skippedDisabled: 0,
  skippedMissingChapter: 0,
  duplicateTriggers: 0,
  scheduled: 0,
  rescheduled: 0,
  saveStarted: 0,
  saveSucceeded: 0,
  saveFailed: 0,
  validationBlocked: 0,
  queueDelayTotalMs: 0,
  queueDelaySamples: 0,
  saveDurationTotalMs: 0,
  saveDurationSamples: 0,
  lastQueueDelayMs: 0,
  lastSaveDurationMs: 0,
});

export function getAutoSaveRuntimeStats(input: {
  counters: AutoSaveRuntimeCounters;
  pendingCount: number;
  scheduledCount: number;
  snapshotQueueLength: number;
}): AutoSaveRuntimeStats {
  const { counters } = input;
  const averageQueueDelayMs =
    counters.queueDelaySamples > 0
      ? counters.queueDelayTotalMs / counters.queueDelaySamples
      : 0;
  const averageSaveDurationMs =
    counters.saveDurationSamples > 0
      ? counters.saveDurationTotalMs / counters.saveDurationSamples
      : 0;

  return {
    triggered: counters.triggered,
    skippedDisabled: counters.skippedDisabled,
    skippedMissingChapter: counters.skippedMissingChapter,
    duplicateTriggers: counters.duplicateTriggers,
    scheduled: counters.scheduled,
    rescheduled: counters.rescheduled,
    saveStarted: counters.saveStarted,
    saveSucceeded: counters.saveSucceeded,
    saveFailed: counters.saveFailed,
    validationBlocked: counters.validationBlocked,
    lastQueueDelayMs: counters.lastQueueDelayMs,
    averageQueueDelayMs,
    lastSaveDurationMs: counters.lastSaveDurationMs,
    averageSaveDurationMs,
    pendingCount: input.pendingCount,
    scheduledCount: input.scheduledCount,
    snapshotQueueLength: input.snapshotQueueLength,
  };
}
