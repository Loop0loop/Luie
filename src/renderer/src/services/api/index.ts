import type { IPCResponse } from "../../../../shared/ipc/index.js";
import type {
  AppSettings,
  Chapter,
  Character,
  EditorSettings,
  Project,
  ProjectOpenResult,
  SearchResult,
  Snapshot,
  Term,
} from "../../../../shared/types/index.js";

export type RendererApi = {
  project: {
    create: (input: {
      title: string;
      description?: string;
      projectPath?: string;
    }) => Promise<IPCResponse<Project>>;
    openLuie: (packagePath: string) => Promise<IPCResponse<ProjectOpenResult>>;
    get: (id: string) => Promise<IPCResponse<Project>>;
    getAll: () => Promise<IPCResponse<Project[]>>;
    update: (input: {
      id: string;
      title?: string;
      description?: string;
      projectPath?: string;
    }) => Promise<IPCResponse<Project>>;
    delete: (id: string) => Promise<IPCResponse<unknown>>;
  };
  chapter: {
    create: (input: {
      projectId: string;
      title: string;
      synopsis?: string;
    }) => Promise<IPCResponse<Chapter>>;
    get: (id: string) => Promise<IPCResponse<Chapter>>;
    getAll: (projectId: string) => Promise<IPCResponse<Chapter[]>>;
    getDeleted: (projectId: string) => Promise<IPCResponse<Chapter[]>>;
    update: (input: {
      id: string;
      title?: string;
      content?: string;
      synopsis?: string;
    }) => Promise<IPCResponse<Chapter>>;
    delete: (id: string) => Promise<IPCResponse<unknown>>;
    restore: (id: string) => Promise<IPCResponse<Chapter>>;
    purge: (id: string) => Promise<IPCResponse<unknown>>;
    reorder: (projectId: string, chapterIds: string[]) => Promise<IPCResponse<unknown>>;
  };
  character: {
    create: (input: {
      projectId: string;
      name: string;
      description?: string;
      firstAppearance?: string;
      attributes?: Record<string, unknown>;
    }) => Promise<IPCResponse<Character>>;
    get: (id: string) => Promise<IPCResponse<Character>>;
    getAll: (projectId: string) => Promise<IPCResponse<Character[]>>;
    update: (input: {
      id: string;
      name?: string;
      description?: string;
      firstAppearance?: string;
      attributes?: Record<string, unknown>;
    }) => Promise<IPCResponse<Character>>;
    delete: (id: string) => Promise<IPCResponse<unknown>>;
  };
  term: {
    create: (input: {
      projectId: string;
      term: string;
      definition?: string;
      category?: string;
      firstAppearance?: string;
    }) => Promise<IPCResponse<Term>>;
    get: (id: string) => Promise<IPCResponse<Term>>;
    getAll: (projectId: string) => Promise<IPCResponse<Term[]>>;
    update: (input: {
      id: string;
      term?: string;
      definition?: string;
      category?: string;
      firstAppearance?: string;
    }) => Promise<IPCResponse<Term>>;
    delete: (id: string) => Promise<IPCResponse<unknown>>;
  };
  snapshot: {
    create: (input: {
      projectId: string;
      chapterId?: string;
      content: string;
      description?: string;
      type?: "AUTO" | "MANUAL";
    }) => Promise<IPCResponse<Snapshot>>;
    getAll: (projectId: string) => Promise<IPCResponse<Snapshot[]>>;
    getByChapter: (chapterId: string) => Promise<IPCResponse<Snapshot[]>>;
    importFromFile: (filePath: string) => Promise<IPCResponse<Project>>;
    restore: (id: string) => Promise<IPCResponse<unknown>>;
    delete: (id: string) => Promise<IPCResponse<unknown>>;
  };
  fs: {
    saveProject: (projectName: string, projectPath: string, content: string) => Promise<IPCResponse<unknown>>;
    selectDirectory: () => Promise<IPCResponse<string>>;
    selectFile: (options?: {
      filters?: { name: string; extensions: string[] }[];
      defaultPath?: string;
      title?: string;
    }) => Promise<IPCResponse<string>>;
    selectSnapshotBackup: () => Promise<IPCResponse<string>>;
    selectSaveLocation: (options?: {
      filters?: { name: string; extensions: string[] }[];
      defaultPath?: string;
      title?: string;
    }) => Promise<IPCResponse<string>>;
    readFile: (filePath: string) => Promise<IPCResponse<string>>;
    readLuieEntry: (packagePath: string, entryPath: string) => Promise<IPCResponse<string | null>>;
    writeFile: (filePath: string, content: string) => Promise<IPCResponse<unknown>>;
    createLuiePackage: (packagePath: string, meta: unknown) => Promise<IPCResponse<{ path: string }>>;
    writeProjectFile: (projectRoot: string, relativePath: string, content: string) => Promise<IPCResponse<{ path: string }>>;
  };
  search: (query: {
    projectId: string;
    query: string;
    type?: "all" | "character" | "term";
  }) => Promise<IPCResponse<SearchResult[]>>;
  autoSave: (chapterId: string, content: string, projectId: string) => Promise<IPCResponse<unknown>>;
  lifecycle: {
    setDirty: (dirty: boolean) => void;
  };
  settings: {
    getAll: () => Promise<IPCResponse<AppSettings>>;
    getEditor: () => Promise<IPCResponse<EditorSettings>>;
    setEditor: (settings: EditorSettings) => Promise<IPCResponse<EditorSettings>>;
    getAutoSave: () => Promise<IPCResponse<{ enabled: boolean; interval: number }>>;
    setAutoSave: (settings: { enabled?: boolean; interval?: number }) => Promise<IPCResponse<{ enabled: boolean; interval: number }>>;
    getLanguage: () => Promise<IPCResponse<{ language: "ko" | "en" | "ja" }>>;
    setLanguage: (settings: { language: "ko" | "en" | "ja" }) => Promise<IPCResponse<{ language: "ko" | "en" | "ja" }>>;
    getShortcuts: () => Promise<IPCResponse<{ shortcuts: Record<string, string>; defaults: Record<string, string> }>>;
    setShortcuts: (settings: { shortcuts: Record<string, string> }) => Promise<IPCResponse<{ shortcuts: Record<string, string>; defaults: Record<string, string> }>>;
    getWindowBounds: () => Promise<IPCResponse<{ width: number; height: number; x: number; y: number } | undefined>>;
    setWindowBounds: (bounds: { width: number; height: number; x: number; y: number }) => Promise<IPCResponse<{ width: number; height: number; x: number; y: number }>>;
    reset: () => Promise<IPCResponse<AppSettings>>;
  };
  recovery: {
    runDb: (options?: { dryRun?: boolean }) => Promise<IPCResponse<unknown>>;
  };
  app: {
    quit: () => Promise<IPCResponse<unknown>>;
  };
  window: {
    maximize: () => Promise<IPCResponse<unknown>>;
    close: () => Promise<IPCResponse<unknown>>;
    toggleFullscreen: () => Promise<IPCResponse<unknown>>;
    setFullscreen: (flag: boolean) => Promise<IPCResponse<unknown>>;
    openExport: (chapterId: string) => Promise<IPCResponse<unknown>>;
  };
  logger: {
    debug: (message: string, data?: unknown) => Promise<IPCResponse<unknown>>;
    info: (message: string, data?: unknown) => Promise<IPCResponse<unknown>>;
    warn: (message: string, data?: unknown) => Promise<IPCResponse<unknown>>;
    error: (message: string, data?: unknown) => Promise<IPCResponse<unknown>>;
  };
  analysis: {
    start: (chapterId: string, projectId: string) => Promise<IPCResponse<unknown>>;
    stop: () => Promise<IPCResponse<unknown>>;
    clear: () => Promise<IPCResponse<unknown>>;
    onStream: (callback: (data: unknown) => void) => () => void;
    onError: (callback: (error: unknown) => void) => () => void;
  };
};

let apiClient: RendererApi | null = null;

export function setApiClient(client: RendererApi) {
  apiClient = client;
}

export function getApiClient(): RendererApi {
  if (apiClient) return apiClient;
  return window.api;
}

export const api = getApiClient();
