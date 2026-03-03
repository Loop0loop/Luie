import {
  isRecord,
  normalizeWorldDrawingPaths,
  normalizeWorldMindmapEdges,
  normalizeWorldMindmapNodes,
  normalizeWorldScrapPayload,
  parseWorldJsonSafely,
  toWorldDrawingIcon,
  toWorldDrawingTool,
} from "../../../../shared/world/worldDocumentCodec.js";

export type WorldDocumentType = "synopsis" | "plot" | "drawing" | "mindmap" | "graph" | "scrap";

type LoggerLike = {
  warn: (message: string, data?: unknown) => void;
};

type ScrapFallbackMemo = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
};

const WORLD_SYNOPSIS_STATUS = new Set(["draft", "working", "locked"]);

const decodeWorldDocumentPayload = (
  projectId: string,
  docType: WorldDocumentType,
  payload: unknown,
  logger: LoggerLike,
): unknown => {
  if (typeof payload !== "string") {
    return payload;
  }
  const parsed = parseWorldJsonSafely(payload);
  if (parsed !== null) {
    return parsed;
  }
  logger.warn("Invalid sync world document payload string; using default payload", {
    projectId,
    docType,
  });
  return null;
};

export const normalizeSynopsisPayload = (
  projectId: string,
  payload: unknown,
  logger: LoggerLike,
): Record<string, unknown> => {
  const decoded = decodeWorldDocumentPayload(projectId, "synopsis", payload, logger);
  if (!isRecord(decoded)) {
    return { synopsis: "", status: "draft" };
  }

  const statusValue = decoded.status;
  const status =
    typeof statusValue === "string" && WORLD_SYNOPSIS_STATUS.has(statusValue)
      ? statusValue
      : "draft";

  const normalized: Record<string, unknown> = {
    synopsis: typeof decoded.synopsis === "string" ? decoded.synopsis : "",
    status,
  };

  if (typeof decoded.genre === "string") normalized.genre = decoded.genre;
  if (typeof decoded.targetAudience === "string") {
    normalized.targetAudience = decoded.targetAudience;
  }
  if (typeof decoded.logline === "string") normalized.logline = decoded.logline;
  if (typeof decoded.updatedAt === "string") normalized.updatedAt = decoded.updatedAt;

  return normalized;
};

export const normalizePlotPayload = (
  projectId: string,
  payload: unknown,
  logger: LoggerLike,
): Record<string, unknown> => {
  const decoded = decodeWorldDocumentPayload(projectId, "plot", payload, logger);
  if (!isRecord(decoded)) {
    return { columns: [] };
  }

  const rawColumns = Array.isArray(decoded.columns) ? decoded.columns : [];
  const columns = rawColumns
    .filter((column): column is Record<string, unknown> => isRecord(column))
    .map((column, columnIndex) => {
      const rawCards = Array.isArray(column.cards) ? column.cards : [];
      const cards = rawCards
        .filter((card): card is Record<string, unknown> => isRecord(card))
        .map((card, cardIndex) => ({
          id:
            typeof card.id === "string" && card.id.length > 0
              ? card.id
              : `card-${columnIndex}-${cardIndex}`,
          content: typeof card.content === "string" ? card.content : "",
        }));

      return {
        id:
          typeof column.id === "string" && column.id.length > 0
            ? column.id
            : `col-${columnIndex}`,
        title: typeof column.title === "string" ? column.title : "",
        cards,
      };
    });

  return {
    columns,
    updatedAt: typeof decoded.updatedAt === "string" ? decoded.updatedAt : undefined,
  };
};

export const normalizeDrawingPayload = (
  projectId: string,
  payload: unknown,
  logger: LoggerLike,
): Record<string, unknown> => {
  const decoded = decodeWorldDocumentPayload(projectId, "drawing", payload, logger);
  if (!isRecord(decoded)) {
    return { paths: [] };
  }

  return {
    paths: normalizeWorldDrawingPaths(decoded.paths),
    tool: toWorldDrawingTool(decoded.tool),
    iconType: toWorldDrawingIcon(decoded.iconType),
    color: typeof decoded.color === "string" ? decoded.color : undefined,
    lineWidth: typeof decoded.lineWidth === "number" ? decoded.lineWidth : undefined,
    updatedAt: typeof decoded.updatedAt === "string" ? decoded.updatedAt : undefined,
  };
};

export const normalizeMindmapPayload = (
  projectId: string,
  payload: unknown,
  logger: LoggerLike,
): Record<string, unknown> => {
  const decoded = decodeWorldDocumentPayload(projectId, "mindmap", payload, logger);
  if (!isRecord(decoded)) {
    return { nodes: [], edges: [] };
  }

  return {
    nodes: normalizeWorldMindmapNodes(decoded.nodes),
    edges: normalizeWorldMindmapEdges(decoded.edges),
    updatedAt: typeof decoded.updatedAt === "string" ? decoded.updatedAt : undefined,
  };
};

export const normalizeGraphPayload = (
  projectId: string,
  payload: unknown,
  logger: LoggerLike,
): Record<string, unknown> => {
  const decoded = decodeWorldDocumentPayload(projectId, "graph", payload, logger);
  if (!isRecord(decoded)) {
    return { nodes: [], edges: [] };
  }

  const nodes = Array.isArray(decoded.nodes)
    ? decoded.nodes.filter((node): node is Record<string, unknown> => isRecord(node))
    : [];
  const edges = Array.isArray(decoded.edges)
    ? decoded.edges.filter((edge): edge is Record<string, unknown> => isRecord(edge))
    : [];

  return {
    nodes,
    edges,
    updatedAt: typeof decoded.updatedAt === "string" ? decoded.updatedAt : undefined,
  };
};

export const normalizeScrapPayload = (
  projectId: string,
  payload: unknown,
  fallbackMemos: ScrapFallbackMemo[],
  updatedAtFallback: string,
  logger: LoggerLike,
): Record<string, unknown> => {
  const decoded = decodeWorldDocumentPayload(projectId, "scrap", payload, logger);
  if (!isRecord(decoded)) {
    return {
      memos: fallbackMemos.map((memo) => ({
        id: memo.id,
        title: memo.title,
        content: memo.content,
        tags: memo.tags,
        updatedAt: memo.updatedAt,
      })),
      updatedAt: updatedAtFallback,
    };
  }

  const normalized = normalizeWorldScrapPayload(decoded);
  return {
    memos: normalized.memos,
    updatedAt: typeof normalized.updatedAt === "string" ? normalized.updatedAt : updatedAtFallback,
  };
};

