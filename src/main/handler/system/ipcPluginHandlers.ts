import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import {
  graphPluginApplyTemplateArgsSchema,
  graphPluginInstallArgsSchema,
  graphPluginUninstallArgsSchema,
} from "../../../shared/schemas/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import type { LoggerLike } from "../core/types.js";

type GraphPluginServiceLike = {
  listCatalog: () => Promise<unknown>;
  listInstalled: () => Promise<unknown>;
  install: (pluginId: string) => Promise<unknown>;
  uninstall: (pluginId: string) => Promise<void>;
  getTemplates: () => Promise<unknown>;
  applyTemplate: (input: {
    pluginId: string;
    templateId: string;
    projectId: string;
  }) => Promise<void>;
};

export function registerPluginIPCHandlers(
  logger: LoggerLike,
  pluginService: GraphPluginServiceLike,
): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.PLUGIN_LIST_CATALOG,
      logTag: "PLUGIN_LIST_CATALOG",
      failMessage: "Failed to list graph plugin catalog",
      handler: () => pluginService.listCatalog(),
    },
    {
      channel: IPC_CHANNELS.PLUGIN_LIST_INSTALLED,
      logTag: "PLUGIN_LIST_INSTALLED",
      failMessage: "Failed to list installed graph plugins",
      handler: () => pluginService.listInstalled(),
    },
    {
      channel: IPC_CHANNELS.PLUGIN_INSTALL,
      logTag: "PLUGIN_INSTALL",
      failMessage: "Failed to install graph plugin",
      argsSchema: graphPluginInstallArgsSchema,
      handler: (pluginId: string) => pluginService.install(pluginId),
    },
    {
      channel: IPC_CHANNELS.PLUGIN_UNINSTALL,
      logTag: "PLUGIN_UNINSTALL",
      failMessage: "Failed to uninstall graph plugin",
      argsSchema: graphPluginUninstallArgsSchema,
      handler: (pluginId: string) => pluginService.uninstall(pluginId),
    },
    {
      channel: IPC_CHANNELS.PLUGIN_GET_TEMPLATES,
      logTag: "PLUGIN_GET_TEMPLATES",
      failMessage: "Failed to list graph plugin templates",
      handler: () => pluginService.getTemplates(),
    },
    {
      channel: IPC_CHANNELS.PLUGIN_APPLY_TEMPLATE,
      logTag: "PLUGIN_APPLY_TEMPLATE",
      failMessage: "Failed to apply graph plugin template",
      argsSchema: graphPluginApplyTemplateArgsSchema,
      handler: (input: {
        pluginId: string;
        templateId: string;
        projectId: string;
      }) => pluginService.applyTemplate(input),
    },
  ]);
}
