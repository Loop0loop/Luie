import type { IPCResponse } from "@shared/ipc/index.js";
import type * as SharedTypes from "@shared/types/index.js";

export type CoreRendererApi = {
  project: {
    create: (input: {
      title: string;
      description?: string;
      projectPath?: string;
    }) => Promise<IPCResponse<SharedTypes.Project>>;
    openLuie: (packagePath: string) => Promise<IPCResponse<SharedTypes.ProjectOpenResult>>;
    get: (id: string) => Promise<IPCResponse<SharedTypes.Project>>;
    getAll: () => Promise<IPCResponse<SharedTypes.Project[]>>;
    update: (input: {
      id: string;
      title?: string;
      description?: string;
      projectPath?: string;
    }) => Promise<IPCResponse<SharedTypes.Project>>;
    delete: (
      input: string | { id: string; deleteFile?: boolean },
    ) => Promise<IPCResponse<unknown>>;
    removeLocal: (id: string) => Promise<IPCResponse<unknown>>;
    markOpened: (
      id: string,
    ) => Promise<IPCResponse<{ projectId: string; lastOpenedAt: string }>>;
    attachLuie: (
      projectId: string,
      packagePath: string,
    ) => Promise<IPCResponse<SharedTypes.Project>>;
    materializeLuie: (
      projectId: string,
      targetPath: string,
    ) => Promise<IPCResponse<SharedTypes.Project>>;
  };
  chapter: {
    create: (input: {
      projectId: string;
      title: string;
      synopsis?: string;
      clientMutationId?: string;
    }) => Promise<IPCResponse<SharedTypes.Chapter>>;
    get: (id: string) => Promise<IPCResponse<SharedTypes.Chapter>>;
    getAll: (projectId: string) => Promise<IPCResponse<SharedTypes.Chapter[]>>;
    getDeleted: (projectId: string) => Promise<IPCResponse<SharedTypes.Chapter[]>>;
    update: (input: {
      id: string;
      title?: string;
      content?: string;
      synopsis?: string;
    }) => Promise<IPCResponse<SharedTypes.ChapterSaveResult>>;
    delete: (id: string) => Promise<IPCResponse<unknown>>;
    restore: (id: string) => Promise<IPCResponse<SharedTypes.Chapter>>;
    purge: (id: string) => Promise<IPCResponse<unknown>>;
    reorder: (
      projectId: string,
      chapterIds: string[],
    ) => Promise<IPCResponse<unknown>>;
  };
  scene: {
    create: (input: SharedTypes.SceneCreateInput) => Promise<IPCResponse<SharedTypes.Scene>>;
    get: (id: string) => Promise<IPCResponse<SharedTypes.Scene>>;
    getAll: (projectId: string) => Promise<IPCResponse<SharedTypes.Scene[]>>;
    update: (input: SharedTypes.SceneUpdateInput) => Promise<IPCResponse<SharedTypes.Scene>>;
    delete: (id: string) => Promise<IPCResponse<unknown>>;
  };
  note: {
    create: (input: SharedTypes.NoteCreateInput) => Promise<IPCResponse<SharedTypes.Note>>;
    get: (id: string) => Promise<IPCResponse<SharedTypes.Note>>;
    getAll: (projectId: string) => Promise<IPCResponse<SharedTypes.Note[]>>;
    update: (input: SharedTypes.NoteUpdateInput) => Promise<IPCResponse<SharedTypes.Note>>;
    delete: (id: string) => Promise<IPCResponse<unknown>>;
  };
  synopsis: {
    create: (input: SharedTypes.SynopsisCreateInput) => Promise<IPCResponse<SharedTypes.Synopsis>>;
    get: (id: string) => Promise<IPCResponse<SharedTypes.Synopsis>>;
    getAll: (projectId: string) => Promise<IPCResponse<SharedTypes.Synopsis[]>>;
    update: (input: SharedTypes.SynopsisUpdateInput) => Promise<IPCResponse<SharedTypes.Synopsis>>;
    delete: (id: string) => Promise<IPCResponse<unknown>>;
  };
  plot: {
    create: (input: SharedTypes.PlotCreateInput) => Promise<IPCResponse<SharedTypes.Plot>>;
    get: (id: string) => Promise<IPCResponse<SharedTypes.Plot>>;
    getAll: (projectId: string) => Promise<IPCResponse<SharedTypes.Plot[]>>;
    update: (input: SharedTypes.PlotUpdateInput) => Promise<IPCResponse<SharedTypes.Plot>>;
    delete: (id: string) => Promise<IPCResponse<unknown>>;
  };
  scrapMemo: {
    create: (input: SharedTypes.ScrapMemoCreateInput) => Promise<IPCResponse<SharedTypes.ScrapMemo>>;
    getAll: (projectId: string) => Promise<IPCResponse<SharedTypes.ScrapMemo[]>>;
    update: (input: SharedTypes.ScrapMemoUpdateInput) => Promise<IPCResponse<SharedTypes.ScrapMemo>>;
    delete: (id: string) => Promise<IPCResponse<unknown>>;
  };
};
