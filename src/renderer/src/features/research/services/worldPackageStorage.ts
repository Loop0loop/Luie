import {
  LUIE_PACKAGE_EXTENSION,
  LUIE_WORLD_DIR,
  LUIE_WORLD_DRAWING_FILE,
  LUIE_WORLD_MINDMAP_FILE,
  LUIE_WORLD_PLOT_FILE,
  LUIE_WORLD_SCRAP_MEMOS_FILE,
  LUIE_WORLD_SYNOPSIS_FILE,
} from "@shared/constants";
import { WORLD_SCRAP_MEMOS_SCHEMA_VERSION } from "@shared/constants/persistence";
import type {
  WorldDrawingData,
  WorldMindmapData,
  WorldPlotCard,
  WorldPlotColumn,
  WorldPlotData,
  WorldScrapMemosData,
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
import { api } from "@shared/api";
import {
  type WorldScrapMemosPersistedData,
  worldScrapMemosDataSchema,
} from "@shared/schemas";
import {
  buildMigrationEventData,
  buildRecoveryEventData,
  buildValidationFailureData,
  emitOperationalLog,
} from "@shared/logger";
import type { ZodError } from "zod";

const WORLD_LOCAL_STORAGE_PREFIX = "luie:world:";
const luieWriteQueue = new Map<string, Promise<void>>();

const SYNOPSIS_STATUS = new Set<WorldSynopsisStatus>([
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

const isLuieProjectPath = (
  projectPath?: string | null,
): projectPath is string =>
  Boolean(
    projectPath && projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION),
  );

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

const saveLocalStorageJson = (
  projectId: string,
  key: string,
  data: unknown,
) => {
  try {
    localStorage.setItem(
      buildLocalStorageKey(projectId, key),
      JSON.stringify(data),
    );
  } catch {
    // local fallback only
  }
};

const removeLocalStorageJson = (projectId: string, key: string) => {
  try {
    localStorage.removeItem(buildLocalStorageKey(projectId, key));
  } catch {
    // local fallback only
  }
};

const normalizeLuieQueueKey = (projectPath: string): string => {
  const trimmed = projectPath.trim();
  if (!trimmed) return projectPath;

  let normalized = trimmed.replace(/\\/g, "/");
  const hasUncPrefix = normalized.startsWith("//");
  const body = hasUncPrefix ? normalized.slice(2) : normalized;
  const collapsedBody = body.replace(/\/{2,}/g, "/");
  normalized = hasUncPrefix ? `//${collapsedBody}` : collapsedBody;

  const isPosixRoot = normalized === "/";
  const isWindowsDriveRoot = /^[a-zA-Z]:\/$/.test(normalized);
  if (!isPosixRoot && !isWindowsDriveRoot) {
    normalized = normalized.replace(/\/+$/, "");
  }

  if (/^[a-zA-Z]:\//.test(normalized)) {
    normalized = `${normalized.charAt(0).toLowerCase()}${normalized.slice(1)}`;
  }

  return normalized;
};

const toScrapMemosSourceLabel = (
  source: "localStorage" | "luie-package",
): string => (source === "luie-package" ? ".luie package" : "local storage");

const logScrapMemosValidationFailure = (
  message: string,
  error: ZodError,
  input: {
    source: "localStorage" | "luie-package";
    projectId: string;
    projectPath?: string | null;
    persistedVersion?: number;
  },
) => {
  emitOperationalLog(api.logger, "warn", message, {
    ...buildValidationFailureData({
      scope: "world-scrap-memos",
      domain: "persist",
      source: input.source,
      storageKey:
        input.source === "localStorage"
          ? buildLocalStorageKey(input.projectId, "scrap-memos")
          : undefined,
      fallback: "default_world_scrap_memos",
      persistedVersion: input.persistedVersion,
      targetVersion: WORLD_SCRAP_MEMOS_SCHEMA_VERSION,
      error,
    }),
    projectId: input.projectId,
    ...(input.projectPath ? { projectPath: input.projectPath } : {}),
  });
};

const logScrapMemosRecovery = (input: {
  event: string;
  action: string;
  source: "localStorage" | "luie-package";
  projectId: string;
  projectPath?: string | null;
  persistedVersion?: number;
  reason: string;
}) => {
  emitOperationalLog(api.logger, "info", "World scrap memos recovery applied", {
    ...buildRecoveryEventData({
      scope: "world-scrap-memos",
      event: input.event,
      storageKey:
        input.source === "localStorage"
          ? buildLocalStorageKey(input.projectId, "scrap-memos")
          : undefined,
      source: input.source,
      action: input.action,
      persistedVersion: input.persistedVersion,
      targetVersion: WORLD_SCRAP_MEMOS_SCHEMA_VERSION,
      reason: input.reason,
    }),
    projectId: input.projectId,
    ...(input.projectPath ? { projectPath: input.projectPath } : {}),
  });
};

const parseScrapMemosPayload = async (
  payload: unknown,
  input: {
    source: "localStorage" | "luie-package";
    projectId: string;
    projectPath?: string | null;
  },
): Promise<WorldScrapMemosPersistedData | null> => {
  if (payload === null || payload === undefined) {
    return null;
  }

  const parsed = worldScrapMemosDataSchema.safeParse(payload);
  if (!parsed.success) {
    const persistedVersion =
      payload &&
      typeof payload === "object" &&
      typeof (payload as Record<string, unknown>).schemaVersion === "number"
        ? ((payload as Record<string, unknown>).schemaVersion as number)
        : undefined;
    logScrapMemosValidationFailure(
      `Invalid scrap memos payload in ${toScrapMemosSourceLabel(input.source)}`,
      parsed.error,
      {
        ...input,
        persistedVersion,
      },
    );
    return null;
  }

  const persistedVersion = parsed.data.schemaVersion ?? 1;
  if (persistedVersion < WORLD_SCRAP_MEMOS_SCHEMA_VERSION) {
    emitOperationalLog(api.logger, "info", "World scrap memos payload migrated", {
      ...buildMigrationEventData({
        scope: "world-scrap-memos",
        source: input.source,
        fromVersion: persistedVersion,
        toVersion: WORLD_SCRAP_MEMOS_SCHEMA_VERSION,
        status: "migrated",
      }),
      projectId: input.projectId,
      ...(input.projectPath ? { projectPath: input.projectPath } : {}),
    });
  }

  return {
    ...parsed.data,
    schemaVersion: WORLD_SCRAP_MEMOS_SCHEMA_VERSION,
  };
};

const readLuieJson = async (
  projectPath: string,
  fileName: string,
): Promise<unknown | null> => {
  const response = await api.fs.readLuieEntry(
    projectPath,
    `${LUIE_WORLD_DIR}/${fileName}`,
  );
  if (!response.success) {
    await api.logger.warn("Failed to read .luie world entry", {
      projectPath,
      fileName,
      error: response.error,
    });
    return null;
  }
  if (!response.data) return null;
  try {
    return JSON.parse(response.data);
  } catch (error) {
    await api.logger.warn("Invalid .luie world JSON payload", {
      projectPath,
      fileName,
      error,
    });
    return null;
  }
};

const writeLuieJson = async (
  projectPath: string,
  fileName: string,
  data: unknown,
) => {
  const queueKey = normalizeLuieQueueKey(projectPath);
  const previousWrite = luieWriteQueue.get(queueKey) ?? Promise.resolve();
  const nextWrite = previousWrite
    .catch(() => undefined)
    .then(async () => {
      const response = await api.fs.writeProjectFile(
        projectPath,
        `${LUIE_WORLD_DIR}/${fileName}`,
        JSON.stringify(data, null, 2),
      );
      if (!response.success) {
        const code = response.error?.code ?? "UNKNOWN_ERROR";
        const message =
          response.error?.message ?? "Failed to write .luie world entry";
        throw new Error(`LUIE_WRITE_FAILED:${fileName}:${code}:${message}`);
      }
    });
  luieWriteQueue.set(queueKey, nextWrite);

  try {
    await nextWrite;
  } finally {
    if (luieWriteQueue.get(queueKey) === nextWrite) {
      luieWriteQueue.delete(queueKey);
    }
  }
};

const normalizeSynopsis = (
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

const normalizePlot = (input: unknown): WorldPlotData => {
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

const normalizeDrawing = (input: unknown): WorldDrawingData => {
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

const normalizeMindmap = (input: unknown): WorldMindmapData => {
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

  async loadPlot(
    projectId: string,
    projectPath?: string | null,
  ): Promise<WorldPlotData> {
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

  async loadDrawing(
    projectId: string,
    projectPath?: string | null,
  ): Promise<WorldDrawingData> {
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

  async loadMindmap(
    projectId: string,
    projectPath?: string | null,
  ): Promise<WorldMindmapData> {
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

  async loadScrapMemos(
    projectId: string,
    projectPath?: string | null,
  ): Promise<WorldScrapMemosData> {
    if (!projectId) {
      return { ...DEFAULT_WORLD_SCRAP_MEMOS };
    }

    if (isLuieProjectPath(projectPath)) {
      const data = await readLuieJson(projectPath, LUIE_WORLD_SCRAP_MEMOS_FILE);
      const parsed = await parseScrapMemosPayload(data, {
        source: "luie-package",
        projectId,
        projectPath,
      });
      if (!parsed) {
        return { ...DEFAULT_WORLD_SCRAP_MEMOS };
      }
      saveLocalStorageJson(projectId, "scrap-memos", parsed);
      return parsed;
    }

    const local = loadLocalStorageJson<unknown>(projectId, "scrap-memos");
    const parsed = await parseScrapMemosPayload(local, {
      source: "localStorage",
      projectId,
    });
    if (!parsed) {
      if (local !== null) {
        removeLocalStorageJson(projectId, "scrap-memos");
        logScrapMemosRecovery({
          event: "persist.reset",
          action: "drop_invalid_local_payload",
          source: "localStorage",
          projectId,
          reason: "schema_validation_failed",
        });
      }
      return { ...DEFAULT_WORLD_SCRAP_MEMOS };
    }
    if (parsed.schemaVersion !== WORLD_SCRAP_MEMOS_SCHEMA_VERSION) {
      saveLocalStorageJson(projectId, "scrap-memos", parsed);
    }
    return parsed;
  },

  async saveScrapMemos(
    projectId: string,
    projectPath: string | null | undefined,
    data: WorldScrapMemosData,
  ): Promise<void> {
    if (!projectId) return;

    const payload: WorldScrapMemosData = {
      schemaVersion: WORLD_SCRAP_MEMOS_SCHEMA_VERSION,
      memos: data.memos,
      updatedAt: new Date().toISOString(),
    };
    const parsed = worldScrapMemosDataSchema.safeParse(payload);
    if (!parsed.success) {
      logScrapMemosValidationFailure(
        "Refused to persist invalid scrap memos payload",
        parsed.error,
        {
          source: "localStorage",
          projectId,
          projectPath,
        },
      );
      return;
    }

    saveLocalStorageJson(projectId, "scrap-memos", parsed.data);

    if (isLuieProjectPath(projectPath)) {
      try {
        await writeLuieJson(
          projectPath,
          LUIE_WORLD_SCRAP_MEMOS_FILE,
          parsed.data,
        );
      } catch (error) {
        await api.logger.warn("Failed to save scrap memos world data", error);
      }
    }
  },
};
