import type {
  Project,
  Chapter,
  Character,
  Term,
  Snapshot,
} from "@prisma/client";
import type { SearchResult } from "../shared/types/index.js";
import type { IPCResponse } from "../shared/ipc/index.js";

declare global {
  interface Window {
    api: {
      project: {
        create: (input: {
          title: string;
          description?: string;
          projectPath?: string;
        }) => Promise<IPCResponse<Project>>;
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
        update: (input: {
          id: string;
          title?: string;
          content?: string;
          synopsis?: string;
        }) => Promise<IPCResponse<Chapter>>;
        delete: (id: string) => Promise<IPCResponse<unknown>>;
        reorder: (
          projectId: string,
          chapterIds: string[],
        ) => Promise<IPCResponse<unknown>>;
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
        }) => Promise<IPCResponse<Snapshot>>;
        getAll: (projectId: string) => Promise<IPCResponse<Snapshot[]>>;
        restore: (id: string) => Promise<IPCResponse<unknown>>;
        delete: (id: string) => Promise<IPCResponse<unknown>>;
      };
      fs: {
        saveProject: (
          projectName: string,
          projectPath: string,
          content: string,
        ) => Promise<IPCResponse<unknown>>;
        selectDirectory: () => Promise<IPCResponse<string>>;
        selectSaveLocation: (options?: {
          filters?: { name: string; extensions: string[] }[];
          defaultPath?: string;
          title?: string;
        }) => Promise<IPCResponse<string>>;
        writeFile: (
          filePath: string,
          content: string,
        ) => Promise<IPCResponse<unknown>>;
      };
      search: (query: {
        projectId: string;
        query: string;
        type?: "all" | "character" | "term";
      }) => Promise<IPCResponse<SearchResult[]>>;
      autoSave: (
        chapterId: string,
        content: string,
        projectId: string,
      ) => Promise<IPCResponse<unknown>>;

      // Settings API
      settings: {
        getAll: () => Promise<IPCResponse<unknown>>;
        getEditor: () => Promise<IPCResponse<unknown>>;
        setEditor: (settings: unknown) => Promise<IPCResponse<unknown>>;
        getAutoSave: () => Promise<IPCResponse<unknown>>;
        setAutoSave: (settings: unknown) => Promise<IPCResponse<unknown>>;
        getWindowBounds: () => Promise<IPCResponse<unknown>>;
        setWindowBounds: (bounds: unknown) => Promise<IPCResponse<unknown>>;
        reset: () => Promise<IPCResponse<unknown>>;
      };

      window: {
        maximize: () => Promise<IPCResponse<unknown>>;
        toggleFullscreen: () => Promise<IPCResponse<unknown>>;
      };
    };
  }
}

export {};
