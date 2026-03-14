import { create } from "zustand";
import { api } from "@shared/api";
import type {
  GraphPluginApplyTemplateInput,
  GraphPluginCatalogItem,
  GraphPluginTemplateRef,
  InstalledGraphPlugin,
} from "@shared/types";

let graphPluginLoadPromise: Promise<void> | null = null;

type ActionResult = {
  success: boolean;
  error?: string;
};

type GraphPluginStoreState = {
  catalog: GraphPluginCatalogItem[];
  installed: InstalledGraphPlugin[];
  templates: GraphPluginTemplateRef[];
  error: string | null;
  hasLoaded: boolean;
  isLoading: boolean;
  installingPluginId: string | null;
  uninstallingPluginId: string | null;
  applyingTemplateKey: string | null;
  loadData: (force?: boolean) => Promise<void>;
  installPlugin: (pluginId: string) => Promise<ActionResult>;
  uninstallPlugin: (pluginId: string) => Promise<ActionResult>;
  applyTemplate: (input: GraphPluginApplyTemplateInput) => Promise<ActionResult>;
};

export const useGraphPluginStore = create<GraphPluginStoreState>((set, get) => ({
  catalog: [],
  installed: [],
  templates: [],
  error: null,
  hasLoaded: false,
  isLoading: false,
  installingPluginId: null,
  uninstallingPluginId: null,
  applyingTemplateKey: null,
  loadData: async (force = false) => {
    if (!force && get().hasLoaded) return;
    if (graphPluginLoadPromise) {
      await graphPluginLoadPromise;
      if (!force) {
        return;
      }
    }

    set({ isLoading: true, error: null });
    const request = (async () => {
      try {
        const [catalogResponse, installedResponse, templatesResponse] =
          await Promise.all([
            api.plugin.listCatalog(),
            api.plugin.listInstalled(),
            api.plugin.getTemplates(),
          ]);

        if (!catalogResponse.success) {
          throw new Error(catalogResponse.error?.message ?? "Failed to load plugin catalog");
        }
        if (!installedResponse.success) {
          throw new Error(
            installedResponse.error?.message ?? "Failed to load installed plugins",
          );
        }
        if (!templatesResponse.success) {
          throw new Error(
            templatesResponse.error?.message ?? "Failed to load plugin templates",
          );
        }

        set({
          catalog: catalogResponse.data ?? [],
          installed: installedResponse.data ?? [],
          templates: templatesResponse.data ?? [],
          error: null,
          hasLoaded: true,
          isLoading: false,
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : String(error),
          hasLoaded: true,
          isLoading: false,
        });
      }
    })();

    graphPluginLoadPromise = request.finally(() => {
      if (graphPluginLoadPromise === request) {
        graphPluginLoadPromise = null;
      }
    });
    await graphPluginLoadPromise;
  },
  installPlugin: async (pluginId) => {
    set({ installingPluginId: pluginId, error: null });
    try {
      const response = await api.plugin.install(pluginId);
      if (!response.success) {
        throw new Error(response.error?.message ?? "Failed to install plugin");
      }
      await get().loadData(true);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message });
      return { success: false, error: message };
    } finally {
      set({ installingPluginId: null });
    }
  },
  uninstallPlugin: async (pluginId) => {
    set({ uninstallingPluginId: pluginId, error: null });
    try {
      const response = await api.plugin.uninstall(pluginId);
      if (!response.success) {
        throw new Error(response.error?.message ?? "Failed to uninstall plugin");
      }
      await get().loadData(true);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message });
      return { success: false, error: message };
    } finally {
      set({ uninstallingPluginId: null });
    }
  },
  applyTemplate: async (input) => {
    const applyingTemplateKey = `${input.pluginId}:${input.templateId}`;
    set({ applyingTemplateKey, error: null });
    try {
      const response = await api.plugin.applyTemplate(input);
      if (!response.success) {
        throw new Error(response.error?.message ?? "Failed to apply template");
      }
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message });
      return { success: false, error: message };
    } finally {
      set({ applyingTemplateKey: null });
    }
  },
}));
