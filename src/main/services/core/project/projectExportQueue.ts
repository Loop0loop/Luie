export type ProjectExportRun = (projectId: string) => Promise<boolean>;

export type ProjectExportQueueFlushResult = {
  total: number;
  flushed: number;
  failed: number;
  timedOut: boolean;
};

type QueueLogger = {
  info: (message: string, details?: unknown) => void;
  warn: (message: string, details?: unknown) => void;
  error: (message: string, details?: unknown) => void;
};

type ProjectExportState = {
  timer: NodeJS.Timeout | null;
  inFlight: Promise<boolean> | null;
  dirty: boolean;
};

type ProjectExportReasonStats = {
  scheduled: number;
  immediate: number;
  started: number;
  failed: number;
};

const DEFAULT_STATE = (): ProjectExportState => ({
  timer: null,
  inFlight: null,
  dirty: false,
});

export class ProjectExportQueue {
  private states = new Map<string, ProjectExportState>();
  private reasonStats = new Map<string, ProjectExportReasonStats>();

  constructor(
    private readonly debounceMs: number,
    private readonly runExport: ProjectExportRun,
    private readonly logger: QueueLogger,
  ) {}

  private getOrCreate(projectId: string): ProjectExportState {
    const existing = this.states.get(projectId);
    if (existing) return existing;
    const next = DEFAULT_STATE();
    this.states.set(projectId, next);
    return next;
  }

  private cleanupIfIdle(projectId: string): void {
    const state = this.states.get(projectId);
    if (!state) return;
    if (state.timer || state.inFlight || state.dirty) return;
    this.states.delete(projectId);
  }

  private clearTimer(state: ProjectExportState): void {
    if (!state.timer) return;
    clearTimeout(state.timer);
    state.timer = null;
  }

  private normalizeReason(reason?: string): string {
    const normalized = typeof reason === "string" ? reason.trim() : "";
    return normalized.length > 0 ? normalized : "unspecified";
  }

  private trackReason(
    reason: string | undefined,
    key: keyof ProjectExportReasonStats,
  ): void {
    const reasonKey = this.normalizeReason(reason);
    const current = this.reasonStats.get(reasonKey) ?? {
      scheduled: 0,
      immediate: 0,
      started: 0,
      failed: 0,
    };
    current[key] += 1;
    this.reasonStats.set(reasonKey, current);

    const totalEvents =
      current.scheduled + current.immediate + current.started + current.failed;
    if (totalEvents === 1 || totalEvents % 25 === 0) {
      this.logger.info("Project export queue reason stats", {
        reason: reasonKey,
        ...current,
      });
    }
  }

  getReasonStats(): Record<string, ProjectExportReasonStats> {
    return Object.fromEntries(
      Array.from(this.reasonStats.entries()).map(([reason, stats]) => [
        reason,
        { ...stats },
      ]),
    );
  }

  schedule(projectId: string, reason?: string): void {
    const state = this.getOrCreate(projectId);
    state.dirty = true;
    this.clearTimer(state);
    this.trackReason(reason, "scheduled");

    state.timer = setTimeout(() => {
      state.timer = null;
      void this.runLoop(projectId, reason).catch((error) => {
        this.trackReason(reason, "failed");
        this.logger.error("Failed to export project package", {
          projectId,
          reason,
          error,
        });
      });
    }, this.debounceMs);
  }

  async runNow(projectId: string, reason?: string): Promise<boolean> {
    const state = this.getOrCreate(projectId);
    state.dirty = true;
    this.clearTimer(state);
    this.trackReason(reason, "immediate");
    return await this.runLoop(projectId, reason ?? "immediate");
  }

  private async runLoop(projectId: string, reason?: string): Promise<boolean> {
    this.trackReason(reason, "started");
    const state = this.getOrCreate(projectId);
    if (state.inFlight) {
      state.dirty = true;
      return state.inFlight;
    }

    const execute = async (): Promise<boolean> => {
      let exported = false;
      while (state.dirty) {
        state.dirty = false;
        exported = await this.runExport(projectId);
      }
      return exported;
    };

    const task = execute()
      .catch((error) => {
        this.trackReason(reason, "failed");
        this.logger.error("Failed to run package export", {
          projectId,
          reason,
          error,
        });
        throw error;
      })
      .finally(() => {
        state.inFlight = null;
        this.cleanupIfIdle(projectId);
      });

    state.inFlight = task;
    return task;
  }

  async flush(timeoutMs = 8_000): Promise<ProjectExportQueueFlushResult> {
    const pendingProjectIds = Array.from(this.states.entries())
      .filter(([, state]) =>
        Boolean(state.timer || state.inFlight || state.dirty),
      )
      .map(([projectId]) => projectId);

    if (pendingProjectIds.length === 0) {
      return { total: 0, flushed: 0, failed: 0, timedOut: false };
    }

    for (const projectId of pendingProjectIds) {
      const state = this.getOrCreate(projectId);
      state.dirty = true;
      this.clearTimer(state);
    }

    let flushed = 0;
    let failed = 0;
    const jobs = pendingProjectIds.map(async (projectId) => {
      try {
        await this.runLoop(projectId, "flush");
        flushed += 1;
      } catch (error) {
        failed += 1;
        this.logger.error("Failed to flush pending package export", {
          projectId,
          error,
        });
      }
    });

    const completion = Promise.all(jobs).then(() => true);
    const timedOut = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(true), timeoutMs);
      void completion.then(() => {
        clearTimeout(timer);
        resolve(false);
      });
    });

    return {
      total: pendingProjectIds.length,
      flushed,
      failed,
      timedOut,
    };
  }
}
