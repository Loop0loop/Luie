import { vi } from "vitest";

const mocked = vi.hoisted(() => {
  const handlerMap = new Map<
    string,
    (event: unknown, ...args: unknown[]) => Promise<unknown>
  >();
  const syncService = {
    getStatus: vi.fn(),
    connectGoogle: vi.fn(),
    disconnect: vi.fn(),
    runNow: vi.fn(),
    setAutoSync: vi.fn(),
    resolveConflict: vi.fn(),
  };
  const narrativeMemoryQueryService = {
    query: vi.fn(),
    getConflictQueue: vi.fn(),
  };
  let appIsPackaged = true;

  return {
    handlerMap,
    syncService,
    narrativeMemoryQueryService,
    get appIsPackaged() {
      return appIsPackaged;
    },
    set appIsPackaged(next: boolean) {
      appIsPackaged = next;
    },
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    },
  };
});

const sharedSearchServices = () => ({
  search: vi.fn(),
  searchChunks: vi.fn(),
  getChunkBacklink: vi.fn(),
});

const sharedSearchIndexServices = () => ({
  getSearchIndexStatus: vi.fn(),
  rebuildSearchIndex: vi.fn(),
  rebuildMemoryChunks: vi.fn(),
  getMemoryJobStatus: vi.fn(),
  runIntegrityCheck: vi.fn(),
  getMigrationHealth: vi.fn(),
});

const sharedChapterSummaryServices = () => ({
  getChapterSummary: vi.fn(),
  getSummaryStatus: vi.fn(),
});

const sharedEmbeddingStatusServices = () => ({
  getEmbeddingStatus: vi.fn(),
});

vi.mock("electron", () => ({
  app: {
    quit: vi.fn(),
    getVersion: vi.fn(() => "0.0.0-test"),
    get isPackaged() {
      return mocked.appIsPackaged;
    },
  },
  ipcMain: {
    handle: vi.fn(
      (
        channel: string,
        handler: (event: unknown, ...args: unknown[]) => Promise<unknown>,
      ) => {
        mocked.handlerMap.set(channel, handler);
      },
    ),
  },
}));

vi.mock("../../../src/main/manager/index.js", () => ({
  windowManager: {
    getMainWindow: () => null,
    createExportWindow: vi.fn(),
  },
}));

vi.mock("../../../src/main/services/features/sync/syncService.js", () => ({
  syncService: mocked.syncService,
}));

export const resetInputValidationMocks = () => {
  mocked.handlerMap.clear();
  mocked.syncService.getStatus.mockReset();
  mocked.syncService.connectGoogle.mockReset();
  mocked.syncService.disconnect.mockReset();
  mocked.syncService.runNow.mockReset();
  mocked.syncService.setAutoSync.mockReset();
  mocked.syncService.resolveConflict.mockReset();
  mocked.narrativeMemoryQueryService.query.mockReset();
  mocked.narrativeMemoryQueryService.getConflictQueue.mockReset();
  mocked.logger.info.mockReset();
  mocked.logger.warn.mockReset();
  mocked.logger.debug.mockReset();
  mocked.logger.error.mockReset();
  mocked.appIsPackaged = true;
  delete process.env.LUIE_ALLOW_RUNTIME_SUPABASE_CONFIG_WRITE;
};

export const registerSearchInputHandlers = async (
  narrativeMemoryQueryService: {
    query: unknown;
    getConflictQueue: unknown;
  },
) => {
  const { registerSearchIPCHandlers } =
    await import("../../../src/main/handler/search/ipcSearchHandlers.js");
  registerSearchIPCHandlers(
    mocked.logger,
    sharedSearchServices(),
    sharedSearchIndexServices(),
    sharedChapterSummaryServices(),
    sharedEmbeddingStatusServices(),
    narrativeMemoryQueryService,
  );
};

export const registerWindowInputHandlers = async () => {
  const { registerWindowIPCHandlers } =
    await import("../../../src/main/handler/system/ipcWindowHandlers.js");
  registerWindowIPCHandlers(mocked.logger);
};

export const registerSyncInputHandlers = async () => {
  const { registerSyncIPCHandlers } =
    await import("../../../src/main/handler/system/ipcSyncHandlers.js");
  registerSyncIPCHandlers(mocked.logger);
};

export const registerChapterInputHandlers = async (chapterService: {
  createChapter: () => unknown;
  getChapter: () => unknown;
  getAllChapters: () => unknown;
  getDeletedChapters: () => unknown;
  updateChapter: () => unknown;
  deleteChapter: () => unknown;
  restoreChapter: () => unknown;
  purgeChapter: () => unknown;
  reorderChapters: () => unknown;
}) => {
  const { registerChapterIPCHandlers } =
    await import("../../../src/main/handler/project/ipcChapterHandlers.js");
  registerChapterIPCHandlers(mocked.logger, chapterService);
};

export const registerAutoSaveInputHandlers = async (autoSaveManager: {
  triggerSave: () => unknown;
  flushAll: () => unknown;
}) => {
  const { registerAutoSaveIPCHandlers } =
    await import("../../../src/main/handler/writing/ipcAutoSaveHandlers.js");
  registerAutoSaveIPCHandlers(mocked.logger, autoSaveManager);
};

export { mocked };

