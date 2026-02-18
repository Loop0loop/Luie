import {
  LUIE_PACKAGE_EXTENSION,
  LUIE_WORLD_DIR,
  LUIE_WORLD_DRAWING_FILE,
  LUIE_WORLD_MINDMAP_FILE,
  LUIE_WORLD_PLOT_FILE,
  LUIE_WORLD_SCRAP_MEMOS_FILE,
  LUIE_WORLD_SYNOPSIS_FILE,
} from "../../../shared/constants";
import type {
  ScrapMemo,
  WorldDrawingData,
  WorldDrawingIconType,
  WorldDrawingPath,
  WorldDrawingTool,
  WorldMindmapData,
  WorldMindmapEdge,
  WorldMindmapNode,
  WorldPlotCard,
  WorldPlotColumn,
  WorldPlotData,
  WorldScrapMemosData,
  WorldSynopsisData,
  WorldSynopsisStatus,
} from "../../../shared/types";
import { api } from "./api";

const WORLD_LOCAL_STORAGE_PREFIX = "luie:world:";

const DRAWING_TOOLS = new Set<WorldDrawingTool>(["pen", "text", "eraser", "icon"]);
const DRAWING_ICONS = new Set<WorldDrawingIconType>(["mountain", "castle", "village"]);
const SYNOPSIS_STATUS = new Set<WorldSynopsisStatus>(["draft", "working", "locked"]);

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

const isLuieProjectPath = (projectPath?: string | null): projectPath is string =>
  Boolean(projectPath && projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION));

const buildLocalStorageKey = (projectId: string, key: string) =>
  `${WORLD_LOCAL_STORAGE_PREFIX}${projectId}:${key}`;

const loadLocalStorageJson = <T>(projectId: string, key: string): T | null => {
  try {
    const raw = localStorage.getItem(buildLocalStorageKey(projectId, key));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const saveLocalStorageJson = (projectId: string, key: string, data: unknown) => {
  try {
    localStorage.setItem(buildLocalStorageKey(projectId, key), JSON.stringify(data));
  } catch {
    // local fallback only
  }
};

const readLuieJson = async (projectPath: string, fileName: string): Promise<unknown | null> => {
  const response = await api.fs.readLuieEntry(projectPath, `${LUIE_WORLD_DIR}/${fileName}`);
  if (!response.success || !response.data) return null;
  try {
    return JSON.parse(response.data);
  } catch {
    return null;
  }
};

const writeLuieJson = async (projectPath: string, fileName: string, data: unknown) => {
  await api.fs.writeProjectFile(projectPath, `${LUIE_WORLD_DIR}/${fileName}`, JSON.stringify(data, null, 2));
};

const normalizeSynopsis = (input: unknown, synopsisFallback = ""): WorldSynopsisData => {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_WORLD_SYNOPSIS, synopsis: synopsisFallback };
  }

  const source = input as Record<string, unknown>;
  const status =
    typeof source.status === "string" && SYNOPSIS_STATUS.has(source.status as WorldSynopsisStatus)
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
      typeof source.targetAudience === "string" ? source.targetAudience : undefined,
    logline: typeof source.logline === "string" ? source.logline : undefined,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : undefined,
  };
};

const normalizePlot = (input: unknown): WorldPlotData => {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_WORLD_PLOT };
  }

  const source = input as Record<string, unknown>;
  const rawColumns = Array.isArray(source.columns) ? source.columns : [];
  const columns: WorldPlotColumn[] = rawColumns
    .filter((col): col is Record<string, unknown> => Boolean(col && typeof col === "object"))
    .map((col, index) => {
      const rawCards = Array.isArray(col.cards) ? col.cards : [];
      const cards: WorldPlotCard[] = rawCards
        .filter((card): card is Record<string, unknown> => Boolean(card && typeof card === "object"))
        .map((card, cardIndex) => ({
          id:
            typeof card.id === "string" && card.id.length > 0
              ? card.id
              : `card-${index}-${cardIndex}`,
          content: typeof card.content === "string" ? card.content : "",
        }));

      return {
        id: typeof col.id === "string" && col.id.length > 0 ? col.id : `col-${index}`,
        title: typeof col.title === "string" ? col.title : "",
        cards,
      };
    });

  return {
    columns,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : undefined,
  };
};

const normalizeDrawingPath = (input: unknown): WorldDrawingPath | null => {
  if (!input || typeof input !== "object") return null;
  const source = input as Record<string, unknown>;
  const type = source.type;
  if (type !== "path" && type !== "text" && type !== "icon") return null;

  const path: WorldDrawingPath = {
    id: typeof source.id === "string" && source.id.length > 0 ? source.id : `${Date.now()}`,
    type,
    color: typeof source.color === "string" ? source.color : "#000000",
  };

  if (typeof source.d === "string") path.d = source.d;
  if (typeof source.width === "number") path.width = source.width;
  if (typeof source.x === "number") path.x = source.x;
  if (typeof source.y === "number") path.y = source.y;
  if (typeof source.text === "string") path.text = source.text;
  if (typeof source.icon === "string" && DRAWING_ICONS.has(source.icon as WorldDrawingIconType)) {
    path.icon = source.icon as WorldDrawingIconType;
  }

  return path;
};

const normalizeDrawing = (input: unknown): WorldDrawingData => {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_WORLD_DRAWING };
  }

  const source = input as Record<string, unknown>;
  const rawPaths = Array.isArray(source.paths) ? source.paths : [];
  const paths = rawPaths.map(normalizeDrawingPath).filter((path): path is WorldDrawingPath => path !== null);

  const tool =
    typeof source.tool === "string" && DRAWING_TOOLS.has(source.tool as WorldDrawingTool)
      ? (source.tool as WorldDrawingTool)
      : DEFAULT_WORLD_DRAWING.tool;

  const iconType =
    typeof source.iconType === "string" && DRAWING_ICONS.has(source.iconType as WorldDrawingIconType)
      ? (source.iconType as WorldDrawingIconType)
      : DEFAULT_WORLD_DRAWING.iconType;

  return {
    paths,
    tool,
    iconType,
    color: typeof source.color === "string" ? source.color : DEFAULT_WORLD_DRAWING.color,
    lineWidth:
      typeof source.lineWidth === "number" ? source.lineWidth : DEFAULT_WORLD_DRAWING.lineWidth,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : undefined,
  };
};

const normalizeMindmapNode = (input: unknown, index: number): WorldMindmapNode | null => {
  if (!input || typeof input !== "object") return null;
  const source = input as Record<string, unknown>;
  const position = source.position;
  if (!position || typeof position !== "object") return null;
  const pos = position as Record<string, unknown>;

  return {
    id: typeof source.id === "string" && source.id.length > 0 ? source.id : `node-${index}`,
    type: typeof source.type === "string" ? source.type : undefined,
    position: {
      x: typeof pos.x === "number" ? pos.x : 0,
      y: typeof pos.y === "number" ? pos.y : 0,
    },
    data: {
      label:
        typeof (source.data as Record<string, unknown> | undefined)?.label === "string"
          ? ((source.data as Record<string, unknown>).label as string)
          : "",
      image:
        typeof (source.data as Record<string, unknown> | undefined)?.image === "string"
          ? ((source.data as Record<string, unknown>).image as string)
          : undefined,
    },
  };
};

const normalizeMindmapEdge = (input: unknown, index: number): WorldMindmapEdge | null => {
  if (!input || typeof input !== "object") return null;
  const source = input as Record<string, unknown>;
  const sourceId = typeof source.source === "string" ? source.source : "";
  const targetId = typeof source.target === "string" ? source.target : "";
  if (!sourceId || !targetId) return null;

  return {
    id: typeof source.id === "string" && source.id.length > 0 ? source.id : `edge-${index}`,
    source: sourceId,
    target: targetId,
    type: typeof source.type === "string" ? source.type : undefined,
  };
};

const normalizeMindmap = (input: unknown): WorldMindmapData => {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_WORLD_MINDMAP };
  }

  const source = input as Record<string, unknown>;
  const rawNodes = Array.isArray(source.nodes) ? source.nodes : [];
  const rawEdges = Array.isArray(source.edges) ? source.edges : [];

  return {
    nodes: rawNodes
      .map((node, index) => normalizeMindmapNode(node, index))
      .filter((node): node is WorldMindmapNode => node !== null),
    edges: rawEdges
      .map((edge, index) => normalizeMindmapEdge(edge, index))
      .filter((edge): edge is WorldMindmapEdge => edge !== null),
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : undefined,
  };
};

const normalizeScrapMemo = (input: unknown, index: number): ScrapMemo | null => {
  if (!input || typeof input !== "object") return null;
  const source = input as Record<string, unknown>;
  return {
    id: typeof source.id === "string" && source.id.length > 0 ? source.id : `memo-${index}`,
    title: typeof source.title === "string" ? source.title : "",
    content: typeof source.content === "string" ? source.content : "",
    tags: Array.isArray(source.tags)
      ? source.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    updatedAt:
      typeof source.updatedAt === "string"
        ? source.updatedAt
        : new Date().toISOString(),
  };
};

const normalizeScrapMemos = (input: unknown): WorldScrapMemosData => {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_WORLD_SCRAP_MEMOS };
  }

  const source = input as Record<string, unknown>;
  const rawMemos = Array.isArray(source.memos) ? source.memos : [];

  return {
    memos: rawMemos
      .map((memo, index) => normalizeScrapMemo(memo, index))
      .filter((memo): memo is ScrapMemo => memo !== null),
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : undefined,
  };
};

export const worldPackageStorage = {
  async loadSynopsis(
    projectId: string,
    projectPath?: string | null,
    synopsisFallback = "",
  ): Promise<WorldSynopsisData> {
    if (!projectId) {
      return { ...DEFAULT_WORLD_SYNOPSIS, synopsis: synopsisFallback };
    }

    if (isLuieProjectPath(projectPath)) {
      const data = await readLuieJson(projectPath, LUIE_WORLD_SYNOPSIS_FILE);
      const normalized = normalizeSynopsis(data, synopsisFallback);
      saveLocalStorageJson(projectId, "synopsis", normalized);
      return normalized;
    }

    const local = loadLocalStorageJson<unknown>(projectId, "synopsis");
    return normalizeSynopsis(local, synopsisFallback);
  },

  async saveSynopsis(
    projectId: string,
    projectPath: string | null | undefined,
    data: WorldSynopsisData,
  ): Promise<void> {
    if (!projectId) return;
    const payload = { ...data, updatedAt: new Date().toISOString() };
    saveLocalStorageJson(projectId, "synopsis", payload);

    if (isLuieProjectPath(projectPath)) {
      try {
        await writeLuieJson(projectPath, LUIE_WORLD_SYNOPSIS_FILE, payload);
      } catch (error) {
        await api.logger.warn("Failed to save synopsis world data", error);
      }
    }
  },

  async loadPlot(projectId: string, projectPath?: string | null): Promise<WorldPlotData> {
    if (!projectId) {
      return { ...DEFAULT_WORLD_PLOT };
    }

    if (isLuieProjectPath(projectPath)) {
      const data = await readLuieJson(projectPath, LUIE_WORLD_PLOT_FILE);
      const normalized = normalizePlot(data);
      saveLocalStorageJson(projectId, "plot", normalized);
      return normalized;
    }

    const local = loadLocalStorageJson<unknown>(projectId, "plot");
    return normalizePlot(local);
  },

  async savePlot(
    projectId: string,
    projectPath: string | null | undefined,
    data: WorldPlotData,
  ): Promise<void> {
    if (!projectId) return;
    const payload: WorldPlotData = {
      columns: data.columns,
      updatedAt: new Date().toISOString(),
    };
    saveLocalStorageJson(projectId, "plot", payload);

    if (isLuieProjectPath(projectPath)) {
      try {
        await writeLuieJson(projectPath, LUIE_WORLD_PLOT_FILE, payload);
      } catch (error) {
        await api.logger.warn("Failed to save plot world data", error);
      }
    }
  },

  async loadDrawing(projectId: string, projectPath?: string | null): Promise<WorldDrawingData> {
    if (!projectId) {
      return { ...DEFAULT_WORLD_DRAWING };
    }

    if (isLuieProjectPath(projectPath)) {
      const data = await readLuieJson(projectPath, LUIE_WORLD_DRAWING_FILE);
      const normalized = normalizeDrawing(data);
      saveLocalStorageJson(projectId, "drawing", normalized);
      return normalized;
    }

    const local = loadLocalStorageJson<unknown>(projectId, "drawing");
    return normalizeDrawing(local);
  },

  async saveDrawing(
    projectId: string,
    projectPath: string | null | undefined,
    data: WorldDrawingData,
  ): Promise<void> {
    if (!projectId) return;
    const payload: WorldDrawingData = {
      ...data,
      updatedAt: new Date().toISOString(),
    };

    saveLocalStorageJson(projectId, "drawing", payload);

    if (isLuieProjectPath(projectPath)) {
      try {
        await writeLuieJson(projectPath, LUIE_WORLD_DRAWING_FILE, payload);
      } catch (error) {
        await api.logger.warn("Failed to save drawing world data", error);
      }
    }
  },

  async loadMindmap(projectId: string, projectPath?: string | null): Promise<WorldMindmapData> {
    if (!projectId) {
      return { ...DEFAULT_WORLD_MINDMAP };
    }

    if (isLuieProjectPath(projectPath)) {
      const data = await readLuieJson(projectPath, LUIE_WORLD_MINDMAP_FILE);
      const normalized = normalizeMindmap(data);
      saveLocalStorageJson(projectId, "mindmap", normalized);
      return normalized;
    }

    const local = loadLocalStorageJson<unknown>(projectId, "mindmap");
    return normalizeMindmap(local);
  },

  async saveMindmap(
    projectId: string,
    projectPath: string | null | undefined,
    data: WorldMindmapData,
  ): Promise<void> {
    if (!projectId) return;

    const payload: WorldMindmapData = {
      nodes: data.nodes,
      edges: data.edges,
      updatedAt: new Date().toISOString(),
    };
    saveLocalStorageJson(projectId, "mindmap", payload);

    if (isLuieProjectPath(projectPath)) {
      try {
        await writeLuieJson(projectPath, LUIE_WORLD_MINDMAP_FILE, payload);
      } catch (error) {
        await api.logger.warn("Failed to save mindmap world data", error);
      }
    }
  },

  async loadScrapMemos(projectId: string, projectPath?: string | null): Promise<WorldScrapMemosData> {
    if (!projectId) {
      return { ...DEFAULT_WORLD_SCRAP_MEMOS };
    }

    if (isLuieProjectPath(projectPath)) {
      const data = await readLuieJson(projectPath, LUIE_WORLD_SCRAP_MEMOS_FILE);
      const normalized = normalizeScrapMemos(data);
      saveLocalStorageJson(projectId, "scrap-memos", normalized);
      return normalized;
    }

    const local = loadLocalStorageJson<unknown>(projectId, "scrap-memos");
    return normalizeScrapMemos(local);
  },

  async saveScrapMemos(
    projectId: string,
    projectPath: string | null | undefined,
    data: WorldScrapMemosData,
  ): Promise<void> {
    if (!projectId) return;

    const payload: WorldScrapMemosData = {
      memos: data.memos,
      updatedAt: new Date().toISOString(),
    };
    saveLocalStorageJson(projectId, "scrap-memos", payload);

    if (isLuieProjectPath(projectPath)) {
      try {
        await writeLuieJson(projectPath, LUIE_WORLD_SCRAP_MEMOS_FILE, payload);
      } catch (error) {
        await api.logger.warn("Failed to save scrap memos world data", error);
      }
    }
  },
};
