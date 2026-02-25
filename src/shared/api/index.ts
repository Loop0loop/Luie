import type { IPCResponse } from "@shared/ipc/index.js";
import type {
  AppSettings,
  Chapter,
  Character,
  Event,
  Faction,
  EditorSettings,
  Project,
  ProjectOpenResult,
  SearchResult,
  Snapshot,
  Term,
  AppBootstrapStatus,
  AppQuitPhasePayload,
  WindowMenuBarMode,
  SyncRunResult,
  SyncStatus,
} from "@shared/types/index.js";

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
    removeLocal: (id: string) => Promise<IPCResponse<unknown>>;
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
  event: {
    create: (input: {
      projectId: string;
      name: string;
      description?: string;
      firstAppearance?: string;
      attributes?: Record<string, unknown>;
    }) => Promise<IPCResponse<Event>>;
    get: (id: string) => Promise<IPCResponse<Event>>;
    getAll: (projectId: string) => Promise<IPCResponse<Event[]>>;
    update: (input: {
      id: string;
      name?: string;
      description?: string;
      firstAppearance?: string;
      attributes?: Record<string, unknown>;
    }) => Promise<IPCResponse<Event>>;
    delete: (id: string) => Promise<IPCResponse<unknown>>;
  };
  faction: {
    create: (input: {
      projectId: string;
      name: string;
      description?: string;
      firstAppearance?: string;
      attributes?: Record<string, unknown>;
    }) => Promise<IPCResponse<Faction>>;
    get: (id: string) => Promise<IPCResponse<Faction>>;
    getAll: (projectId: string) => Promise<IPCResponse<Faction[]>>;
    update: (input: {
      id: string;
      name?: string;
      description?: string;
      firstAppearance?: string;
      attributes?: Record<string, unknown>;
    }) => Promise<IPCResponse<Faction>>;
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
  export: {
    create: (request: {
      projectId: string;
      chapterId: string;
      title: string;
      content: string;
      format: "DOCX" | "HWPX";
      paperSize: "A4" | "Letter" | "B5";
      marginTop: number;
      marginBottom: number;
      marginLeft: number;
      marginRight: number;
      fontFamily: string;
      fontSize: number;
      lineHeight: string;
      showPageNumbers: boolean;
      startPageNumber: number;
    }) => Promise<
      IPCResponse<{
        success: boolean;
        filePath?: string;
        error?: string;
        message?: string;
      }>
    >;
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
    onQuitPhase: (callback: (payload: AppQuitPhasePayload) => void) => () => void;
  };
  settings: {
    getAll: () => Promise<IPCResponse<AppSettings>>;
    getEditor: () => Promise<IPCResponse<EditorSettings>>;
    setEditor: (settings: EditorSettings) => Promise<IPCResponse<EditorSettings>>;
    getAutoSave: () => Promise<IPCResponse<{ enabled: boolean; interval: number }>>;
    setAutoSave: (settings: { enabled?: boolean; interval?: number }) => Promise<IPCResponse<{ enabled: boolean; interval: number }>>;
    getLanguage: () => Promise<IPCResponse<{ language: "ko" | "en" | "ja" }>>;
    setLanguage: (settings: { language: "ko" | "en" | "ja" }) => Promise<IPCResponse<{ language: "ko" | "en" | "ja" }>>;
    getMenuBarMode: () => Promise<IPCResponse<{ mode: WindowMenuBarMode }>>;
    setMenuBarMode: (settings: { mode: WindowMenuBarMode }) => Promise<IPCResponse<{ mode: WindowMenuBarMode }>>;
    getShortcuts: () => Promise<IPCResponse<{ shortcuts: Record<string, string>; defaults: Record<string, string> }>>;
    setShortcuts: (settings: { shortcuts: Record<string, string> }) => Promise<IPCResponse<{ shortcuts: Record<string, string>; defaults: Record<string, string> }>>;
    getWindowBounds: () => Promise<IPCResponse<{ width: number; height: number; x: number; y: number } | undefined>>;
    setWindowBounds: (bounds: { width: number; height: number; x: number; y: number }) => Promise<IPCResponse<{ width: number; height: number; x: number; y: number }>>;
    reset: () => Promise<IPCResponse<AppSettings>>;
  };
  recovery: {
    runDb: (options?: { dryRun?: boolean }) => Promise<IPCResponse<unknown>>;
  };
  sync: {
    getStatus: () => Promise<IPCResponse<SyncStatus>>;
    connectGoogle: () => Promise<IPCResponse<SyncStatus>>;
    disconnect: () => Promise<IPCResponse<SyncStatus>>;
    runNow: () => Promise<IPCResponse<SyncRunResult>>;
    setAutoSync: (settings: { enabled: boolean }) => Promise<IPCResponse<SyncStatus>>;
    onStatusChanged: (callback: (status: SyncStatus) => void) => () => void;
  };
  app: {
    getBootstrapStatus: () => Promise<IPCResponse<AppBootstrapStatus>>;
    onBootstrapStatus: (callback: (status: AppBootstrapStatus) => void) => () => void;
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

const PRELOAD_UNAVAILABLE_CODE = "PRELOAD_API_UNAVAILABLE";
const PRELOAD_UNAVAILABLE_MESSAGE =
  "Preload API is unavailable. Restart the app and verify the preload build.";
const EVENT_SUBSCRIPTION_METHODS = new Set([
  "onBootstrapStatus",
  "onStream",
  "onError",
  "onStatusChanged",
  "onQuitPhase",
]);
const VOID_METHODS = new Set(["setDirty"]);

let apiClient: RendererApi | null = null;
let preloadWarningLogged = false;

const getBrowserApi = (): RendererApi | null => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.api ?? null;
};

const resolvePath = (source: unknown, path: string[]): unknown => {
  let cursor: unknown = source;
  for (const segment of path) {
    if (
      !cursor ||
      (typeof cursor !== "object" && typeof cursor !== "function")
    ) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
};

const createUnavailableResponse = <T = unknown>(): IPCResponse<T> => ({
  success: false,
  error: {
    code: PRELOAD_UNAVAILABLE_CODE,
    message: PRELOAD_UNAVAILABLE_MESSAGE,
  },
  meta: {
    timestamp: new Date().toISOString(),
    channel: "renderer:api",
  },
});

const markPreloadUnavailable = (): void => {
  if (preloadWarningLogged) {
    return;
  }
  preloadWarningLogged = true;
};

const createDeferredApiNode = (path: string[]): unknown =>
  new Proxy(function deferredApiMethod() { }, {
    get: (_target, prop) => {
      if (prop === "then") {
        return undefined;
      }
      if (prop === Symbol.toStringTag) {
        return "DeferredRendererApi";
      }
      if (typeof prop === "symbol") {
        return undefined;
      }
      return createDeferredApiNode([...path, String(prop)]);
    },
    apply: (_target, _thisArg, args: unknown[]) => {
      const source = apiClient ?? getBrowserApi();
      const resolved = source ? resolvePath(source, path) : undefined;

      if (typeof resolved === "function") {
        return resolved(...args);
      }

      const methodName = path[path.length - 1] ?? "";
      if (EVENT_SUBSCRIPTION_METHODS.has(methodName)) {
        return () => undefined;
      }
      if (VOID_METHODS.has(methodName)) {
        return undefined;
      }

      markPreloadUnavailable();
      return Promise.resolve(createUnavailableResponse());
    },
  });

const deferredApiClient = createDeferredApiNode([]) as RendererApi;

export function setApiClient(client: RendererApi) {
  apiClient = client;
}

export function getApiClient(): RendererApi {
  return apiClient ?? getBrowserApi() ?? deferredApiClient;
}

export const api = getApiClient();
