import type {
  ScrapMemo,
  WorldDrawingIconType,
  WorldDrawingPath,
  WorldDrawingTool,
  WorldMindmapEdge,
  WorldMindmapNode,
  WorldScrapMemosData,
} from "../types/index.js";

const DRAWING_ICONS = new Set<WorldDrawingIconType>(["mountain", "castle", "village"]);
const DRAWING_TOOLS = new Set<WorldDrawingTool>(["pen", "text", "eraser", "icon"]);

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export const parseWorldJsonSafely = (raw: string | null): unknown | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

export const toWorldUpdatedAt = (value: unknown): string | undefined => {
  if (!isRecord(value)) return undefined;
  return typeof value.updatedAt === "string" ? value.updatedAt : undefined;
};

export const toWorldDrawingTool = (
  value: unknown,
  fallback: WorldDrawingTool = "pen",
): WorldDrawingTool =>
  typeof value === "string" && DRAWING_TOOLS.has(value as WorldDrawingTool)
    ? (value as WorldDrawingTool)
    : fallback;

export const toWorldDrawingIcon = (
  value: unknown,
  fallback: WorldDrawingIconType = "mountain",
): WorldDrawingIconType =>
  typeof value === "string" && DRAWING_ICONS.has(value as WorldDrawingIconType)
    ? (value as WorldDrawingIconType)
    : fallback;

export const normalizeWorldDrawingPaths = (value: unknown): WorldDrawingPath[] => {
  if (!Array.isArray(value)) return [];
  const normalized: WorldDrawingPath[] = [];

  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) continue;
    const type = item.type;
    if (type !== "path" && type !== "text" && type !== "icon") continue;

    const path: WorldDrawingPath = {
      id: typeof item.id === "string" && item.id.length > 0 ? item.id : `path-${index}`,
      type,
      color: typeof item.color === "string" ? item.color : "#000000",
    };

    if (typeof item.d === "string") path.d = item.d;
    if (typeof item.width === "number") path.width = item.width;
    if (typeof item.x === "number") path.x = item.x;
    if (typeof item.y === "number") path.y = item.y;
    if (typeof item.text === "string") path.text = item.text;
    if (typeof item.icon === "string" && DRAWING_ICONS.has(item.icon as WorldDrawingIconType)) {
      path.icon = item.icon as WorldDrawingIconType;
    }
    normalized.push(path);
  }

  return normalized;
};

export const normalizeWorldMindmapNodes = (value: unknown): WorldMindmapNode[] => {
  if (!Array.isArray(value)) return [];
  const normalized: WorldMindmapNode[] = [];

  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) continue;
    const position = item.position;
    if (!isRecord(position)) continue;
    const data = isRecord(item.data) ? item.data : undefined;

    normalized.push({
      id: typeof item.id === "string" && item.id.length > 0 ? item.id : `node-${index}`,
      type: typeof item.type === "string" ? item.type : undefined,
      position: {
        x: typeof position.x === "number" ? position.x : 0,
        y: typeof position.y === "number" ? position.y : 0,
      },
      data: {
        label: typeof data?.label === "string" ? data.label : "",
        image: typeof data?.image === "string" ? data.image : undefined,
      },
    });
  }

  return normalized;
};

export const normalizeWorldMindmapEdges = (value: unknown): WorldMindmapEdge[] => {
  if (!Array.isArray(value)) return [];
  const normalized: WorldMindmapEdge[] = [];

  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) continue;
    const source = typeof item.source === "string" ? item.source : "";
    const target = typeof item.target === "string" ? item.target : "";
    if (!source || !target) continue;

    normalized.push({
      id: typeof item.id === "string" && item.id.length > 0 ? item.id : `edge-${index}`,
      source,
      target,
      type: typeof item.type === "string" ? item.type : undefined,
    });
  }

  return normalized;
};

const normalizeWorldScrapMemo = (
  input: unknown,
  index: number,
  nowIso: () => string,
): ScrapMemo | null => {
  if (!isRecord(input)) return null;
  return {
    id: typeof input.id === "string" && input.id.length > 0 ? input.id : `memo-${index}`,
    title: typeof input.title === "string" ? input.title : "",
    content: typeof input.content === "string" ? input.content : "",
    tags: Array.isArray(input.tags)
      ? input.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : nowIso(),
  };
};

export const normalizeWorldScrapMemos = (
  value: unknown,
  nowIso: () => string = () => new Date().toISOString(),
): ScrapMemo[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((memo, index) => normalizeWorldScrapMemo(memo, index, nowIso))
    .filter((memo): memo is ScrapMemo => memo !== null);
};

export const normalizeWorldScrapPayload = (
  input: unknown,
  nowIso: () => string = () => new Date().toISOString(),
): WorldScrapMemosData => {
  if (!isRecord(input)) {
    return { memos: [] };
  }
  return {
    memos: normalizeWorldScrapMemos(input.memos, nowIso),
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : undefined,
  };
};
