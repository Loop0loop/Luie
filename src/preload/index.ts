/**
 * Preload script - Electron contextBridge
 */

import { contextBridge, ipcRenderer } from "electron";
import type { IPCResponse } from "../shared/ipc/index.js";

// Expose API to renderer process
contextBridge.exposeInMainWorld("api", {
  // Project API
  project: {
    create: (input: unknown): Promise<IPCResponse> =>
      ipcRenderer.invoke("project:create", input),
    get: (id: string): Promise<IPCResponse> =>
      ipcRenderer.invoke("project:get", id),
    getAll: (): Promise<IPCResponse> => ipcRenderer.invoke("project:get-all"),
    update: (input: unknown): Promise<IPCResponse> =>
      ipcRenderer.invoke("project:update", input),
    delete: (id: string): Promise<IPCResponse> =>
      ipcRenderer.invoke("project:delete", id),
  },

  // Chapter API
  chapter: {
    create: (input: unknown): Promise<IPCResponse> =>
      ipcRenderer.invoke("chapter:create", input),
    get: (id: string): Promise<IPCResponse> =>
      ipcRenderer.invoke("chapter:get", id),
    getAll: (projectId: string): Promise<IPCResponse> =>
      ipcRenderer.invoke("chapter:get-all", projectId),
    update: (input: unknown): Promise<IPCResponse> =>
      ipcRenderer.invoke("chapter:update", input),
    delete: (id: string): Promise<IPCResponse> =>
      ipcRenderer.invoke("chapter:delete", id),
    reorder: (projectId: string, chapterIds: string[]): Promise<IPCResponse> =>
      ipcRenderer.invoke("chapter:reorder", projectId, chapterIds),
  },

  // Character API
  character: {
    create: (input: unknown): Promise<IPCResponse> =>
      ipcRenderer.invoke("character:create", input),
    get: (id: string): Promise<IPCResponse> =>
      ipcRenderer.invoke("character:get", id),
    getAll: (projectId: string): Promise<IPCResponse> =>
      ipcRenderer.invoke("character:get-all", projectId),
    update: (input: unknown): Promise<IPCResponse> =>
      ipcRenderer.invoke("character:update", input),
    delete: (id: string): Promise<IPCResponse> =>
      ipcRenderer.invoke("character:delete", id),
  },

  // Term API
  term: {
    create: (input: unknown): Promise<IPCResponse> =>
      ipcRenderer.invoke("term:create", input),
    get: (id: string): Promise<IPCResponse> =>
      ipcRenderer.invoke("term:get", id),
    getAll: (projectId: string): Promise<IPCResponse> =>
      ipcRenderer.invoke("term:get-all", projectId),
    update: (input: unknown): Promise<IPCResponse> =>
      ipcRenderer.invoke("term:update", input),
    delete: (id: string): Promise<IPCResponse> =>
      ipcRenderer.invoke("term:delete", id),
  },

  // Snapshot API
  snapshot: {
    create: (input: unknown): Promise<IPCResponse> =>
      ipcRenderer.invoke("snapshot:create", input),
    getAll: (projectId: string): Promise<IPCResponse> =>
      ipcRenderer.invoke("snapshot:get-all", projectId),
    restore: (id: string): Promise<IPCResponse> =>
      ipcRenderer.invoke("snapshot:restore", id),
    delete: (id: string): Promise<IPCResponse> =>
      ipcRenderer.invoke("snapshot:delete", id),
  },

  // Search API
  search: (query: unknown): Promise<IPCResponse> =>
    ipcRenderer.invoke("search", query),

  // Auto Save API
  autoSave: (
    chapterId: string,
    content: string,
    projectId: string,
  ): Promise<IPCResponse> =>
    ipcRenderer.invoke("auto-save", chapterId, content, projectId),
});
