export const GRAPH_PERF_LOCAL_STORAGE_KEY = "luie.graph.perf.enabled";
export const GRAPH_PERF_BATCH_FLUSH_INTERVAL_MS = 4000;
export const GRAPH_PERF_BATCH_MAX_RECORDS = 24;
export const GRAPH_PERF_FRAME_SAMPLE_MAX_MS = 100;

export const GRAPH_PERF_SCOPE = {
  canvasFlow: "graph.canvas.flow",
} as const;

export type GraphPerfScope =
  (typeof GRAPH_PERF_SCOPE)[keyof typeof GRAPH_PERF_SCOPE];
