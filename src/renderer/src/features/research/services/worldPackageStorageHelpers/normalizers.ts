import type {
  WorldDrawingData,
  WorldMindmapData,
  WorldPlotCard,
  WorldPlotColumn,
  WorldPlotData,
  WorldSynopsisData,
  WorldSynopsisStatus,
} from "@shared/types";
import {
  normalizeWorldDrawingPaths,
  normalizeWorldMindmapEdges,
  normalizeWorldMindmapNodes,
  toWorldDrawingIcon,
  toWorldDrawingTool,
} from "@shared/world/worldDocumentCodec";

import {
  DEFAULT_WORLD_DRAWING,
  DEFAULT_WORLD_MINDMAP,
  DEFAULT_WORLD_PLOT,
  DEFAULT_WORLD_SYNOPSIS,
  SYNOPSIS_STATUS,
} from "./defaults";

export const normalizeSynopsis = (
  input: unknown,
  synopsisFallback = "",
): WorldSynopsisData => {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_WORLD_SYNOPSIS, synopsis: synopsisFallback };
  }

  const source = input as Record<string, unknown>;
  const status =
    typeof source.status === "string" &&
    SYNOPSIS_STATUS.has(source.status as WorldSynopsisStatus)
      ? (source.status as WorldSynopsisStatus)
      : DEFAULT_WORLD_SYNOPSIS.status;

  return {
    synopsis:
      typeof source.synopsis === "string" && source.synopsis.length > 0
        ? source.synopsis
        : synopsisFallback,
    status,
    genre: typeof source.genre === "string" ? source.genre : undefined,
    targetAudience:
      typeof source.targetAudience === "string"
        ? source.targetAudience
        : undefined,
    logline: typeof source.logline === "string" ? source.logline : undefined,
    updatedAt:
      typeof source.updatedAt === "string" ? source.updatedAt : undefined,
  };
};

export const normalizePlot = (input: unknown): WorldPlotData => {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_WORLD_PLOT };
  }

  const source = input as Record<string, unknown>;
  const rawColumns = Array.isArray(source.columns) ? source.columns : [];
  const columns: WorldPlotColumn[] = rawColumns
    .filter((col): col is Record<string, unknown> =>
      Boolean(col && typeof col === "object"),
    )
    .map((col, index) => {
      const rawCards = Array.isArray(col.cards) ? col.cards : [];
      const cards: WorldPlotCard[] = rawCards
        .filter((card): card is Record<string, unknown> =>
          Boolean(card && typeof card === "object"),
        )
        .map((card, cardIndex) => ({
          id:
            typeof card.id === "string" && card.id.length > 0
              ? card.id
              : `card-${index}-${cardIndex}`,
          content: typeof card.content === "string" ? card.content : "",
        }));

      return {
        id:
          typeof col.id === "string" && col.id.length > 0
            ? col.id
            : `col-${index}`,
        title: typeof col.title === "string" ? col.title : "",
        cards,
      };
    });

  return {
    columns,
    updatedAt:
      typeof source.updatedAt === "string" ? source.updatedAt : undefined,
  };
};

export const normalizeDrawing = (input: unknown): WorldDrawingData => {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_WORLD_DRAWING };
  }

  const source = input as Record<string, unknown>;

  return {
    paths: normalizeWorldDrawingPaths(source.paths),
    tool: toWorldDrawingTool(source.tool, DEFAULT_WORLD_DRAWING.tool ?? "pen"),
    iconType: toWorldDrawingIcon(
      source.iconType,
      DEFAULT_WORLD_DRAWING.iconType ?? "mountain",
    ),
    color:
      typeof source.color === "string"
        ? source.color
        : DEFAULT_WORLD_DRAWING.color,
    lineWidth:
      typeof source.lineWidth === "number"
        ? source.lineWidth
        : DEFAULT_WORLD_DRAWING.lineWidth,
    updatedAt:
      typeof source.updatedAt === "string" ? source.updatedAt : undefined,
  };
};

export const normalizeMindmap = (input: unknown): WorldMindmapData => {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_WORLD_MINDMAP };
  }

  const source = input as Record<string, unknown>;

  return {
    nodes: normalizeWorldMindmapNodes(source.nodes),
    edges: normalizeWorldMindmapEdges(source.edges),
    updatedAt:
      typeof source.updatedAt === "string" ? source.updatedAt : undefined,
  };
};
