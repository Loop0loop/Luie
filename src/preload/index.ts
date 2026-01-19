/**
 * Preload script - Electron contextBridge
 */

import { contextBridge, ipcRenderer } from "electron";
import type { IPCResponse } from "../shared/ipc/index.js";

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

// Expose API to renderer process
contextBridge.exposeInMainWorld("api", {
  // Project API
  project: {
    create: (input: unknown): Promise<IPCResponse> =>
      safeInvoke("project:create", input),
    get: (id: string): Promise<IPCResponse> =>
      safeInvoke("project:get", id),
    getAll: (): Promise<IPCResponse> => safeInvoke("project:get-all"),
    update: (input: unknown): Promise<IPCResponse> =>
      safeInvoke("project:update", input),
    delete: (id: string): Promise<IPCResponse> =>
      safeInvoke("project:delete", id),
  },

  // Chapter API
  chapter: {
    create: (input: unknown): Promise<IPCResponse> =>
      safeInvoke("chapter:create", input),
    get: (id: string): Promise<IPCResponse> =>
      safeInvoke("chapter:get", id),
    getAll: (projectId: string): Promise<IPCResponse> =>
      safeInvoke("chapter:get-all", projectId),
    update: (input: unknown): Promise<IPCResponse> =>
      safeInvoke("chapter:update", input),
    delete: (id: string): Promise<IPCResponse> =>
      safeInvoke("chapter:delete", id),
    reorder: (projectId: string, chapterIds: string[]): Promise<IPCResponse> =>
      safeInvoke("chapter:reorder", projectId, chapterIds),
  },

  // Character API
  character: {
    create: (input: unknown): Promise<IPCResponse> =>
      safeInvoke("character:create", input),
    get: (id: string): Promise<IPCResponse> =>
      safeInvoke("character:get", id),
    getAll: (projectId: string): Promise<IPCResponse> =>
      safeInvoke("character:get-all", projectId),
    update: (input: unknown): Promise<IPCResponse> =>
      safeInvoke("character:update", input),
    delete: (id: string): Promise<IPCResponse> =>
      safeInvoke("character:delete", id),
  },

  // Term API
  term: {
    create: (input: unknown): Promise<IPCResponse> =>
      safeInvoke("term:create", input),
    get: (id: string): Promise<IPCResponse> =>
      safeInvoke("term:get", id),
    getAll: (projectId: string): Promise<IPCResponse> =>
      safeInvoke("term:get-all", projectId),
    update: (input: unknown): Promise<IPCResponse> =>
      safeInvoke("term:update", input),
    delete: (id: string): Promise<IPCResponse> =>
      safeInvoke("term:delete", id),
  },

  // Snapshot API
  snapshot: {
    create: (input: unknown): Promise<IPCResponse> =>
      safeInvoke("snapshot:create", input),
    getAll: (projectId: string): Promise<IPCResponse> =>
      safeInvoke("snapshot:get-all", projectId),
    restore: (id: string): Promise<IPCResponse> =>
      safeInvoke("snapshot:restore", id),
    delete: (id: string): Promise<IPCResponse> =>
      safeInvoke("snapshot:delete", id),
  },

  // File System API
  fs: {
    saveProject: (
      projectName: string,
      projectPath: string,
      content: string,
    ): Promise<IPCResponse> =>
      safeInvoke("fs:save-project", projectName, projectPath, content),
    selectDirectory: (): Promise<IPCResponse<string>> =>
      safeInvoke("fs:select-directory"),
    selectSaveLocation: (options?: {
      filters?: { name: string; extensions: string[] }[];
      defaultPath?: string;
      title?: string;
    }): Promise<IPCResponse<string>> =>
      safeInvoke("fs:select-save-location", options),
    readFile: (filePath: string): Promise<IPCResponse<string>> =>
      safeInvoke("fs:read-file", filePath),
    writeFile: (filePath: string, content: string): Promise<IPCResponse> =>
      safeInvoke("fs:write-file", filePath, content),
  },

  // Search API
  search: (query: unknown): Promise<IPCResponse> =>
    safeInvoke("search", query),

  // Auto Save API
  autoSave: (
    chapterId: string,
    content: string,
    projectId: string,
  ): Promise<IPCResponse> =>
    safeInvoke("auto-save", chapterId, content, projectId),

  // Window API
  window: {
    maximize: (): Promise<IPCResponse> => safeInvoke("window:maximize"),
    toggleFullscreen: (): Promise<IPCResponse> =>
      safeInvoke("window:toggle-fullscreen"),
  },

  // Logger API
  logger: {
    debug: (message: string, data?: unknown): Promise<IPCResponse> =>
      safeInvoke("logger:log", {
        level: "debug",
        message,
        data: sanitizeForIpc(data),
      }),
    info: (message: string, data?: unknown): Promise<IPCResponse> =>
      safeInvoke("logger:log", {
        level: "info",
        message,
        data: sanitizeForIpc(data),
      }),
    warn: (message: string, data?: unknown): Promise<IPCResponse> =>
      safeInvoke("logger:log", {
        level: "warn",
        message,
        data: sanitizeForIpc(data),
      }),
    error: (message: string, data?: unknown): Promise<IPCResponse> =>
      safeInvoke("logger:log", {
        level: "error",
        message,
        data: sanitizeForIpc(data),
      }),
  },

  // Settings API
  settings: {
    getAll: (): Promise<IPCResponse> => safeInvoke("settings:get-all"),
    getEditor: (): Promise<IPCResponse> =>
      safeInvoke("settings:get-editor"),
    setEditor: (settings: unknown): Promise<IPCResponse> =>
      safeInvoke("settings:set-editor", settings),
    getAutoSave: (): Promise<IPCResponse> =>
      safeInvoke("settings:get-auto-save"),
    setAutoSave: (settings: unknown): Promise<IPCResponse> =>
      safeInvoke("settings:set-auto-save", settings),
    getWindowBounds: (): Promise<IPCResponse> =>
      safeInvoke("settings:get-window-bounds"),
    setWindowBounds: (bounds: unknown): Promise<IPCResponse> =>
      safeInvoke("settings:set-window-bounds", bounds),
    reset: (): Promise<IPCResponse> => safeInvoke("settings:reset"),
  },
});
