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
    getReviewBacklog: vi.fn(),
    getConflictQueue: vi.fn(),
    listSuggestedEpisodes: vi.fn(),
    rejectEpisode: vi.fn(),
    listSuggestedFacts: vi.fn(),
    confirmFact: vi.fn(),
    rejectFact: vi.fn(),
    resolveFactConflict: vi.fn(),
    listSuggestedEntityAliases: vi.fn(),
    listSuggestedEntities: vi.fn(),
    confirmEntity: vi.fn(),
    rejectEntity: vi.fn(),
    confirmEntityAlias: vi.fn(),
    rejectEntityAlias: vi.fn(),
    splitEntityAlias: vi.fn(),
    mergeEntity: vi.fn(),
    reviewStaleEvidence: vi.fn(),
    repairEvidenceLinks: vi.fn(),
    runEvalSuite: vi.fn(),
    runIntentCalibration: vi.fn(),
    runEpisodeCalibration: vi.fn(),
  };
  const narrativeSummaryStatusService = {
    getStatus: vi.fn(),
  };
  const packagePersistence = {
    persistPackageAfterMutation: vi.fn(),
  };
  const memoryJobControl = {
    pauseMemoryBuildJobs: vi.fn(),
    resumeMemoryBuildJobs: vi.fn(),
    cancelMemoryBuildJobs: vi.fn(),
    getMemoryBuildJobProgress: vi.fn(),
  };
  let appIsPackaged = true;

  return {
    handlerMap,
    syncService,
    narrativeMemoryQueryService,
    narrativeSummaryStatusService,
    packagePersistence,
    memoryJobControl,
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
  getChunkWindow: vi.fn(),
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

vi.mock("../../../src/main/services/features/memory/jobControl.js", () => ({
  pauseMemoryBuildJobs: mocked.memoryJobControl.pauseMemoryBuildJobs,
  resumeMemoryBuildJobs: mocked.memoryJobControl.resumeMemoryBuildJobs,
  cancelMemoryBuildJobs: mocked.memoryJobControl.cancelMemoryBuildJobs,
  getMemoryBuildJobProgress: mocked.memoryJobControl.getMemoryBuildJobProgress,
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
  mocked.narrativeMemoryQueryService.getReviewBacklog.mockReset();
  mocked.narrativeMemoryQueryService.getConflictQueue.mockReset();
  mocked.narrativeMemoryQueryService.listSuggestedEpisodes.mockReset();
  mocked.narrativeMemoryQueryService.rejectEpisode.mockReset();
  mocked.narrativeMemoryQueryService.listSuggestedFacts.mockReset();
  mocked.narrativeMemoryQueryService.confirmFact.mockReset();
  mocked.narrativeMemoryQueryService.rejectFact.mockReset();
  mocked.narrativeMemoryQueryService.resolveFactConflict.mockReset();
  mocked.narrativeMemoryQueryService.listSuggestedEntityAliases.mockReset();
  mocked.narrativeMemoryQueryService.listSuggestedEntities.mockReset();
  mocked.narrativeMemoryQueryService.confirmEntity.mockReset();
  mocked.narrativeMemoryQueryService.rejectEntity.mockReset();
  mocked.narrativeMemoryQueryService.confirmEntityAlias.mockReset();
  mocked.narrativeMemoryQueryService.rejectEntityAlias.mockReset();
  mocked.narrativeMemoryQueryService.splitEntityAlias.mockReset();
  mocked.narrativeMemoryQueryService.mergeEntity.mockReset();
  mocked.narrativeMemoryQueryService.reviewStaleEvidence.mockReset();
  mocked.narrativeMemoryQueryService.repairEvidenceLinks.mockReset();
  mocked.narrativeMemoryQueryService.runEvalSuite.mockReset();
  mocked.narrativeMemoryQueryService.runIntentCalibration.mockReset();
  mocked.narrativeMemoryQueryService.runEpisodeCalibration.mockReset();
  mocked.narrativeSummaryStatusService.getStatus.mockReset();
  mocked.packagePersistence.persistPackageAfterMutation.mockReset();
  mocked.memoryJobControl.pauseMemoryBuildJobs.mockReset();
  mocked.memoryJobControl.resumeMemoryBuildJobs.mockReset();
  mocked.memoryJobControl.cancelMemoryBuildJobs.mockReset();
  mocked.memoryJobControl.getMemoryBuildJobProgress.mockReset();
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
    getReviewBacklog?: unknown;
    getConflictQueue: unknown;
    listSuggestedEpisodes?: unknown;
    rejectEpisode?: unknown;
    listSuggestedFacts?: unknown;
    confirmFact?: unknown;
    rejectFact?: unknown;
    resolveFactConflict?: unknown;
    listSuggestedEntityAliases?: unknown;
    listSuggestedEntities?: unknown;
    confirmEntity?: unknown;
    rejectEntity?: unknown;
    confirmEntityAlias?: unknown;
    rejectEntityAlias?: unknown;
    splitEntityAlias?: unknown;
    mergeEntity?: unknown;
    reviewStaleEvidence?: unknown;
    repairEvidenceLinks?: unknown;
    runEvalSuite?: unknown;
    runIntentCalibration?: unknown;
    runEpisodeCalibration?: unknown;
  },
  packagePersistence = mocked.packagePersistence,
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
    mocked.narrativeSummaryStatusService,
    packagePersistence,
  );
};

export const registerWindowInputHandlers = async () => {
  const { registerWindowIPCHandlers } =
    await import("../../../src/main/handler/system/window/index.js");
  registerWindowIPCHandlers(mocked.logger);
};

export const registerSyncInputHandlers = async () => {
  const { registerSyncIPCHandlers } =
    await import("../../../src/main/handler/system/sync/index.js");
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
