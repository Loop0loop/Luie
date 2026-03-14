import type { IpcRenderer } from "electron";
import type { IPCResponse } from "../../shared/ipc/index.js";
import type { RendererApi } from "../../shared/api/index.js";

export type SafeInvoke = <T = never>(
  channel: string,
  ...args: unknown[]
) => Promise<IPCResponse<T>>;

type CoreMethodMap = {
  "window.openExport": RendererApi["window"]["openExport"];
  "project.openLuie": RendererApi["project"]["openLuie"];
  "project.get": RendererApi["project"]["get"];
  "project.getAll": RendererApi["project"]["getAll"];
  "project.markOpened": RendererApi["project"]["markOpened"];
  "project.attachLuie": RendererApi["project"]["attachLuie"];
  "project.materializeLuie": RendererApi["project"]["materializeLuie"];
  "chapter.get": RendererApi["chapter"]["get"];
  "chapter.getAll": RendererApi["chapter"]["getAll"];
  "chapter.update": RendererApi["chapter"]["update"];
  "snapshot.getByProject": RendererApi["snapshot"]["getByProject"];
  "snapshot.listRestoreCandidates": RendererApi["snapshot"]["listRestoreCandidates"];
  "snapshot.importFromFile": RendererApi["snapshot"]["importFromFile"];
  "snapshot.restore": RendererApi["snapshot"]["restore"];
  "sync.getStatus": RendererApi["sync"]["getStatus"];
  "sync.connectGoogle": RendererApi["sync"]["connectGoogle"];
  "sync.disconnect": RendererApi["sync"]["disconnect"];
  "sync.runNow": RendererApi["sync"]["runNow"];
  "sync.setAutoSync": RendererApi["sync"]["setAutoSync"];
  "sync.getRuntimeConfig": RendererApi["sync"]["getRuntimeConfig"];
  "sync.setRuntimeConfig": RendererApi["sync"]["setRuntimeConfig"];
  "sync.validateRuntimeConfig": RendererApi["sync"]["validateRuntimeConfig"];
  "sync.resolveConflict": RendererApi["sync"]["resolveConflict"];
  "startup.getReadiness": RendererApi["startup"]["getReadiness"];
  "startup.completeWizard": RendererApi["startup"]["completeWizard"];
  "app.getVersion": RendererApi["app"]["getVersion"];
  "app.checkUpdate": RendererApi["app"]["checkUpdate"];
  "app.getUpdateState": RendererApi["app"]["getUpdateState"];
  "app.downloadUpdate": RendererApi["app"]["downloadUpdate"];
  "app.applyUpdate": RendererApi["app"]["applyUpdate"];
  "app.rollbackUpdate": RendererApi["app"]["rollbackUpdate"];
  "app.getBootstrapStatus": RendererApi["app"]["getBootstrapStatus"];
  "settings.getAll": RendererApi["settings"]["getAll"];
  "settings.getEditor": RendererApi["settings"]["getEditor"];
  "settings.setEditor": RendererApi["settings"]["setEditor"];
  "settings.getLanguage": RendererApi["settings"]["getLanguage"];
  "settings.setLanguage": RendererApi["settings"]["setLanguage"];
  "settings.getMenuBarMode": RendererApi["settings"]["getMenuBarMode"];
  "settings.setMenuBarMode": RendererApi["settings"]["setMenuBarMode"];
  "settings.getShortcuts": RendererApi["settings"]["getShortcuts"];
  "settings.setShortcuts": RendererApi["settings"]["setShortcuts"];
  "settings.getWindowBounds": RendererApi["settings"]["getWindowBounds"];
  "settings.setWindowBounds": RendererApi["settings"]["setWindowBounds"];
  "recovery.getStatus": RendererApi["recovery"]["getStatus"];
  "recovery.runDb": RendererApi["recovery"]["runDb"];
  "fs.readLuieEntry": RendererApi["fs"]["readLuieEntry"];
  "fs.selectFile": RendererApi["fs"]["selectFile"];
  "fs.selectSaveLocation": RendererApi["fs"]["selectSaveLocation"];
};

export type CoreMethod = keyof CoreMethodMap;
export type CoreResponse<K extends CoreMethod> = Awaited<
  ReturnType<CoreMethodMap[K]>
>;

export type SafeInvokeCore = <K extends CoreMethod>(
  method: K,
  channel: string,
  ...args: Parameters<CoreMethodMap[K]>
) => Promise<CoreResponse<K>>;

export type AutoSaveController = {
  autoSave: RendererApi["autoSave"];
  flushAutoSaves: () => Promise<void>;
  getRendererDirty: () => boolean;
  setRendererDirty: (dirty: boolean) => void;
};

export type PreloadApiModuleContext = {
  autoSave: AutoSaveController;
  ipcRenderer: IpcRenderer;
  safeInvoke: SafeInvoke;
  safeInvokeCore: SafeInvokeCore;
  sanitizeForIpc: (value: unknown) => unknown;
  loggerApi: RendererApi["logger"];
};
