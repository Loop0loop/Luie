import { useEffect } from "react";
import { useGraphPluginStore } from "@renderer/features/research/stores/graphPluginStore";

type UseGraphPluginLibraryDataInput = {
  enabled?: boolean;
};

export function useGraphPluginLibraryData(
  input: UseGraphPluginLibraryDataInput = {},
) {
  const enabled = input.enabled ?? true;
  const loadData = useGraphPluginStore((state) => state.loadData);
  const hasLoaded = useGraphPluginStore((state) => state.hasLoaded);
  const isLoading = useGraphPluginStore((state) => state.isLoading);

  useEffect(() => {
    if (!enabled || hasLoaded || isLoading) {
      return;
    }
    void loadData();
  }, [enabled, hasLoaded, isLoading, loadData]);

  return {
    applyingTemplateKey: useGraphPluginStore((state) => state.applyingTemplateKey),
    catalog: useGraphPluginStore((state) => state.catalog),
    error: useGraphPluginStore((state) => state.error),
    installed: useGraphPluginStore((state) => state.installed),
    installingPluginId: useGraphPluginStore((state) => state.installingPluginId),
    isLoading,
    loadData,
    templates: useGraphPluginStore((state) => state.templates),
    uninstallingPluginId: useGraphPluginStore((state) => state.uninstallingPluginId),
    applyTemplate: useGraphPluginStore((state) => state.applyTemplate),
    installPlugin: useGraphPluginStore((state) => state.installPlugin),
    uninstallPlugin: useGraphPluginStore((state) => state.uninstallPlugin),
  };
}
