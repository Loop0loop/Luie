import type {
  WorldDrawingData,
  WorldMindmapData,
  WorldPlotData,
  WorldScrapMemosData,
  WorldSynopsisData,
  WorldSynopsisStatus,
} from "@shared/types";

export const SYNOPSIS_STATUS = new Set<WorldSynopsisStatus>([
  "draft",
  "working",
  "locked",
]);

export const DEFAULT_WORLD_SYNOPSIS: WorldSynopsisData = {
  synopsis: "",
  status: "draft",
};

export const DEFAULT_WORLD_PLOT: WorldPlotData = {
  columns: [],
};

export const DEFAULT_WORLD_DRAWING: WorldDrawingData = {
  paths: [],
  tool: "pen",
  iconType: "mountain",
  color: "#000000",
  lineWidth: 2,
};

export const DEFAULT_WORLD_MINDMAP: WorldMindmapData = {
  nodes: [],
  edges: [],
};

export const DEFAULT_WORLD_SCRAP_MEMOS: WorldScrapMemosData = {
  memos: [],
};
