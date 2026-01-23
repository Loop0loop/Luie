/**
 * Preload script - Electron contextBridge
 */

import { contextBridge, ipcRenderer } from "electron";
import type { IPCResponse } from "../shared/ipc/index.js";
import { IPC_CHANNELS } from "../shared/ipc/channels.js";
import { AUTO_SAVE_FLUSH_MS, LOG_BATCH_SIZE, LOG_FLUSH_MS } from "../shared/constants/index.js";

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

async function safeInvoke<T = unknown>(channel: string, ...args: unknown[]): Promise<IPCResponse<T>> {
  return ipcRenderer
    .invoke(channel, ...args)
    .catch((error) =>
      ({
        success: false,
        error: {
          code: "IPC_INVOKE_FAILED",
          message: error instanceof Error ? error.message : String(error),
        },
      }) as IPCResponse<T>,
    );
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
  resolvers: Array<(value: IPCResponse) => void>;
};

const autoSaveQueue = new Map<string, AutoSavePending>();
let autoSaveFlushTimer: number | null = null;

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

// Expose API to renderer process
contextBridge.exposeInMainWorld("api", {
  // Project API
  project: {
    create: (input: unknown): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.PROJECT_CREATE, input),
    get: (id: string): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.PROJECT_GET, id),
    getAll: (): Promise<IPCResponse> => safeInvoke(IPC_CHANNELS.PROJECT_GET_ALL),
    update: (input: unknown): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.PROJECT_UPDATE, input),
    delete: (id: string): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.PROJECT_DELETE, id),
  },

  // Chapter API
  chapter: {
    create: (input: unknown): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.CHAPTER_CREATE, input),
    get: (id: string): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.CHAPTER_GET, id),
    getAll: (projectId: string): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.CHAPTER_GET_ALL, projectId),
    update: (input: unknown): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.CHAPTER_UPDATE, input),
    delete: (id: string): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.CHAPTER_DELETE, id),
    reorder: (projectId: string, chapterIds: string[]): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.CHAPTER_REORDER, projectId, chapterIds),
  },

  // Character API
  character: {
    create: (input: unknown): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.CHARACTER_CREATE, input),
    get: (id: string): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.CHARACTER_GET, id),
    getAll: (projectId: string): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.CHARACTER_GET_ALL, projectId),
    update: (input: unknown): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.CHARACTER_UPDATE, input),
    delete: (id: string): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.CHARACTER_DELETE, id),
  },

  // Term API
  term: {
    create: (input: unknown): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.TERM_CREATE, input),
    get: (id: string): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.TERM_GET, id),
    getAll: (projectId: string): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.TERM_GET_ALL, projectId),
    update: (input: unknown): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.TERM_UPDATE, input),
    delete: (id: string): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.TERM_DELETE, id),
  },

  // Snapshot API
  snapshot: {
    create: (input: unknown): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.SNAPSHOT_CREATE, input),
    getAll: (projectId: string): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.SNAPSHOT_GET_ALL, projectId),
    restore: (id: string): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.SNAPSHOT_RESTORE, id),
    delete: (id: string): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.SNAPSHOT_DELETE, id),
  },

  // File System API
  fs: {
    saveProject: (
      projectName: string,
      projectPath: string,
      content: string,
    ): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.FS_SAVE_PROJECT, projectName, projectPath, content),
    selectDirectory: (): Promise<IPCResponse<string>> =>
      safeInvoke(IPC_CHANNELS.FS_SELECT_DIRECTORY),
    selectSaveLocation: (options?: {
      safeInvoke(IPC_CHANNELS.FS_SELECT_SAVE_LOCATION, options),
      defaultPath?: string;
      safeInvoke(IPC_CHANNELS.FS_READ_FILE, filePath),
    }): Promise<IPCResponse<string>> =>
      safeInvoke(IPC_CHANNELS.FS_WRITE_FILE, filePath, content),
    readFile: (filePath: string): Promise<IPCResponse<string>> =>
      safeInvoke(IPC_CHANNELS.FS_CREATE_LUIE_PACKAGE, packagePath, meta),
    writeFile: (filePath: string, content: string): Promise<IPCResponse> =>
      safeInvoke("fs:write-file", filePath, content),

    // .luie package directory helpers
    createLuiePackage: (packagePath: string, meta: unknown): Promise<IPCResponse<{ path: string }>> =>
      safeInvoke(IPC_CHANNELS.FS_WRITE_PROJECT_FILE, projectRoot, relativePath, content),
    writeProjectFile: (
      projectRoot: string,
      relativePath: string,
      content: string,
    ): Promise<IPCResponse<{ path: string }>> =>
      safeInvoke("fs:write-project-file", projectRoot, relativePath, content),
  },

  // Search API
  search: (query: unknown): Promise<IPCResponse> =>
    safeInvoke(IPC_CHANNELS.SEARCH, query),

  // Auto Save API
  autoSave: (
    chapterId: string,
    content: string,
    projectId: string,
  ): Promise<IPCResponse> =>
    new Promise<IPCResponse>((resolve) => {
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

  // Window API
  window: {
    maximize: (): Promise<IPCResponse> => safeInvoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
    toggleFullscreen: (): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.WINDOW_TOGGLE_FULLSCREEN),
  },

  // Logger API
  logger: {
    debug: (message: string, data?: unknown): Promise<IPCResponse> => {
      logQueue.push({ level: "debug", message, data: sanitizeForIpc(data) });
      if (logQueue.length >= LOG_BATCH_SIZE) {
        void flushLogs();
      } else {
        scheduleLogFlush();
      }
      return Promise.resolve({ success: true } as IPCResponse);
    },
    info: (message: string, data?: unknown): Promise<IPCResponse> => {
      logQueue.push({ level: "info", message, data: sanitizeForIpc(data) });
      if (logQueue.length >= LOG_BATCH_SIZE) {
        void flushLogs();
      } else {
        scheduleLogFlush();
      }
      return Promise.resolve({ success: true } as IPCResponse);
    },
    warn: (message: string, data?: unknown): Promise<IPCResponse> => {
      logQueue.push({ level: "warn", message, data: sanitizeForIpc(data) });
      if (logQueue.length >= LOG_BATCH_SIZE) {
        void flushLogs();
      } else {
        scheduleLogFlush();
      }
      return Promise.resolve({ success: true } as IPCResponse);
    },
    error: (message: string, data?: unknown): Promise<IPCResponse> => {
      // errors are flushed immediately
      const payload = { level: "error", message, data: sanitizeForIpc(data) };
      logQueue.push(payload);
      void flushLogs();
      return Promise.resolve({ success: true } as IPCResponse);
    },
  },

  // Settings API
  settings: {
    getAll: (): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.SETTINGS_GET_ALL),
    getEditor: (): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.SETTINGS_GET_EDITOR),
    setEditor: (settings: unknown): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.SETTINGS_SET_EDITOR, settings),
    getAutoSave: (): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.SETTINGS_GET_AUTO_SAVE),
    setAutoSave: (settings: unknown): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.SETTINGS_SET_AUTO_SAVE, settings),
    getWindowBounds: (): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.SETTINGS_GET_WINDOW_BOUNDS),
    setWindowBounds: (bounds: unknown): Promise<IPCResponse> =>
      safeInvoke(IPC_CHANNELS.SETTINGS_SET_WINDOW_BOUNDS, bounds),
    reset: (): Promise<IPCResponse> => safeInvoke(IPC_CHANNELS.SETTINGS_RESET),
  },
});
