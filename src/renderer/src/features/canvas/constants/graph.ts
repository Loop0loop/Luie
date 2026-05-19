import type { GraphMode } from "../types/graph";

export const GRAPH_ALL_MODES: ReadonlyArray<GraphMode> = [
  "episode",
  "character",
  "event",
  "world",
] as const;

export const GRAPH_DEFAULT_MODE: GraphMode = "episode";

export const GRAPH_MODE_I18N: Record<GraphMode, string> = {
  episode: "canvas.graph.episode",
  character: "canvas.graph.character",
  event: "canvas.graph.event",
  world: "canvas.graph.world",
} as const;
