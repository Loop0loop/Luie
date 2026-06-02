import type { AutoSaveConfig, PendingSave } from "./autoSaveTypes.js";

type EnqueueProjectTask = (
  projectId: string,
  task: () => Promise<void>,
) => Promise<void>;

type PerformSave = (chapterId: string) => Promise<void>;

export function createAutoSaveInterval(input: {
  projectId: string;
  config: AutoSaveConfig;
  pendingSaves: Map<string, PendingSave>;
  lastSaveAt: Map<string, number>;
  enqueueProjectTask: EnqueueProjectTask;
  performSave: PerformSave;
}): NodeJS.Timeout {
  const timer = setInterval(() => {
    void input.enqueueProjectTask(input.projectId, async () => {
      const now = Date.now();
      const pendingSaves = Array.from(input.pendingSaves.entries()).filter(
        ([chapterId, pending]) => {
          if (pending.projectId !== input.projectId) {
            return false;
          }

          const lastTouchedAt = input.lastSaveAt.get(chapterId) ?? 0;
          const hasRecentTypingSignal =
            now - lastTouchedAt < input.config.debounceMs;
          return !hasRecentTypingSignal;
        },
      );

      await pendingSaves.reduce<Promise<void>>(
        (chain, [chapterId]) =>
          chain.then(async () => {
            await input.performSave(chapterId);
          }),
        Promise.resolve(),
      );
    });
  }, input.config.interval);

  if (typeof timer.unref === "function") {
    timer.unref();
  }

  return timer;
}
