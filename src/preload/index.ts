/**
 * Preload script - Electron contextBridge
 */

import { contextBridge, ipcRenderer } from "electron";
import type { RendererApi } from "../shared/api/index.js";
import { createErrorResponse, type IPCResponse } from "../shared/ipc/index.js";
import { IPC_CHANNELS } from "../shared/ipc/channels.js";
import type {
  AppBootstrapStatus,
  AppUpdateState,
  AppQuitPhasePayload,
  SyncStatus,
} from "../shared/types/index.js";
import {
  AUTO_SAVE_FLUSH_MS,
  IPC_DEFAULT_TIMEOUT_MS,
  IPC_LONG_TIMEOUT_MS,
  LOG_BATCH_SIZE,
  LOG_FLUSH_MS,
  ErrorCode,
} from "../shared/constants/index.js";

function sanitizeForIpc(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null) return null;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "undefined") return undefined;
  if (typeof value === "function") return "[Function]";
  if (typeof value === "symbol") return value.toString();

  if (value instanceof Date) return value.toISOString();

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map((v) => sanitizeForIpc(v, seen));
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (seen.has(obj)) return "[Circular]";
    seen.add(obj);

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      const sanitized = sanitizeForIpc(v, seen);
      if (sanitized !== undefined) out[k] = sanitized;
    }
    return out;
  }

  return String(value);
}

const LONG_TIMEOUT_CHANNELS = new Set<string>([
  IPC_CHANNELS.SNAPSHOT_IMPORT_FILE,
  IPC_CHANNELS.EXPORT_CREATE,
  IPC_CHANNELS.PROJECT_OPEN_LUIE,
  IPC_CHANNELS.SYNC_RUN_NOW,
]);

const RETRYABLE_CHANNELS = new Set<string>([
  IPC_CHANNELS.PROJECT_GET,
  IPC_CHANNELS.PROJECT_GET_ALL,
  IPC_CHANNELS.CHAPTER_GET,
  IPC_CHANNELS.CHAPTER_GET_ALL,
  IPC_CHANNELS.CHAPTER_GET_DELETED,
  IPC_CHANNELS.CHARACTER_GET,
  IPC_CHANNELS.CHARACTER_GET_ALL,
  IPC_CHANNELS.EVENT_GET,
  IPC_CHANNELS.EVENT_GET_ALL,
  IPC_CHANNELS.FACTION_GET,
  IPC_CHANNELS.FACTION_GET_ALL,
  IPC_CHANNELS.TERM_GET,
  IPC_CHANNELS.TERM_GET_ALL,
  IPC_CHANNELS.SNAPSHOT_GET_ALL,
  IPC_CHANNELS.SNAPSHOT_GET_BY_CHAPTER,
  IPC_CHANNELS.SEARCH,
  IPC_CHANNELS.SETTINGS_GET_ALL,
  IPC_CHANNELS.SETTINGS_GET_EDITOR,
  IPC_CHANNELS.SETTINGS_GET_AUTO_SAVE,
  IPC_CHANNELS.SETTINGS_GET_LANGUAGE,
  IPC_CHANNELS.SETTINGS_GET_MENU_BAR_MODE,
  IPC_CHANNELS.SETTINGS_GET_SHORTCUTS,
  IPC_CHANNELS.SETTINGS_GET_WINDOW_BOUNDS,
  IPC_CHANNELS.APP_GET_BOOTSTRAP_STATUS,
  IPC_CHANNELS.SYNC_GET_STATUS,
]);

const randomByteArray = (size: number): Uint8Array => {
  const bytes = new Uint8Array(size);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
    return bytes;
  }

  for (let i = 0; i < size; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
};

const getTimeoutMs = (channel: string) =>
  LONG_TIMEOUT_CHANNELS.has(channel) ? IPC_LONG_TIMEOUT_MS : IPC_DEFAULT_TIMEOUT_MS;

const getRequestId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  const bytes = randomByteArray(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));

  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
};

async function invokeWithTimeout<T>(
  channel: string,
  args: unknown[],
  timeoutMs: number,
): Promise<IPCResponse<T>> {
  const requestId = getRequestId();
  let timeoutId: number | null = null;

  const timeoutPromise = new Promise<IPCResponse<T>>((resolve) => {
    timeoutId = window.setTimeout(() => {
      resolve(
        createErrorResponse(
          ErrorCode.IPC_TIMEOUT,
          "IPC request timed out",
          { channel, timeoutMs },
          {
            timestamp: new Date().toISOString(),
            duration: timeoutMs,
            requestId,
            channel,
          },
        ) as IPCResponse<T>,
      );
    }, timeoutMs);
  });

  const invokePromise = ipcRenderer
    .invoke(channel, ...args)
    .then((response) => response as IPCResponse<T>)
    .catch((error) =>
      createErrorResponse(
        ErrorCode.IPC_INVOKE_FAILED,
        error instanceof Error ? error.message : String(error),
        { channel },
        {
          timestamp: new Date().toISOString(),
          requestId,
          channel,
        },
      ) as IPCResponse<T>,
    );

  const result = await Promise.race([invokePromise, timeoutPromise]);
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
  }
  return result;
}

async function safeInvoke<T = never>(channel: string, ...args: unknown[]): Promise<IPCResponse<T>> {
  const timeoutMs = getTimeoutMs(channel);
  const maxRetries = RETRYABLE_CHANNELS.has(channel) ? 1 : 0;
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt += 1;
    const response = await invokeWithTimeout<T>(channel, args, timeoutMs);
    if (response.success) return response;

    const code = response.error?.code;
    const shouldRetry =
      RETRYABLE_CHANNELS.has(channel) &&
      (code === ErrorCode.IPC_TIMEOUT || code === ErrorCode.IPC_INVOKE_FAILED) &&
      attempt <= maxRetries;

    if (!shouldRetry) {
      if (RETRYABLE_CHANNELS.has(channel) && attempt > maxRetries) {
        return createErrorResponse(
          ErrorCode.IPC_RETRY_EXHAUSTED,
          "IPC retry limit reached",
          { channel },
          response.meta,
        ) as IPCResponse<T>;
      }
      return response;
    }
  }

  return createErrorResponse(
    ErrorCode.IPC_RETRY_EXHAUSTED,
    "IPC retry limit reached",
    { channel },
    {
      timestamp: new Date().toISOString(),
      channel,
    },
  ) as IPCResponse<T>;
}

type CoreMethodMap = {
  "window.openExport": RendererApi["window"]["openExport"];
  "project.openLuie": RendererApi["project"]["openLuie"];
  "project.get": RendererApi["project"]["get"];
  "project.getAll": RendererApi["project"]["getAll"];
  "chapter.get": RendererApi["chapter"]["get"];
  "chapter.getAll": RendererApi["chapter"]["getAll"];
  "chapter.update": RendererApi["chapter"]["update"];
  "snapshot.getByProject": RendererApi["snapshot"]["getByProject"];
  "snapshot.importFromFile": RendererApi["snapshot"]["importFromFile"];
  "snapshot.restore": RendererApi["snapshot"]["restore"];
  "sync.getStatus": RendererApi["sync"]["getStatus"];
  "sync.connectGoogle": RendererApi["sync"]["connectGoogle"];
  "sync.disconnect": RendererApi["sync"]["disconnect"];
  "sync.runNow": RendererApi["sync"]["runNow"];
  "sync.setAutoSync": RendererApi["sync"]["setAutoSync"];
  "sync.resolveConflict": RendererApi["sync"]["resolveConflict"];
  "app.getVersion": RendererApi["app"]["getVersion"];
  "app.checkUpdate": RendererApi["app"]["checkUpdate"];
  "app.getUpdateState": RendererApi["app"]["getUpdateState"];
  "app.downloadUpdate": RendererApi["app"]["downloadUpdate"];
  "app.applyUpdate": RendererApi["app"]["applyUpdate"];
  "app.rollbackUpdate": RendererApi["app"]["rollbackUpdate"];
  "app.getBootstrapStatus": RendererApi["app"]["getBootstrapStatus"];
  "settings.getAll": RendererApi["settings"]["getAll"];
  "settings.getEditor": RendererApi["settings"]["getEditor"];
  "settings.setEditor": RendererApi["settings"]["setEditor"];
  "settings.getLanguage": RendererApi["settings"]["getLanguage"];
  "settings.setLanguage": RendererApi["settings"]["setLanguage"];
  "settings.getMenuBarMode": RendererApi["settings"]["getMenuBarMode"];
  "settings.setMenuBarMode": RendererApi["settings"]["setMenuBarMode"];
  "settings.getShortcuts": RendererApi["settings"]["getShortcuts"];
  "settings.setShortcuts": RendererApi["settings"]["setShortcuts"];
  "settings.getWindowBounds": RendererApi["settings"]["getWindowBounds"];
  "settings.setWindowBounds": RendererApi["settings"]["setWindowBounds"];
  "recovery.runDb": RendererApi["recovery"]["runDb"];
  "fs.readLuieEntry": RendererApi["fs"]["readLuieEntry"];
  "fs.selectFile": RendererApi["fs"]["selectFile"];
  "fs.selectSaveLocation": RendererApi["fs"]["selectSaveLocation"];
};

type CoreMethod = keyof CoreMethodMap;
type CoreResponse<K extends CoreMethod> = Awaited<ReturnType<CoreMethodMap[K]>>;

function safeInvokeCore<K extends CoreMethod>(
  _method: K,
  channel: string,
  ...args: Parameters<CoreMethodMap[K]>
): Promise<CoreResponse<K>> {
  return safeInvoke(channel, ...args) as Promise<CoreResponse<K>>;
}

type LogPayload = {
  level: "debug" | "info" | "warn" | "error" | string;
  message: string;
  data?: unknown;
};

const logQueue: LogPayload[] = [];
let logFlushTimer: number | null = null;

function scheduleLogFlush() {
  if (logFlushTimer !== null) return;
  logFlushTimer = window.setTimeout(() => {
    logFlushTimer = null;
    flushLogs();
  }, LOG_FLUSH_MS);
}

async function flushLogs() {
  if (logQueue.length === 0) return;
  const batch = logQueue.splice(0, LOG_BATCH_SIZE);
  const response = await safeInvoke(IPC_CHANNELS.LOGGER_LOG_BATCH, batch);
  if (!response.success) {
    // fallback to individual logs if batch fails
    await Promise.all(
      batch.map((entry) =>
        safeInvoke(IPC_CHANNELS.LOGGER_LOG, {
          level: entry.level,
          message: entry.message,
          data: entry.data,
        }),
      ),
    );
  }
  if (logQueue.length > 0) {
    scheduleLogFlush();
  }
}

type AutoSavePayload = {
  chapterId: string;
  content: string;
  projectId: string;
};

type AutoSavePending = {
  payload: AutoSavePayload;
  resolvers: Array<(value: IPCResponse<never>) => void>;
};

const autoSaveQueue = new Map<string, AutoSavePending>();
let autoSaveFlushTimer: number | null = null;
let rendererDirty = false;

function scheduleAutoSaveFlush() {
  if (autoSaveFlushTimer !== null) return;
  autoSaveFlushTimer = window.setTimeout(() => {
    autoSaveFlushTimer = null;
    void flushAutoSaves();
  }, AUTO_SAVE_FLUSH_MS);
}

async function flushAutoSaves() {
  if (autoSaveQueue.size === 0) return;
  const entries = Array.from(autoSaveQueue.entries());
  autoSaveQueue.clear();

  await Promise.all(
    entries.map(async ([_key, pending]) => {
      const response = await safeInvoke(
        IPC_CHANNELS.AUTO_SAVE,
        pending.payload.chapterId,
        pending.payload.content,
        pending.payload.projectId,
      );
      pending.resolvers.forEach((resolve) => resolve(response));
    }),
  );
}

const rendererApi = {
  // Project API
  project: {
    create: (input: unknown): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.PROJECT_CREATE, input),
    get: (id: string): ReturnType<RendererApi["project"]["get"]> =>
      safeInvokeCore("project.get", IPC_CHANNELS.PROJECT_GET, id),
    getAll: (): ReturnType<RendererApi["project"]["getAll"]> =>
      safeInvokeCore("project.getAll", IPC_CHANNELS.PROJECT_GET_ALL),
    update: (input: unknown): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.PROJECT_UPDATE, input),
    delete: (
      input: string | { id: string; deleteFile?: boolean },
    ): Promise<IPCResponse<never>> => safeInvoke(IPC_CHANNELS.PROJECT_DELETE, input),
    removeLocal: (id: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.PROJECT_REMOVE_LOCAL, id),
    openLuie: (packagePath: string): ReturnType<RendererApi["project"]["openLuie"]> =>
      safeInvokeCore("project.openLuie", IPC_CHANNELS.PROJECT_OPEN_LUIE, packagePath),
  },

  // Chapter API
  chapter: {
    create: (input: unknown): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.CHAPTER_CREATE, input),
    get: (id: string): ReturnType<RendererApi["chapter"]["get"]> =>
      safeInvokeCore("chapter.get", IPC_CHANNELS.CHAPTER_GET, id),
    getAll: (projectId: string): ReturnType<RendererApi["chapter"]["getAll"]> =>
      safeInvokeCore("chapter.getAll", IPC_CHANNELS.CHAPTER_GET_ALL, projectId),
    getDeleted: (projectId: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.CHAPTER_GET_DELETED, projectId),
    update: (
      input: Parameters<RendererApi["chapter"]["update"]>[0],
    ): ReturnType<RendererApi["chapter"]["update"]> =>
      safeInvokeCore("chapter.update", IPC_CHANNELS.CHAPTER_UPDATE, input),
    delete: (id: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.CHAPTER_DELETE, id),
    restore: (id: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.CHAPTER_RESTORE, id),
    purge: (id: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.CHAPTER_PURGE, id),
    reorder: (projectId: string, chapterIds: string[]): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.CHAPTER_REORDER, projectId, chapterIds),
  },

  // Character API
  character: {
    create: (input: unknown): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.CHARACTER_CREATE, input),
    get: (id: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.CHARACTER_GET, id),
    getAll: (projectId: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.CHARACTER_GET_ALL, projectId),
    update: (input: unknown): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.CHARACTER_UPDATE, input),
    delete: (id: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.CHARACTER_DELETE, id),
  },

  // Event API
  event: {
    create: (input: unknown): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.EVENT_CREATE, input),
    get: (id: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.EVENT_GET, id),
    getAll: (projectId: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.EVENT_GET_ALL, projectId),
    update: (input: unknown): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.EVENT_UPDATE, input),
    delete: (id: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.EVENT_DELETE, id),
  },

  // Faction API
  faction: {
    create: (input: unknown): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.FACTION_CREATE, input),
    get: (id: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.FACTION_GET, id),
    getAll: (projectId: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.FACTION_GET_ALL, projectId),
    update: (input: unknown): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.FACTION_UPDATE, input),
    delete: (id: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.FACTION_DELETE, id),
  },

  // Term API
  term: {
    create: (input: unknown): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.TERM_CREATE, input),
    get: (id: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.TERM_GET, id),
    getAll: (projectId: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.TERM_GET_ALL, projectId),
    update: (input: unknown): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.TERM_UPDATE, input),
    delete: (id: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.TERM_DELETE, id),
  },

  // Snapshot API
  snapshot: {
    create: (input: unknown): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.SNAPSHOT_CREATE, input),
    getByProject: (
      projectId: string,
    ): ReturnType<RendererApi["snapshot"]["getByProject"]> =>
      safeInvokeCore("snapshot.getByProject", IPC_CHANNELS.SNAPSHOT_GET_BY_PROJECT, projectId),
    getAll: (projectId: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.SNAPSHOT_GET_ALL, projectId),
    getByChapter: (chapterId: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.SNAPSHOT_GET_BY_CHAPTER, chapterId),
    importFromFile: (
      filePath: string,
    ): ReturnType<RendererApi["snapshot"]["importFromFile"]> =>
      safeInvokeCore("snapshot.importFromFile", IPC_CHANNELS.SNAPSHOT_IMPORT_FILE, filePath),
    restore: (id: string): ReturnType<RendererApi["snapshot"]["restore"]> =>
      safeInvokeCore("snapshot.restore", IPC_CHANNELS.SNAPSHOT_RESTORE, id),
    delete: (id: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.SNAPSHOT_DELETE, id),
  },

  // Export API
  export: {
    create: (request: unknown): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.EXPORT_CREATE, request),
  },

  // File System API
  fs: {
    saveProject: (
      projectName: string,
      projectPath: string,
      content: string,
    ): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.FS_SAVE_PROJECT, projectName, projectPath, content),
    selectDirectory: (): Promise<IPCResponse<string>> =>
      safeInvoke(IPC_CHANNELS.FS_SELECT_DIRECTORY),
    selectFile: (options?: {
      title?: string;
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
    }): ReturnType<RendererApi["fs"]["selectFile"]> =>
      safeInvokeCore("fs.selectFile", IPC_CHANNELS.FS_SELECT_FILE, options),
    selectSnapshotBackup: (): Promise<IPCResponse<string>> =>
      safeInvoke(IPC_CHANNELS.FS_SELECT_SNAPSHOT_BACKUP),
    selectSaveLocation: (options?: {
      title?: string;
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
    }): ReturnType<RendererApi["fs"]["selectSaveLocation"]> =>
      safeInvokeCore("fs.selectSaveLocation", IPC_CHANNELS.FS_SELECT_SAVE_LOCATION, options),
    readFile: (filePath: string): Promise<IPCResponse<string>> =>
      safeInvoke(IPC_CHANNELS.FS_READ_FILE, filePath),
    readLuieEntry: (
      packagePath: string,
      entryPath: string,
    ): ReturnType<RendererApi["fs"]["readLuieEntry"]> =>
      safeInvokeCore("fs.readLuieEntry", IPC_CHANNELS.FS_READ_LUIE_ENTRY, packagePath, entryPath),
    writeFile: (filePath: string, content: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.FS_WRITE_FILE, filePath, content),

    // .luie package directory helpers
    createLuiePackage: (
      packagePath: string,
      meta: unknown,
    ): Promise<IPCResponse<{ path: string }>> =>
      safeInvoke(IPC_CHANNELS.FS_CREATE_LUIE_PACKAGE, packagePath, meta),
    writeProjectFile: (
      projectRoot: string,
      relativePath: string,
      content: string,
    ): Promise<IPCResponse<{ path: string }>> =>
      safeInvoke(IPC_CHANNELS.FS_WRITE_PROJECT_FILE, projectRoot, relativePath, content),
    approveProjectPath: (
      projectPath: string,
    ): Promise<IPCResponse<{ approved: boolean; normalizedPath: string }>> =>
      safeInvoke(IPC_CHANNELS.FS_APPROVE_PROJECT_PATH, projectPath),
  },

  // Search API
  search: (query: unknown): Promise<IPCResponse<never>> =>
    safeInvoke(IPC_CHANNELS.SEARCH, query),

  // Auto Save API
  autoSave: (
    chapterId: string,
    content: string,
    projectId: string,
  ): Promise<IPCResponse<never>> =>
    new Promise<IPCResponse<never>>((resolve) => {
      const key = `${projectId}:${chapterId}`;
      const existing = autoSaveQueue.get(key);
      const payload = { chapterId, content, projectId };

      if (existing) {
        existing.payload = payload;
        existing.resolvers.push(resolve);
      } else {
        autoSaveQueue.set(key, { payload, resolvers: [resolve] });
      }

      scheduleAutoSaveFlush();
    }),

  // Lifecycle API
  lifecycle: {
    setDirty: (dirty: boolean): void => {
      rendererDirty = Boolean(dirty);
    },
    onQuitPhase: (callback: (payload: AppQuitPhasePayload) => void): (() => void) => {
      const listener = (_event: unknown, payload: AppQuitPhasePayload) => {
        callback(payload);
      };
      ipcRenderer.on(IPC_CHANNELS.APP_QUIT_PHASE, listener);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.APP_QUIT_PHASE, listener);
      };
    },
  },

  // Window API
  window: {
    maximize: (): Promise<IPCResponse<never>> => safeInvoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: (): Promise<IPCResponse<never>> => safeInvoke(IPC_CHANNELS.WINDOW_CLOSE),
    toggleFullscreen: (): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.WINDOW_TOGGLE_FULLSCREEN),
    setFullscreen: (flag: boolean): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.WINDOW_SET_FULLSCREEN, flag),
    openExport: (chapterId: string): ReturnType<RendererApi["window"]["openExport"]> =>
      safeInvokeCore("window.openExport", IPC_CHANNELS.WINDOW_OPEN_EXPORT, chapterId),
    openWorldGraph: (): ReturnType<RendererApi["window"]["openWorldGraph"]> =>
      safeInvoke(IPC_CHANNELS.WINDOW_OPEN_WORLD_GRAPH),
  },

  app: {
    getVersion: (): ReturnType<RendererApi["app"]["getVersion"]> =>
      safeInvokeCore("app.getVersion", IPC_CHANNELS.APP_GET_VERSION),
    checkUpdate: (): ReturnType<RendererApi["app"]["checkUpdate"]> =>
      safeInvokeCore("app.checkUpdate", IPC_CHANNELS.APP_CHECK_UPDATE),
    getUpdateState: (): ReturnType<RendererApi["app"]["getUpdateState"]> =>
      safeInvokeCore("app.getUpdateState", IPC_CHANNELS.APP_GET_UPDATE_STATE),
    downloadUpdate: (): ReturnType<RendererApi["app"]["downloadUpdate"]> =>
      safeInvokeCore("app.downloadUpdate", IPC_CHANNELS.APP_DOWNLOAD_UPDATE),
    applyUpdate: (): ReturnType<RendererApi["app"]["applyUpdate"]> =>
      safeInvokeCore("app.applyUpdate", IPC_CHANNELS.APP_APPLY_UPDATE),
    rollbackUpdate: (): ReturnType<RendererApi["app"]["rollbackUpdate"]> =>
      safeInvokeCore("app.rollbackUpdate", IPC_CHANNELS.APP_ROLLBACK_UPDATE),
    getBootstrapStatus: (): ReturnType<RendererApi["app"]["getBootstrapStatus"]> =>
      safeInvokeCore("app.getBootstrapStatus", IPC_CHANNELS.APP_GET_BOOTSTRAP_STATUS),
    onBootstrapStatus: (callback: (status: AppBootstrapStatus) => void): (() => void) => {
      const listener = (_event: unknown, status: AppBootstrapStatus) => {
        callback(status);
      };
      ipcRenderer.on(IPC_CHANNELS.APP_BOOTSTRAP_STATUS_CHANGED, listener);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.APP_BOOTSTRAP_STATUS_CHANGED, listener);
      };
    },
    onUpdateState: (
      callback: Parameters<RendererApi["app"]["onUpdateState"]>[0],
    ): ReturnType<RendererApi["app"]["onUpdateState"]> => {
      const listener = (_event: unknown, state: AppUpdateState) => {
        callback(state);
      };
      ipcRenderer.on(IPC_CHANNELS.APP_UPDATE_STATE_CHANGED, listener);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.APP_UPDATE_STATE_CHANGED, listener);
      };
    },
    quit: (): Promise<IPCResponse<never>> => safeInvoke(IPC_CHANNELS.APP_QUIT),
  },

  // Logger API
  logger: {
    debug: (message: string, data?: unknown): Promise<IPCResponse<never>> => {
      logQueue.push({ level: "debug", message, data: sanitizeForIpc(data) });
      if (logQueue.length >= LOG_BATCH_SIZE) {
        void flushLogs();
      } else {
        scheduleLogFlush();
      }
      return Promise.resolve({ success: true } as IPCResponse<never>);
    },
    info: (message: string, data?: unknown): Promise<IPCResponse<never>> => {
      logQueue.push({ level: "info", message, data: sanitizeForIpc(data) });
      if (logQueue.length >= LOG_BATCH_SIZE) {
        void flushLogs();
      } else {
        scheduleLogFlush();
      }
      return Promise.resolve({ success: true } as IPCResponse<never>);
    },
    warn: (message: string, data?: unknown): Promise<IPCResponse<never>> => {
      logQueue.push({ level: "warn", message, data: sanitizeForIpc(data) });
      if (logQueue.length >= LOG_BATCH_SIZE) {
        void flushLogs();
      } else {
        scheduleLogFlush();
      }
      return Promise.resolve({ success: true } as IPCResponse<never>);
    },
    error: (message: string, data?: unknown): Promise<IPCResponse<never>> => {
      // errors are flushed immediately
      const payload = { level: "error", message, data: sanitizeForIpc(data) };
      logQueue.push(payload);
      void flushLogs();
      return Promise.resolve({ success: true } as IPCResponse<never>);
    },
  },

  // Settings API
  settings: {
    getAll: (): ReturnType<RendererApi["settings"]["getAll"]> =>
      safeInvokeCore("settings.getAll", IPC_CHANNELS.SETTINGS_GET_ALL),
    getEditor: (): ReturnType<RendererApi["settings"]["getEditor"]> =>
      safeInvokeCore("settings.getEditor", IPC_CHANNELS.SETTINGS_GET_EDITOR),
    setEditor: (
      settings: Parameters<RendererApi["settings"]["setEditor"]>[0],
    ): ReturnType<RendererApi["settings"]["setEditor"]> =>
      safeInvokeCore("settings.setEditor", IPC_CHANNELS.SETTINGS_SET_EDITOR, settings),
    getAutoSave: (): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.SETTINGS_GET_AUTO_SAVE),
    setAutoSave: (settings: unknown): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.SETTINGS_SET_AUTO_SAVE, settings),
    getLanguage: (): ReturnType<RendererApi["settings"]["getLanguage"]> =>
      safeInvokeCore("settings.getLanguage", IPC_CHANNELS.SETTINGS_GET_LANGUAGE),
    setLanguage: (
      settings: Parameters<RendererApi["settings"]["setLanguage"]>[0],
    ): ReturnType<RendererApi["settings"]["setLanguage"]> =>
      safeInvokeCore("settings.setLanguage", IPC_CHANNELS.SETTINGS_SET_LANGUAGE, settings),
    getMenuBarMode: (): ReturnType<RendererApi["settings"]["getMenuBarMode"]> =>
      safeInvokeCore("settings.getMenuBarMode", IPC_CHANNELS.SETTINGS_GET_MENU_BAR_MODE),
    setMenuBarMode: (
      settings: Parameters<RendererApi["settings"]["setMenuBarMode"]>[0],
    ): ReturnType<RendererApi["settings"]["setMenuBarMode"]> =>
      safeInvokeCore("settings.setMenuBarMode", IPC_CHANNELS.SETTINGS_SET_MENU_BAR_MODE, settings),
    getShortcuts: (): ReturnType<RendererApi["settings"]["getShortcuts"]> =>
      safeInvokeCore("settings.getShortcuts", IPC_CHANNELS.SETTINGS_GET_SHORTCUTS),
    setShortcuts: (
      settings: Parameters<RendererApi["settings"]["setShortcuts"]>[0],
    ): ReturnType<RendererApi["settings"]["setShortcuts"]> =>
      safeInvokeCore("settings.setShortcuts", IPC_CHANNELS.SETTINGS_SET_SHORTCUTS, settings),
    getWindowBounds: (): ReturnType<RendererApi["settings"]["getWindowBounds"]> =>
      safeInvokeCore("settings.getWindowBounds", IPC_CHANNELS.SETTINGS_GET_WINDOW_BOUNDS),
    setWindowBounds: (
      bounds: Parameters<RendererApi["settings"]["setWindowBounds"]>[0],
    ): ReturnType<RendererApi["settings"]["setWindowBounds"]> =>
      safeInvokeCore("settings.setWindowBounds", IPC_CHANNELS.SETTINGS_SET_WINDOW_BOUNDS, bounds),
    reset: (): Promise<IPCResponse<never>> => safeInvoke(IPC_CHANNELS.SETTINGS_RESET),
  },

  // Recovery API
  recovery: {
    runDb: (
      options?: Parameters<RendererApi["recovery"]["runDb"]>[0],
    ): ReturnType<RendererApi["recovery"]["runDb"]> =>
      safeInvokeCore("recovery.runDb", IPC_CHANNELS.RECOVERY_DB_RUN, options),
  },

  // Sync API
  sync: {
    getStatus: (): ReturnType<RendererApi["sync"]["getStatus"]> =>
      safeInvokeCore("sync.getStatus", IPC_CHANNELS.SYNC_GET_STATUS),
    connectGoogle: (): ReturnType<RendererApi["sync"]["connectGoogle"]> =>
      safeInvokeCore("sync.connectGoogle", IPC_CHANNELS.SYNC_CONNECT_GOOGLE),
    disconnect: (): ReturnType<RendererApi["sync"]["disconnect"]> =>
      safeInvokeCore("sync.disconnect", IPC_CHANNELS.SYNC_DISCONNECT),
    runNow: (): ReturnType<RendererApi["sync"]["runNow"]> =>
      safeInvokeCore("sync.runNow", IPC_CHANNELS.SYNC_RUN_NOW),
    setAutoSync: (
      settings: Parameters<RendererApi["sync"]["setAutoSync"]>[0],
    ): ReturnType<RendererApi["sync"]["setAutoSync"]> =>
      safeInvokeCore("sync.setAutoSync", IPC_CHANNELS.SYNC_SET_AUTO, settings),
    resolveConflict: (
      resolution: Parameters<RendererApi["sync"]["resolveConflict"]>[0],
    ): ReturnType<RendererApi["sync"]["resolveConflict"]> =>
      safeInvokeCore(
        "sync.resolveConflict",
        IPC_CHANNELS.SYNC_RESOLVE_CONFLICT,
        resolution,
      ),
    onStatusChanged: (callback: (status: SyncStatus) => void): (() => void) => {
      const listener = (_event: unknown, status: SyncStatus) => {
        callback(status);
      };
      ipcRenderer.on(IPC_CHANNELS.SYNC_STATUS_CHANGED, listener);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.SYNC_STATUS_CHANGED, listener);
      };
    },
  },

  // Analysis API
  analysis: {
    start: (chapterId: string, projectId: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.ANALYSIS_START, { chapterId, projectId }),
    stop: (): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.ANALYSIS_STOP),
    clear: (): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.ANALYSIS_CLEAR),
    onStream: (callback: (data: unknown) => void): (() => void) => {
      const listener = (_event: unknown, data: unknown) => {
        callback(data);
      };
      ipcRenderer.on(IPC_CHANNELS.ANALYSIS_STREAM, listener);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.ANALYSIS_STREAM, listener);
      };
    },
    onError: (callback: (error: unknown) => void): (() => void) => {
      const listener = (_event: unknown, error: unknown) => {
        callback(error);
      };
      ipcRenderer.on(IPC_CHANNELS.ANALYSIS_ERROR, listener);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.ANALYSIS_ERROR, listener);
      };
    },
  },

  // World Entity API
  worldEntity: {
    create: (input: unknown): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.WORLD_ENTITY_CREATE, input),
    get: (id: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.WORLD_ENTITY_GET, id),
    getAll: (projectId: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.WORLD_ENTITY_GET_ALL, projectId),
    update: (input: unknown): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.WORLD_ENTITY_UPDATE, input),
    updatePosition: (input: unknown): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.WORLD_ENTITY_UPDATE_POSITION, input),
    delete: (id: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.WORLD_ENTITY_DELETE, id),
  },

  // Entity Relation API
  entityRelation: {
    create: (input: unknown): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.ENTITY_RELATION_CREATE, input),
    getAll: (projectId: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.ENTITY_RELATION_GET_ALL, projectId),
    update: (input: unknown): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.ENTITY_RELATION_UPDATE, input),
    delete: (id: string): Promise<IPCResponse<never>> =>
      safeInvoke(IPC_CHANNELS.ENTITY_RELATION_DELETE, id),
  },

  // World Graph API
  worldGraph: {
    get: (projectId: string): ReturnType<RendererApi["worldGraph"]["get"]> =>
      safeInvoke(IPC_CHANNELS.WORLD_GRAPH_GET, projectId),
    getMentions: (
      query: Parameters<RendererApi["worldGraph"]["getMentions"]>[0],
    ): ReturnType<RendererApi["worldGraph"]["getMentions"]> =>
      safeInvoke(IPC_CHANNELS.WORLD_GRAPH_GET_MENTIONS, query),
  },
} satisfies RendererApi;

// Expose API to renderer process
contextBridge.exposeInMainWorld("api", rendererApi);

// ─── Graceful Quit Support ──────
// When the main process signals that the app is about to quit,
// immediately flush the autoSave queue and log queue so that
// all dirty content reaches the main process before shutdown.

ipcRenderer.on(IPC_CHANNELS.APP_BEFORE_QUIT, async () => {
  const hadQueuedAutoSaves = autoSaveQueue.size > 0;
  try {
    // Force-flush any queued auto-saves so IPC arrives at main
    await flushAutoSaves();
    // Flush logs too
    await flushLogs();
  } catch {
    // Best effort – even if this fails, mirrors may still have content
  } finally {
    ipcRenderer.send(IPC_CHANNELS.APP_FLUSH_COMPLETE, {
      hadQueuedAutoSaves,
      rendererDirty,
    });
  }
});

// Also flush on beforeunload as a secondary safety net.
// This fires when the BrowserWindow navigates away or closes.
window.addEventListener("beforeunload", () => {
  // Fire-and-forget: start the flush; it may or may not complete
  // before the window is torn down, but it gives us one more chance.
  void flushAutoSaves();
  void flushLogs();
});
