import { IPC_CHANNELS } from "../../shared/ipc/channels.js";
import type { RendererApi } from "../../shared/api/index.js";
import type { PreloadApiModuleContext } from "./types.js";

type BasicCrudApi = {
  create: (input: unknown) => ReturnType<PreloadApiModuleContext["safeInvoke"]>;
  get: (id: string) => ReturnType<PreloadApiModuleContext["safeInvoke"]>;
  getAll: (projectId: string) => ReturnType<PreloadApiModuleContext["safeInvoke"]>;
  update: (input: unknown) => ReturnType<PreloadApiModuleContext["safeInvoke"]>;
  delete: (id: string) => ReturnType<PreloadApiModuleContext["safeInvoke"]>;
};

export function createProjectApi({
  autoSave,
  ipcRenderer,
  safeInvoke,
  safeInvokeCore,
}: PreloadApiModuleContext): Pick<
  RendererApi,
  | "project"
  | "chapter"
  | "scene"
  | "note"
  | "synopsis"
  | "plot"
  | "scrapMemo"
  | "character"
  | "event"
  | "faction"
  | "term"
  | "snapshot"
  | "export"
  | "fs"
  | "search"
  | "searchAdmin"
  | "memoryAdmin"
  | "memory"
  | "maintenance"
  | "rag"
  | "autoSave"
> {
  const createClientMutationId = (): string => {
    if (
      typeof globalThis.crypto !== "undefined" &&
      typeof globalThis.crypto.randomUUID === "function"
    ) {
      return globalThis.crypto.randomUUID();
    }
    const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
    let seed = Date.now();
    return template.replace(/[xy]/g, (char) => {
      const random = ((seed + Math.random() * 16) % 16) | 0;
      seed = Math.floor(seed / 16);
      const value = char === "x" ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  };
  const invoke = (channel: string) =>
    (...args: unknown[]) => safeInvoke(channel, ...args);
  const invokeOne = (channel: string) =>
    (input: unknown) => safeInvoke(channel, input);
  const invokeProjectPayload = (channel: string) =>
    (projectId: string) => safeInvoke(channel, { projectId });
  const onRunScopedChannel = (
    channel: string,
    callback: (payload: never) => void,
    runId?: string,
    requireRunId = true,
  ) => {
    const listener = (_event: unknown, payload: unknown) => {
      const typed = payload as { runId?: string };
      if (runId && (requireRunId || typed.runId) && typed.runId !== runId) {
        return;
      }
      callback(payload as never);
    };
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  };
  const createCrudApi = (
    channels: {
      create: string;
      get: string;
      getAll: string;
      update: string;
      delete: string;
    },
  ): BasicCrudApi => ({
    create: (input) => safeInvoke(channels.create, input),
    get: (id) => safeInvoke(channels.get, id),
    getAll: (projectId) => safeInvoke(channels.getAll, projectId),
    update: (input) => safeInvoke(channels.update, input),
    delete: (id) => safeInvoke(channels.delete, id),
  });

  return {
    project: {
      create: (input) => safeInvoke(IPC_CHANNELS.PROJECT_CREATE, input),
      get: (id) => safeInvokeCore("project.get", IPC_CHANNELS.PROJECT_GET, id),
      getAll: () =>
        safeInvokeCore("project.getAll", IPC_CHANNELS.PROJECT_GET_ALL),
      update: (input) => safeInvoke(IPC_CHANNELS.PROJECT_UPDATE, input),
      delete: (input) => safeInvoke(IPC_CHANNELS.PROJECT_DELETE, input),
      removeLocal: (id) => safeInvoke(IPC_CHANNELS.PROJECT_REMOVE_LOCAL, id),
      openLuie: (packagePath) =>
        safeInvokeCore(
          "project.openLuie",
          IPC_CHANNELS.PROJECT_OPEN_LUIE,
          packagePath,
        ),
      markOpened: (id) =>
        safeInvokeCore(
          "project.markOpened",
          IPC_CHANNELS.PROJECT_MARK_OPENED,
          id,
        ),
      attachLuie: (projectId, packagePath) =>
        safeInvokeCore(
          "project.attachLuie",
          IPC_CHANNELS.PROJECT_ATTACH_LUIE,
          projectId,
          packagePath,
        ),
      materializeLuie: (projectId, targetPath) =>
        safeInvokeCore(
          "project.materializeLuie",
          IPC_CHANNELS.PROJECT_MATERIALIZE_LUIE,
          projectId,
          targetPath,
        ),
    },
    chapter: {
      create: (input) =>
        safeInvoke(IPC_CHANNELS.CHAPTER_CREATE, {
          ...input,
          clientMutationId:
            typeof input.clientMutationId === "string" &&
            input.clientMutationId.length > 0
              ? input.clientMutationId
              : createClientMutationId(),
        }),
      get: (id) => safeInvokeCore("chapter.get", IPC_CHANNELS.CHAPTER_GET, id),
      getAll: (projectId) =>
        safeInvokeCore(
          "chapter.getAll",
          IPC_CHANNELS.CHAPTER_GET_ALL,
          projectId,
        ),
      getDeleted: (projectId) =>
        safeInvoke(IPC_CHANNELS.CHAPTER_GET_DELETED, projectId),
      update: (input) =>
        safeInvokeCore("chapter.update", IPC_CHANNELS.CHAPTER_UPDATE, input),
      delete: (id) => safeInvoke(IPC_CHANNELS.CHAPTER_DELETE, id),
      restore: (id) => safeInvoke(IPC_CHANNELS.CHAPTER_RESTORE, id),
      purge: (id) => safeInvoke(IPC_CHANNELS.CHAPTER_PURGE, id),
      reorder: (projectId, chapterIds) =>
        safeInvoke(IPC_CHANNELS.CHAPTER_REORDER, projectId, chapterIds),
    },
    scene: createCrudApi({
      create: IPC_CHANNELS.SCENE_CREATE,
      get: IPC_CHANNELS.SCENE_GET,
      getAll: IPC_CHANNELS.SCENE_GET_ALL,
      update: IPC_CHANNELS.SCENE_UPDATE,
      delete: IPC_CHANNELS.SCENE_DELETE,
    }) as RendererApi["scene"],
    note: createCrudApi({
      create: IPC_CHANNELS.NOTE_CREATE,
      get: IPC_CHANNELS.NOTE_GET,
      getAll: IPC_CHANNELS.NOTE_GET_ALL,
      update: IPC_CHANNELS.NOTE_UPDATE,
      delete: IPC_CHANNELS.NOTE_DELETE,
    }) as RendererApi["note"],
    synopsis: createCrudApi({
      create: IPC_CHANNELS.SYNOPSIS_CREATE,
      get: IPC_CHANNELS.SYNOPSIS_GET,
      getAll: IPC_CHANNELS.SYNOPSIS_GET_ALL,
      update: IPC_CHANNELS.SYNOPSIS_UPDATE,
      delete: IPC_CHANNELS.SYNOPSIS_DELETE,
    }) as RendererApi["synopsis"],
    plot: createCrudApi({
      create: IPC_CHANNELS.PLOT_CREATE,
      get: IPC_CHANNELS.PLOT_GET,
      getAll: IPC_CHANNELS.PLOT_GET_ALL,
      update: IPC_CHANNELS.PLOT_UPDATE,
      delete: IPC_CHANNELS.PLOT_DELETE,
    }) as RendererApi["plot"],
    scrapMemo: {
      create: invokeOne(IPC_CHANNELS.SCRAP_MEMO_CREATE),
      getAll: invokeOne(IPC_CHANNELS.SCRAP_MEMO_GET_ALL),
      update: invokeOne(IPC_CHANNELS.SCRAP_MEMO_UPDATE),
      delete: invokeOne(IPC_CHANNELS.SCRAP_MEMO_DELETE),
    },
    character: {
      ...createCrudApi({
        create: IPC_CHANNELS.CHARACTER_CREATE,
        get: IPC_CHANNELS.CHARACTER_GET,
        getAll: IPC_CHANNELS.CHARACTER_GET_ALL,
        update: IPC_CHANNELS.CHARACTER_UPDATE,
        delete: IPC_CHANNELS.CHARACTER_DELETE,
      }),
      generateImage: invokeOne(IPC_CHANNELS.CHARACTER_GENERATE_IMAGE),
      generateQuote: invokeOne(IPC_CHANNELS.CHARACTER_GENERATE_QUOTE),
      generateStats: invokeOne(IPC_CHANNELS.CHARACTER_GENERATE_STATS),
    } as RendererApi["character"],
    event: createCrudApi({
      create: IPC_CHANNELS.EVENT_CREATE,
      get: IPC_CHANNELS.EVENT_GET,
      getAll: IPC_CHANNELS.EVENT_GET_ALL,
      update: IPC_CHANNELS.EVENT_UPDATE,
      delete: IPC_CHANNELS.EVENT_DELETE,
    }) as RendererApi["event"],
    faction: createCrudApi({
      create: IPC_CHANNELS.FACTION_CREATE,
      get: IPC_CHANNELS.FACTION_GET,
      getAll: IPC_CHANNELS.FACTION_GET_ALL,
      update: IPC_CHANNELS.FACTION_UPDATE,
      delete: IPC_CHANNELS.FACTION_DELETE,
    }) as RendererApi["faction"],
    term: createCrudApi({
      create: IPC_CHANNELS.TERM_CREATE,
      get: IPC_CHANNELS.TERM_GET,
      getAll: IPC_CHANNELS.TERM_GET_ALL,
      update: IPC_CHANNELS.TERM_UPDATE,
      delete: IPC_CHANNELS.TERM_DELETE,
    }) as RendererApi["term"],
    snapshot: {
      create: (input) => safeInvoke(IPC_CHANNELS.SNAPSHOT_CREATE, input),
      getByProject: (projectId) =>
        safeInvokeCore(
          "snapshot.getByProject",
          IPC_CHANNELS.SNAPSHOT_GET_BY_PROJECT,
          projectId,
        ),
      listRestoreCandidates: () =>
        safeInvokeCore(
          "snapshot.listRestoreCandidates",
          IPC_CHANNELS.SNAPSHOT_LIST_RESTORE_CANDIDATES,
        ),
      getAll: (projectId) =>
        safeInvoke(IPC_CHANNELS.SNAPSHOT_GET_ALL, projectId),
      getByChapter: (chapterId) =>
        safeInvoke(IPC_CHANNELS.SNAPSHOT_GET_BY_CHAPTER, chapterId),
      importFromFile: (filePath) =>
        safeInvokeCore(
          "snapshot.importFromFile",
          IPC_CHANNELS.SNAPSHOT_IMPORT_FILE,
          filePath,
        ),
      restore: (id) =>
        safeInvokeCore("snapshot.restore", IPC_CHANNELS.SNAPSHOT_RESTORE, id),
      delete: (id) => safeInvoke(IPC_CHANNELS.SNAPSHOT_DELETE, id),
    },
    export: {
      create: invokeOne(IPC_CHANNELS.EXPORT_CREATE),
    },
    fs: {
      saveProject: (projectName, projectPath, content) =>
        safeInvoke(
          IPC_CHANNELS.FS_SAVE_PROJECT,
          projectName,
          projectPath,
          content,
        ),
      selectDirectory: () => safeInvoke(IPC_CHANNELS.FS_SELECT_DIRECTORY),
      selectFile: (options) =>
        safeInvokeCore("fs.selectFile", IPC_CHANNELS.FS_SELECT_FILE, options),
      selectSnapshotBackup: () =>
        safeInvoke(IPC_CHANNELS.FS_SELECT_SNAPSHOT_BACKUP),
      selectSaveLocation: (options) =>
        safeInvokeCore(
          "fs.selectSaveLocation",
          IPC_CHANNELS.FS_SELECT_SAVE_LOCATION,
          options,
        ),
      readFile: (filePath) => safeInvoke(IPC_CHANNELS.FS_READ_FILE, filePath),
      readLuieEntry: (packagePath, entryPath) =>
        safeInvokeCore(
          "fs.readLuieEntry",
          IPC_CHANNELS.FS_READ_LUIE_ENTRY,
          packagePath,
          entryPath,
        ),
      writeFile: (filePath, content) =>
        safeInvoke(IPC_CHANNELS.FS_WRITE_FILE, filePath, content),
      createLuiePackage: (packagePath, meta) =>
        safeInvoke(IPC_CHANNELS.FS_CREATE_LUIE_PACKAGE, packagePath, meta),
      writeProjectFile: (projectRoot, relativePath, content) =>
        safeInvoke(
          IPC_CHANNELS.FS_WRITE_PROJECT_FILE,
          projectRoot,
          relativePath,
          content,
        ),
      approveProjectPath: (projectPath) =>
        safeInvoke(IPC_CHANNELS.FS_APPROVE_PROJECT_PATH, projectPath),
    },
    search: invokeOne(IPC_CHANNELS.SEARCH),
    searchAdmin: {
      getIndexStatus: invokeOne(IPC_CHANNELS.SEARCH_INDEX_STATUS),
      rebuildIndex: invokeOne(IPC_CHANNELS.SEARCH_REBUILD_INDEX),
    },
    memoryAdmin: {
      rebuildChunks: invokeOne(IPC_CHANNELS.MEMORY_REBUILD_CHUNKS),
      getJobStatus: invokeOne(IPC_CHANNELS.MEMORY_JOB_STATUS),
      getSummaryStatus: invokeProjectPayload(IPC_CHANNELS.MEMORY_GET_SUMMARY_STATUS),
      getEmbeddingStatus: invokeProjectPayload(IPC_CHANNELS.MEMORY_GET_EMBEDDING_STATUS),
      pauseBuildJobs: invokeProjectPayload(IPC_CHANNELS.MEMORY_PAUSE_BUILD_JOBS),
      resumeBuildJobs: invokeProjectPayload(IPC_CHANNELS.MEMORY_RESUME_BUILD_JOBS),
      cancelBuildJobs: invokeProjectPayload(IPC_CHANNELS.MEMORY_CANCEL_BUILD_JOBS),
      getBuildJobProgress: invokeProjectPayload(IPC_CHANNELS.MEMORY_GET_BUILD_JOB_PROGRESS),
      runEvalSuite: invokeOne(IPC_CHANNELS.MEMORY_RUN_EVAL_SUITE),
      recordEvalFeedback: invokeOne(IPC_CHANNELS.MEMORY_RECORD_EVAL_FEEDBACK),
      runIntentCalibration: invokeOne(IPC_CHANNELS.MEMORY_RUN_INTENT_CALIBRATION),
      runEpisodeCalibration: invokeOne(IPC_CHANNELS.MEMORY_RUN_EPISODE_CALIBRATION),
    },
    memory: {
      queryNarrative: invokeOne(IPC_CHANNELS.MEMORY_QUERY_NARRATIVE),
      getReviewBacklog: invokeOne(IPC_CHANNELS.MEMORY_REVIEW_BACKLOG),
      getConflictQueue: invokeOne(IPC_CHANNELS.MEMORY_GET_CONFLICT_QUEUE),
      getEpisodeReviewQueue: invokeOne(IPC_CHANNELS.MEMORY_EPISODE_REVIEW_QUEUE),
      confirmEpisode: invokeOne(IPC_CHANNELS.MEMORY_EPISODE_CONFIRM),
      rejectEpisode: invokeOne(IPC_CHANNELS.MEMORY_EPISODE_REJECT),
      getFactReviewQueue: invokeOne(IPC_CHANNELS.MEMORY_FACT_REVIEW_QUEUE),
      confirmFact: invokeOne(IPC_CHANNELS.MEMORY_FACT_CONFIRM),
      rejectFact: invokeOne(IPC_CHANNELS.MEMORY_FACT_REJECT),
      resolveFactConflict: invokeOne(IPC_CHANNELS.MEMORY_CONFLICT_RESOLVE),
      reviewFactConflict: invokeOne(IPC_CHANNELS.MEMORY_CONFLICT_REVIEW_ACTION),
      getEntityAliasReviewQueue: invokeOne(IPC_CHANNELS.MEMORY_ENTITY_ALIAS_REVIEW_QUEUE),
      getEntityReviewQueue: invokeOne(IPC_CHANNELS.MEMORY_ENTITY_REVIEW_QUEUE),
      confirmEntity: invokeOne(IPC_CHANNELS.MEMORY_ENTITY_CONFIRM),
      rejectEntity: invokeOne(IPC_CHANNELS.MEMORY_ENTITY_REJECT),
      confirmEntityAlias: invokeOne(IPC_CHANNELS.MEMORY_ENTITY_ALIAS_CONFIRM),
      rejectEntityAlias: invokeOne(IPC_CHANNELS.MEMORY_ENTITY_ALIAS_REJECT),
      splitEntityAlias: invokeOne(IPC_CHANNELS.MEMORY_ENTITY_ALIAS_SPLIT),
      mergeEntity: invokeOne(IPC_CHANNELS.MEMORY_ENTITY_MERGE),
      reviewStaleEvidence: invokeOne(IPC_CHANNELS.MEMORY_STALE_EVIDENCE_REVIEW_ACTION),
      repairEvidenceLinks: invokeOne(IPC_CHANNELS.MEMORY_REPAIR_EVIDENCE_LINKS),
      searchChunks: invokeOne(IPC_CHANNELS.MEMORY_SEARCH_CHUNKS),
      getChunkBacklink: invokeOne(IPC_CHANNELS.MEMORY_GET_CHUNK_BACKLINK),
      getChunkWindow: invokeOne(IPC_CHANNELS.MEMORY_GET_CHUNK_WINDOW),
      getChapterSummary: invokeOne(IPC_CHANNELS.MEMORY_GET_CHAPTER_SUMMARY),
      getNarrativeSummaryStatus: (projectId) =>
        safeInvoke(IPC_CHANNELS.MEMORY_GET_NARRATIVE_SUMMARY_STATUS, {
          projectId,
        }),
    },
    maintenance: {
      runIntegrityCheck: invoke(IPC_CHANNELS.DB_RUN_INTEGRITY_CHECK),
      getMigrationHealth: invoke(IPC_CHANNELS.DB_GET_MIGRATION_HEALTH),
    },
    rag: {
      ask: (input) => safeInvoke(IPC_CHANNELS.RAG_QA_ASK, input),
      stop: (runId) => safeInvoke(IPC_CHANNELS.RAG_QA_STOP, { runId }),
      onStream: (callback, runId) =>
        onRunScopedChannel(IPC_CHANNELS.RAG_QA_STREAM, callback, runId),
      onError: (callback, runId) =>
        onRunScopedChannel(IPC_CHANNELS.RAG_QA_ERROR, callback, runId, false),
    },
    autoSave: autoSave.autoSave,
  };
}
