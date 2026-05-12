import { createPerformanceTimer } from "@shared/logger";
import { api } from "@shared/api";
import {
  GRAPH_PERF_BATCH_FLUSH_INTERVAL_MS,
  GRAPH_PERF_BATCH_MAX_RECORDS,
  GRAPH_PERF_FRAME_SAMPLE_MAX_MS,
  GRAPH_PERF_LOCAL_STORAGE_KEY,
  type GraphPerfScope,
} from "./graphPerfConstants";

type GraphPerfMetricName =
  | "frame.time"
  | "drag.latency"
  | "edge.create.latency";

type GraphPerfRecord = {
  scope: GraphPerfScope;
  metric: GraphPerfMetricName;
  durationMs: number;
  status: "ok" | "failed";
  meta?: Record<string, unknown>;
};

let queue: GraphPerfRecord[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersAttached = false;

const safeLocalStorageGet = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeLocalStorageSet = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
};

const isEnabled = (): boolean => {
  const flag = safeLocalStorageGet(GRAPH_PERF_LOCAL_STORAGE_KEY);
  return flag === "1" || flag === "true";
};

const scheduleFlush = (): void => {
  if (flushTimer !== null) {
    return;
  }
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushGraphPerfMetrics();
  }, GRAPH_PERF_BATCH_FLUSH_INTERVAL_MS);
};

const pushRecord = (record: GraphPerfRecord): void => {
  if (!isEnabled()) {
    return;
  }
  queue.push(record);
  if (queue.length >= GRAPH_PERF_BATCH_MAX_RECORDS) {
    void flushGraphPerfMetrics();
    return;
  }
  scheduleFlush();
};

export const flushGraphPerfMetrics = async (): Promise<void> => {
  if (!isEnabled() || queue.length === 0) {
    return;
  }
  const batch = queue;
  queue = [];

  await api.logger.info("graph.performance.batch", {
    domain: "performance",
    event: "graph.performance.batch",
    scope: "graph.canvas.flow",
    count: batch.length,
    samples: batch,
  });
};

const handleVisibilityChange = (): void => {
  if (document.visibilityState !== "visible") {
    void flushGraphPerfMetrics();
  }
};

const handleBeforeUnload = (): void => {
  void flushGraphPerfMetrics();
};

export const initializeGraphPerfInstrumentation = (): void => {
  if (listenersAttached || typeof document === "undefined") {
    return;
  }
  listenersAttached = true;
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("beforeunload", handleBeforeUnload);
};

export const setGraphPerfInstrumentationEnabled = (enabled: boolean): void => {
  safeLocalStorageSet(GRAPH_PERF_LOCAL_STORAGE_KEY, enabled ? "1" : "0");
  if (!enabled) {
    queue = [];
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  }
};

export const isGraphPerfInstrumentationEnabled = (): boolean => isEnabled();

export const trackGraphPerfDuration = (input: GraphPerfRecord): void => {
  if (
    input.metric === "frame.time" &&
    input.durationMs > GRAPH_PERF_FRAME_SAMPLE_MAX_MS
  ) {
    return;
  }
  pushRecord(input);
};

export const startGraphPerfTimer = (input: {
  scope: GraphPerfScope;
  metric: GraphPerfMetricName;
  meta?: Record<string, unknown>;
}) => {
  const timer = createPerformanceTimer({
    scope: input.scope,
    event: `graph.performance.${input.metric}`,
    meta: input.meta,
  });

  return {
    complete(meta?: Record<string, unknown>): number {
      const durationMs = timer.complete(api.logger, meta);
      trackGraphPerfDuration({
        scope: input.scope,
        metric: input.metric,
        durationMs,
        status: "ok",
        meta: { ...(input.meta ?? {}), ...(meta ?? {}) },
      });
      return durationMs;
    },
    fail(error: unknown, meta?: Record<string, unknown>): number {
      const durationMs = timer.fail(api.logger, error, meta);
      trackGraphPerfDuration({
        scope: input.scope,
        metric: input.metric,
        durationMs,
        status: "failed",
        meta: { ...(input.meta ?? {}), ...(meta ?? {}) },
      });
      return durationMs;
    },
  };
};
