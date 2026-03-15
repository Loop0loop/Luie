import { useEffect } from "react";
import { useGraphPluginStore } from "@renderer/features/research/stores/graphPluginStore";

type UseGraphPluginLibraryDataInput = {
  enabled?: boolean;
};

export function useGraphPluginLibraryData(
  input: UseGraphPluginLibraryDataInput = {},
) {
  const enabled = input.enabled ?? true;
  const applyingTemplateKey = useGraphPluginStore((state) => state.applyingTemplateKey);
  const catalog = useGraphPluginStore((state) => state.catalog);
  const error = useGraphPluginStore((state) => state.error);
  const installed = useGraphPluginStore((state) => state.installed);
  const installingPluginId = useGraphPluginStore((state) => state.installingPluginId);
  const isLoading = useGraphPluginStore((state) => state.isLoading);
  const hasLoaded = useGraphPluginStore((state) => state.hasLoaded);
  const loadData = useGraphPluginStore((state) => state.loadData);
  const templates = useGraphPluginStore((state) => state.templates);
  const uninstallingPluginId = useGraphPluginStore((state) => state.uninstallingPluginId);
  const applyTemplate = useGraphPluginStore((state) => state.applyTemplate);
  const installPlugin = useGraphPluginStore((state) => state.installPlugin);
  const uninstallPlugin = useGraphPluginStore((state) => state.uninstallPlugin);

  useEffect(() => {
    if (!enabled || hasLoaded || isLoading) {
      return;
    }
    void loadData();
  }, [enabled, hasLoaded, isLoading, loadData]);

  return {
    applyingTemplateKey,
    catalog,
    error,
    installed,
    installingPluginId,
    isLoading,
    loadData,
    templates,
    uninstallingPluginId,
    applyTemplate,
    installPlugin,
    uninstallPlugin,
  };
}
