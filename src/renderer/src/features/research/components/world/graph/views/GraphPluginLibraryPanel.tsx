import { useDialog } from "@shared/ui/useDialog";
import { useToast } from "@shared/ui/ToastContext";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { GraphPluginCatalogSection } from "./plugin/GraphPluginCatalogSection";
import { GraphPluginInstalledSection } from "./plugin/GraphPluginInstalledSection";
import { GraphPluginRecommendedSection } from "./plugin/GraphPluginRecommendedSection";
import { useGraphPluginLibraryData } from "./plugin/useGraphPluginLibraryData";

type GraphPluginLibraryPanelProps = {
  projectId: string | null;
};

export function GraphPluginLibraryPanel({
  projectId,
}: GraphPluginLibraryPanelProps) {
  const dialog = useDialog();
  const { showToast } = useToast();
  const loadGraph = useWorldBuildingStore((state) => state.loadGraph);
  const {
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
  } = useGraphPluginLibraryData();

  const installedIds = new Set(installed.map((plugin) => plugin.pluginId));
  const availablePlugins = catalog.filter(
    (plugin) => !installedIds.has(plugin.pluginId),
  );

  const handleInstall = async (pluginId: string) => {
    const result = await installPlugin(pluginId);
    showToast(
      result.success
        ? "플러그인을 설치했습니다."
        : result.error ?? "플러그인을 설치하지 못했습니다.",
      result.success ? "success" : "error",
    );
  };

  const handleUninstall = async (pluginId: string, pluginName: string) => {
    const confirmed = await dialog.confirm({
      title: "플러그인 제거",
      message: `${pluginName} 설치를 제거합니다. 이미 프로젝트에 적용된 템플릿 결과는 되돌리지 않습니다.`,
      confirmLabel: "제거",
      cancelLabel: "취소",
      isDestructive: true,
    });
    if (!confirmed) return;

    const result = await uninstallPlugin(pluginId);
    showToast(
      result.success
        ? "플러그인을 제거했습니다."
        : result.error ?? "플러그인을 제거하지 못했습니다.",
      result.success ? "success" : "error",
    );
  };

  const handleApply = async (
    pluginId: string,
    templateId: string,
    title: string,
  ) => {
    if (!projectId) {
      showToast("프로젝트를 연 뒤 템플릿을 적용할 수 있습니다.", "error");
      return;
    }

    const confirmed = await dialog.confirm({
      title: "그래프 템플릿 적용",
      message:
        `${title} 템플릿을 적용하면 현재 프로젝트의 커스텀 월드 엔티티/관계 레이어가 교체됩니다.`,
      confirmLabel: "적용",
      cancelLabel: "취소",
      isDestructive: true,
    });
    if (!confirmed) return;

    const result = await applyTemplate({ pluginId, templateId, projectId });
    if (!result.success) {
      showToast(result.error ?? "템플릿을 적용하지 못했습니다.", "error");
      return;
    }

    await loadGraph(projectId);
    await loadData(true);
    showToast("그래프 템플릿을 적용했습니다.", "success");
  };

  return (
    <div className="space-y-10">
      {error ? (
        <div className="rounded-[16px] border border-destructive/30 bg-destructive/5 px-6 py-5 text-[14px] text-destructive shadow-sm">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-10">
        <GraphPluginRecommendedSection
          catalog={catalog}
          installed={installed}
          installingPluginId={installingPluginId}
          onInstall={(pluginId) => { void handleInstall(pluginId); }}
        />
        
        <GraphPluginCatalogSection
          availablePlugins={availablePlugins}
          installingPluginId={installingPluginId}
          isLoading={isLoading}
          onInstall={(pluginId) => {
            void handleInstall(pluginId);
          }}
        />

        <GraphPluginInstalledSection
          applyingTemplateKey={applyingTemplateKey}
          installed={installed}
          templates={templates}
          uninstallingPluginId={uninstallingPluginId}
          onApply={(pluginId, templateId, title) => {
            void handleApply(pluginId, templateId, title);
          }}
          onUninstall={(pluginId, pluginName) => {
            void handleUninstall(pluginId, pluginName);
          }}
        />
      </div>
    </div>
  );
}
