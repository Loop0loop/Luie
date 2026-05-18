import { IPC_CHANNELS } from "../../shared/ipc/channels.js";
import type { RendererApi } from "../../shared/api/index.js";
import type { PreloadApiModuleContext } from "./types.js";

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
      const random = (seed + Math.random() * 16) % 16 | 0;
      seed = Math.floor(seed / 16);
      const value = char === "x" ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  };

  return {
    project: {
      create: (input) => safeInvoke(IPC_CHANNELS.PROJECT_CREATE, input),
      get: (id) => safeInvokeCore("project.get", IPC_CHANNELS.PROJECT_GET, id),
      getAll: () => safeInvokeCore("project.getAll", IPC_CHANNELS.PROJECT_GET_ALL),
      update: (input) => safeInvoke(IPC_CHANNELS.PROJECT_UPDATE, input),
      delete: (input) => safeInvoke(IPC_CHANNELS.PROJECT_DELETE, input),
      removeLocal: (id) => safeInvoke(IPC_CHANNELS.PROJECT_REMOVE_LOCAL, id),
      openLuie: (packagePath) =>
        safeInvokeCore("project.openLuie", IPC_CHANNELS.PROJECT_OPEN_LUIE, packagePath),
      markOpened: (id) =>
        safeInvokeCore("project.markOpened", IPC_CHANNELS.PROJECT_MARK_OPENED, id),
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
        safeInvokeCore("chapter.getAll", IPC_CHANNELS.CHAPTER_GET_ALL, projectId),
      getDeleted: (projectId) => safeInvoke(IPC_CHANNELS.CHAPTER_GET_DELETED, projectId),
      update: (input) =>
        safeInvokeCore("chapter.update", IPC_CHANNELS.CHAPTER_UPDATE, input),
      delete: (id) => safeInvoke(IPC_CHANNELS.CHAPTER_DELETE, id),
      restore: (id) => safeInvoke(IPC_CHANNELS.CHAPTER_RESTORE, id),
      purge: (id) => safeInvoke(IPC_CHANNELS.CHAPTER_PURGE, id),
      reorder: (projectId, chapterIds) =>
        safeInvoke(IPC_CHANNELS.CHAPTER_REORDER, projectId, chapterIds),
    },
    scene: {
      create: (input) => safeInvoke(IPC_CHANNELS.SCENE_CREATE, input),
      get: (id) => safeInvoke(IPC_CHANNELS.SCENE_GET, id),
      getAll: (projectId) => safeInvoke(IPC_CHANNELS.SCENE_GET_ALL, projectId),
      update: (input) => safeInvoke(IPC_CHANNELS.SCENE_UPDATE, input),
      delete: (id) => safeInvoke(IPC_CHANNELS.SCENE_DELETE, id),
    },
    note: {
      create: (input) => safeInvoke(IPC_CHANNELS.NOTE_CREATE, input),
      get: (id) => safeInvoke(IPC_CHANNELS.NOTE_GET, id),
      getAll: (projectId) => safeInvoke(IPC_CHANNELS.NOTE_GET_ALL, projectId),
      update: (input) => safeInvoke(IPC_CHANNELS.NOTE_UPDATE, input),
      delete: (id) => safeInvoke(IPC_CHANNELS.NOTE_DELETE, id),
    },
    synopsis: {
      create: (input) => safeInvoke(IPC_CHANNELS.SYNOPSIS_CREATE, input),
      get: (id) => safeInvoke(IPC_CHANNELS.SYNOPSIS_GET, id),
      getAll: (projectId) => safeInvoke(IPC_CHANNELS.SYNOPSIS_GET_ALL, projectId),
      update: (input) => safeInvoke(IPC_CHANNELS.SYNOPSIS_UPDATE, input),
      delete: (id) => safeInvoke(IPC_CHANNELS.SYNOPSIS_DELETE, id),
    },
    plot: {
      create: (input) => safeInvoke(IPC_CHANNELS.PLOT_CREATE, input),
      get: (id) => safeInvoke(IPC_CHANNELS.PLOT_GET, id),
      getAll: (projectId) => safeInvoke(IPC_CHANNELS.PLOT_GET_ALL, projectId),
      update: (input) => safeInvoke(IPC_CHANNELS.PLOT_UPDATE, input),
      delete: (id) => safeInvoke(IPC_CHANNELS.PLOT_DELETE, id),
    },
    scrapMemo: {
      create: (input) => safeInvoke(IPC_CHANNELS.SCRAP_MEMO_CREATE, input),
      getAll: (projectId) => safeInvoke(IPC_CHANNELS.SCRAP_MEMO_GET_ALL, projectId),
      update: (input) => safeInvoke(IPC_CHANNELS.SCRAP_MEMO_UPDATE, input),
      delete: (id) => safeInvoke(IPC_CHANNELS.SCRAP_MEMO_DELETE, id),
    },
    character: {
      create: (input) => safeInvoke(IPC_CHANNELS.CHARACTER_CREATE, input),
      get: (id) => safeInvoke(IPC_CHANNELS.CHARACTER_GET, id),
      getAll: (projectId) => safeInvoke(IPC_CHANNELS.CHARACTER_GET_ALL, projectId),
      update: (input) => safeInvoke(IPC_CHANNELS.CHARACTER_UPDATE, input),
      delete: (id) => safeInvoke(IPC_CHANNELS.CHARACTER_DELETE, id),
      generateImage: (input) => safeInvoke(IPC_CHANNELS.CHARACTER_GENERATE_IMAGE, input),
      generateQuote: (input) => safeInvoke(IPC_CHANNELS.CHARACTER_GENERATE_QUOTE, input),
      generateStats: (input) => safeInvoke(IPC_CHANNELS.CHARACTER_GENERATE_STATS, input),
    },
    event: {
      create: (input) => safeInvoke(IPC_CHANNELS.EVENT_CREATE, input),
      get: (id) => safeInvoke(IPC_CHANNELS.EVENT_GET, id),
      getAll: (projectId) => safeInvoke(IPC_CHANNELS.EVENT_GET_ALL, projectId),
      update: (input) => safeInvoke(IPC_CHANNELS.EVENT_UPDATE, input),
      delete: (id) => safeInvoke(IPC_CHANNELS.EVENT_DELETE, id),
    },
    faction: {
      create: (input) => safeInvoke(IPC_CHANNELS.FACTION_CREATE, input),
      get: (id) => safeInvoke(IPC_CHANNELS.FACTION_GET, id),
      getAll: (projectId) => safeInvoke(IPC_CHANNELS.FACTION_GET_ALL, projectId),
      update: (input) => safeInvoke(IPC_CHANNELS.FACTION_UPDATE, input),
      delete: (id) => safeInvoke(IPC_CHANNELS.FACTION_DELETE, id),
    },
    term: {
      create: (input) => safeInvoke(IPC_CHANNELS.TERM_CREATE, input),
      get: (id) => safeInvoke(IPC_CHANNELS.TERM_GET, id),
      getAll: (projectId) => safeInvoke(IPC_CHANNELS.TERM_GET_ALL, projectId),
      update: (input) => safeInvoke(IPC_CHANNELS.TERM_UPDATE, input),
      delete: (id) => safeInvoke(IPC_CHANNELS.TERM_DELETE, id),
    },
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
      getAll: (projectId) => safeInvoke(IPC_CHANNELS.SNAPSHOT_GET_ALL, projectId),
      getByChapter: (chapterId) => safeInvoke(IPC_CHANNELS.SNAPSHOT_GET_BY_CHAPTER, chapterId),
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
      create: (request) => safeInvoke(IPC_CHANNELS.EXPORT_CREATE, request),
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
      selectSnapshotBackup: () => safeInvoke(IPC_CHANNELS.FS_SELECT_SNAPSHOT_BACKUP),
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
    search: (query) => safeInvoke(IPC_CHANNELS.SEARCH, query),
    searchAdmin: {
      getIndexStatus: (projectId) =>
        safeInvoke(IPC_CHANNELS.SEARCH_INDEX_STATUS, projectId),
      rebuildIndex: (projectId) =>
        safeInvoke(IPC_CHANNELS.SEARCH_REBUILD_INDEX, projectId),
    },
    memoryAdmin: {
      rebuildChunks: (input) =>
        safeInvoke(IPC_CHANNELS.MEMORY_REBUILD_CHUNKS, input),
      getJobStatus: (projectId) =>
        safeInvoke(IPC_CHANNELS.MEMORY_JOB_STATUS, projectId),
      getSummaryStatus: (projectId) =>
        safeInvoke(IPC_CHANNELS.MEMORY_GET_SUMMARY_STATUS, { projectId }),
      getEmbeddingStatus: (projectId) =>
        safeInvoke(IPC_CHANNELS.MEMORY_GET_EMBEDDING_STATUS, { projectId }),
    },
    memory: {
      searchChunks: (input) =>
        safeInvoke(IPC_CHANNELS.MEMORY_SEARCH_CHUNKS, input),
      getChunkBacklink: (chunkId) =>
        safeInvoke(IPC_CHANNELS.MEMORY_GET_CHUNK_BACKLINK, chunkId),
      getChapterSummary: (chapterId) =>
        safeInvoke(IPC_CHANNELS.MEMORY_GET_CHAPTER_SUMMARY, chapterId),
    },
    maintenance: {
      runIntegrityCheck: () =>
        safeInvoke(IPC_CHANNELS.DB_RUN_INTEGRITY_CHECK),
      getMigrationHealth: () =>
        safeInvoke(IPC_CHANNELS.DB_GET_MIGRATION_HEALTH),
    },
    rag: {
      ask: (input) => safeInvoke(IPC_CHANNELS.RAG_QA_ASK, input),
      stop: (runId) => safeInvoke(IPC_CHANNELS.RAG_QA_STOP, { runId }),
      onStream: (callback) => {
        const listener = (_event: unknown, payload: unknown) => {
          callback(payload as never);
        };
        ipcRenderer.on(IPC_CHANNELS.RAG_QA_STREAM, listener);
        return () => {
          ipcRenderer.removeListener(IPC_CHANNELS.RAG_QA_STREAM, listener);
        };
      },
      onError: (callback) => {
        const listener = (_event: unknown, payload: unknown) => {
          callback(payload as never);
        };
        ipcRenderer.on(IPC_CHANNELS.RAG_QA_ERROR, listener);
        return () => {
          ipcRenderer.removeListener(IPC_CHANNELS.RAG_QA_ERROR, listener);
        };
      },
    },
    autoSave: autoSave.autoSave,
  };
}
