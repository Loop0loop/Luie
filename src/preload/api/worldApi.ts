import { IPC_CHANNELS } from "../../shared/ipc/channels.js";
import type { RendererApi } from "../../shared/api/index.js";
import type { PreloadApiModuleContext } from "./types.js";

export function createWorldApi({
  safeInvoke,
}: PreloadApiModuleContext): Pick<
  RendererApi,
  "worldEntity" | "entityRelation" | "worldGraph" | "worldStorage" | "plugin"
> {
  return {
    worldEntity: {
      create: (input) => safeInvoke(IPC_CHANNELS.WORLD_ENTITY_CREATE, input),
      get: (id) => safeInvoke(IPC_CHANNELS.WORLD_ENTITY_GET, id),
      getAll: (projectId) => safeInvoke(IPC_CHANNELS.WORLD_ENTITY_GET_ALL, projectId),
      update: (input) => safeInvoke(IPC_CHANNELS.WORLD_ENTITY_UPDATE, input),
      updatePosition: (input) =>
        safeInvoke(IPC_CHANNELS.WORLD_ENTITY_UPDATE_POSITION, input),
      delete: (id) => safeInvoke(IPC_CHANNELS.WORLD_ENTITY_DELETE, id),
    },
    entityRelation: {
      create: (input) => safeInvoke(IPC_CHANNELS.ENTITY_RELATION_CREATE, input),
      getAll: (projectId) => safeInvoke(IPC_CHANNELS.ENTITY_RELATION_GET_ALL, projectId),
      update: (input) => safeInvoke(IPC_CHANNELS.ENTITY_RELATION_UPDATE, input),
      delete: (id) => safeInvoke(IPC_CHANNELS.ENTITY_RELATION_DELETE, id),
    },
    worldGraph: {
      get: (projectId) => safeInvoke(IPC_CHANNELS.WORLD_GRAPH_GET, projectId),
      getMentions: (query) =>
        safeInvoke(IPC_CHANNELS.WORLD_GRAPH_GET_MENTIONS, query),
    },
    worldStorage: {
      getDocument: (input) =>
        safeInvoke(IPC_CHANNELS.WORLD_STORAGE_GET_DOCUMENT, input),
      setDocument: (input) =>
        safeInvoke(IPC_CHANNELS.WORLD_STORAGE_SET_DOCUMENT, input),
      getScrapMemos: (projectId) =>
        safeInvoke(IPC_CHANNELS.WORLD_STORAGE_GET_SCRAP_MEMOS, projectId),
      setScrapMemos: (input) =>
        safeInvoke(IPC_CHANNELS.WORLD_STORAGE_SET_SCRAP_MEMOS, input),
    },
    plugin: {
      listCatalog: () => safeInvoke(IPC_CHANNELS.PLUGIN_LIST_CATALOG),
      listInstalled: () => safeInvoke(IPC_CHANNELS.PLUGIN_LIST_INSTALLED),
      install: (pluginId) => safeInvoke(IPC_CHANNELS.PLUGIN_INSTALL, pluginId),
      uninstall: (pluginId) => safeInvoke(IPC_CHANNELS.PLUGIN_UNINSTALL, pluginId),
      getTemplates: () => safeInvoke(IPC_CHANNELS.PLUGIN_GET_TEMPLATES),
      applyTemplate: (input) => safeInvoke(IPC_CHANNELS.PLUGIN_APPLY_TEMPLATE, input),
    },
  };
}
