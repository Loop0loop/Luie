import { IPC_CHANNELS } from "../../shared/ipc/channels.js";
import type { RendererApi } from "../../shared/api/index.js";
import type { PreloadApiModuleContext } from "./types.js";

export function createProjectApi({
  autoSave,
  safeInvoke,
  safeInvokeCore,
}: PreloadApiModuleContext): Pick<
  RendererApi,
  | "project"
  | "chapter"
  | "character"
  | "event"
  | "faction"
  | "term"
  | "snapshot"
  | "export"
  | "fs"
  | "search"
  | "autoSave"
> {
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
      create: (input) => safeInvoke(IPC_CHANNELS.CHAPTER_CREATE, input),
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
    character: {
      create: (input) => safeInvoke(IPC_CHANNELS.CHARACTER_CREATE, input),
      get: (id) => safeInvoke(IPC_CHANNELS.CHARACTER_GET, id),
      getAll: (projectId) => safeInvoke(IPC_CHANNELS.CHARACTER_GET_ALL, projectId),
      update: (input) => safeInvoke(IPC_CHANNELS.CHARACTER_UPDATE, input),
      delete: (id) => safeInvoke(IPC_CHANNELS.CHARACTER_DELETE, id),
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
    autoSave: autoSave.autoSave,
  };
}
