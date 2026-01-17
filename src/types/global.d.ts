import type { IPCResponse } from "../shared/ipc/index.js";

declare global {
  interface Window {
    api: {
      project: {
        create: (input: unknown) => Promise<IPCResponse>;
        get: (id: string) => Promise<IPCResponse>;
        getAll: () => Promise<IPCResponse>;
        update: (input: unknown) => Promise<IPCResponse>;
        delete: (id: string) => Promise<IPCResponse>;
      };
      chapter: {
        create: (input: unknown) => Promise<IPCResponse>;
        get: (id: string) => Promise<IPCResponse>;
        getAll: (projectId: string) => Promise<IPCResponse>;
        update: (input: unknown) => Promise<IPCResponse>;
        delete: (id: string) => Promise<IPCResponse>;
        reorder: (
          projectId: string,
          chapterIds: string[],
        ) => Promise<IPCResponse>;
      };
      character: {
        create: (input: unknown) => Promise<IPCResponse>;
        get: (id: string) => Promise<IPCResponse>;
        getAll: (projectId: string) => Promise<IPCResponse>;
        update: (input: unknown) => Promise<IPCResponse>;
        delete: (id: string) => Promise<IPCResponse>;
      };
      term: {
        create: (input: unknown) => Promise<IPCResponse>;
        get: (id: string) => Promise<IPCResponse>;
        getAll: (projectId: string) => Promise<IPCResponse>;
        update: (input: unknown) => Promise<IPCResponse>;
        delete: (id: string) => Promise<IPCResponse>;
      };
      snapshot: {
        create: (input: unknown) => Promise<IPCResponse>;
        getAll: (projectId: string) => Promise<IPCResponse>;
        restore: (id: string) => Promise<IPCResponse>;
        delete: (id: string) => Promise<IPCResponse>;
      };
      search: (query: unknown) => Promise<IPCResponse>;
      autoSave: (
        chapterId: string,
        content: string,
        projectId: string,
      ) => Promise<IPCResponse>;
    };
  }
}

export {};
