import { useCallback } from "react";
import { useGraphPluginStore } from "@renderer/features/research/stores/graphPluginStore";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useWorldGraphWorkspace } from "../hooks/useWorldGraphWorkspace";
import { LibraryView } from "../views/LibraryView";

export function LibraryTab() {
  const {
    projectId,
    catalog,
    installed,
    templates,
    pluginsLoading,
    pluginError,
  } = useWorldGraphWorkspace();

  const installPlugin = useGraphPluginStore((state) => state.installPlugin);
  const uninstallPlugin = useGraphPluginStore((state) => state.uninstallPlugin);
  const applyTemplate = useGraphPluginStore((state) => state.applyTemplate);
  const loadPluginData = useGraphPluginStore((state) => state.loadData);
  const installingPluginId = useGraphPluginStore(
    (state) => state.installingPluginId,
  );
  const uninstallingPluginId = useGraphPluginStore(
    (state) => state.uninstallingPluginId,
  );
  const applyingTemplateKey = useGraphPluginStore(
    (state) => state.applyingTemplateKey,
  );

  const loadGraph = useWorldBuildingStore((state) => state.loadGraph);

  const handleApplyTemplate = useCallback(
    async (pluginId: string, templateId: string) => {
      if (!projectId) return;

      const result = await applyTemplate({ pluginId, templateId, projectId });
      if (!result.success) return;

      await loadGraph(projectId);
      await loadPluginData(true);
    },
    [applyTemplate, loadGraph, loadPluginData, projectId],
  );

  return (
    <LibraryView
      currentProjectId={projectId}
      catalog={catalog}
      installed={installed}
      templates={templates}
      isLoading={pluginsLoading}
      error={pluginError}
      installingPluginId={installingPluginId}
      uninstallingPluginId={uninstallingPluginId}
      applyingTemplateKey={applyingTemplateKey}
      onInstall={async (pluginId) => {
        await installPlugin(pluginId);
      }}
      onUninstall={async (pluginId) => {
        await uninstallPlugin(pluginId);
      }}
      onApplyTemplate={handleApplyTemplate}
    />
  );
}
