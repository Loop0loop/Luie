import type { IPCResponse } from "@shared/ipc/index.js";
import type * as SharedTypes from "@shared/types/index.js";

export type WorldRendererApi = {
  worldEntity: {
    create: (
      input: SharedTypes.WorldEntityCreateInput,
    ) => Promise<IPCResponse<SharedTypes.WorldEntity>>;
    get: (id: string) => Promise<IPCResponse<SharedTypes.WorldEntity>>;
    getAll: (projectId: string) => Promise<IPCResponse<SharedTypes.WorldEntity[]>>;
    update: (
      input: SharedTypes.WorldEntityUpdateInput,
    ) => Promise<IPCResponse<SharedTypes.WorldEntity>>;
    updatePosition: (
      input: SharedTypes.WorldEntityUpdatePositionInput,
    ) => Promise<IPCResponse<SharedTypes.WorldEntity>>;
    delete: (id: string) => Promise<IPCResponse<unknown>>;
  };
  entityRelation: {
    create: (
      input: SharedTypes.EntityRelationCreateInput,
    ) => Promise<IPCResponse<SharedTypes.EntityRelation>>;
    getAll: (projectId: string) => Promise<IPCResponse<SharedTypes.EntityRelation[]>>;
    update: (
      input: SharedTypes.EntityRelationUpdateInput,
    ) => Promise<IPCResponse<SharedTypes.EntityRelation>>;
    delete: (id: string) => Promise<IPCResponse<unknown>>;
  };
  worldGraph: {
    get: (projectId: string) => Promise<IPCResponse<SharedTypes.WorldGraphData>>;
    getMentions: (
      query: SharedTypes.WorldGraphMentionsQuery,
    ) => Promise<IPCResponse<SharedTypes.WorldGraphMention[]>>;
  };
  worldStorage: {
    getDocument: (input: {
      projectId: string;
      docType: SharedTypes.ReplicaWorldDocumentType;
    }) => Promise<IPCResponse<SharedTypes.WorldReplicaDocumentResult>>;
    setDocument: (input: {
      projectId: string;
      docType: SharedTypes.ReplicaWorldDocumentType;
      payload: unknown;
    }) => Promise<IPCResponse<unknown>>;
    getScrapMemos: (
      projectId: string,
    ) => Promise<IPCResponse<SharedTypes.WorldReplicaScrapMemosResult>>;
    setScrapMemos: (input: {
      projectId: string;
      data: SharedTypes.WorldScrapMemosData;
    }) => Promise<IPCResponse<unknown>>;
  };
  plugin: {
    listCatalog: () => Promise<IPCResponse<SharedTypes.GraphPluginCatalogItem[]>>;
    listInstalled: () => Promise<IPCResponse<SharedTypes.InstalledGraphPlugin[]>>;
    install: (
      pluginId: string,
    ) => Promise<IPCResponse<SharedTypes.GraphPluginInstallResult>>;
    uninstall: (pluginId: string) => Promise<IPCResponse<unknown>>;
    getTemplates: () => Promise<IPCResponse<SharedTypes.GraphPluginTemplateRef[]>>;
    applyTemplate: (
      input: SharedTypes.GraphPluginApplyTemplateInput,
    ) => Promise<IPCResponse<unknown>>;
  };
};
