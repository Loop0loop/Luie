import type { IPCResponse } from "@shared/ipc/index.js";
import type * as SharedTypes from "@shared/types/index.js";

export type ResearchRendererApi = {
  character: {
    create: (input: {
      projectId: string;
      name: string;
      description?: string;
      firstAppearance?: string;
      attributes?: Record<string, unknown>;
    }) => Promise<IPCResponse<SharedTypes.Character>>;
    get: (id: string) => Promise<IPCResponse<SharedTypes.Character>>;
    getAll: (projectId: string) => Promise<IPCResponse<SharedTypes.Character[]>>;
    update: (input: {
      id: string;
      name?: string;
      description?: string;
      firstAppearance?: string;
      attributes?: Record<string, unknown>;
    }) => Promise<IPCResponse<SharedTypes.Character>>;
    delete: (id: string) => Promise<IPCResponse<unknown>>;
    generateImage: (input: {
      name: string;
      tagline?: string;
      roles?: string[];
      keywords?: string[];
      overview?: string;
      personality?: string;
      background?: string;
      appearance?: string;
      relations?: string;
      notes?: string;
    }) => Promise<IPCResponse<string>>;
    generateQuote: (input: {
      name: string;
      tagline?: string;
      roles?: string[];
      keywords?: string[];
      overview?: string;
      personality?: string;
      background?: string;
      appearance?: string;
      relations?: string;
      notes?: string;
    }) => Promise<IPCResponse<string>>;
    generateStats: (input: {
      name: string;
      tagline?: string;
      roles?: string[];
      keywords?: string[];
      overview?: string;
      personality?: string;
      background?: string;
      appearance?: string;
      relations?: string;
      notes?: string;
      axes: Array<{ label: string; value: number }>;
    }) => Promise<IPCResponse<Array<{ label: string; value: number }>>>;
  };
  term: {
    create: (input: {
      projectId: string;
      term: string;
      definition?: string;
      category?: string;
      firstAppearance?: string;
    }) => Promise<IPCResponse<SharedTypes.Term>>;
    get: (id: string) => Promise<IPCResponse<SharedTypes.Term>>;
    getAll: (projectId: string) => Promise<IPCResponse<SharedTypes.Term[]>>;
    update: (input: {
      id: string;
      term?: string;
      definition?: string;
      category?: string;
      firstAppearance?: string;
    }) => Promise<IPCResponse<SharedTypes.Term>>;
    delete: (id: string) => Promise<IPCResponse<unknown>>;
  };
  event: {
    create: (input: {
      projectId: string;
      name: string;
      description?: string;
      firstAppearance?: string;
      attributes?: Record<string, unknown>;
    }) => Promise<IPCResponse<SharedTypes.Event>>;
    get: (id: string) => Promise<IPCResponse<SharedTypes.Event>>;
    getAll: (projectId: string) => Promise<IPCResponse<SharedTypes.Event[]>>;
    update: (input: {
      id: string;
      name?: string;
      description?: string;
      firstAppearance?: string;
      attributes?: Record<string, unknown>;
    }) => Promise<IPCResponse<SharedTypes.Event>>;
    delete: (id: string) => Promise<IPCResponse<unknown>>;
  };
  faction: {
    create: (input: {
      projectId: string;
      name: string;
      description?: string;
      firstAppearance?: string;
      attributes?: Record<string, unknown>;
    }) => Promise<IPCResponse<SharedTypes.Faction>>;
    get: (id: string) => Promise<IPCResponse<SharedTypes.Faction>>;
    getAll: (projectId: string) => Promise<IPCResponse<SharedTypes.Faction[]>>;
    update: (input: {
      id: string;
      name?: string;
      description?: string;
      firstAppearance?: string;
      attributes?: Record<string, unknown>;
    }) => Promise<IPCResponse<SharedTypes.Faction>>;
    delete: (id: string) => Promise<IPCResponse<unknown>>;
  };
  snapshot: {
    create: (input: {
      projectId: string;
      chapterId?: string;
      content: string;
      description?: string;
      type?: "AUTO" | "MANUAL";
    }) => Promise<IPCResponse<SharedTypes.Snapshot>>;
    getByProject: (projectId: string) => Promise<IPCResponse<SharedTypes.Snapshot[]>>;
    getAll: (projectId: string) => Promise<IPCResponse<SharedTypes.Snapshot[]>>;
    getByChapter: (chapterId: string) => Promise<IPCResponse<SharedTypes.Snapshot[]>>;
    listRestoreCandidates: () => Promise<
      IPCResponse<SharedTypes.SnapshotRestoreCandidate[]>
    >;
    importFromFile: (filePath: string) => Promise<IPCResponse<SharedTypes.Project>>;
    restore: (id: string) => Promise<IPCResponse<unknown>>;
    delete: (id: string) => Promise<IPCResponse<unknown>>;
  };
};
