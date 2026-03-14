import { useEffect } from "react";
import { Download, FolderCog, PackageOpen, PlugZap, RefreshCcw } from "lucide-react";
import { useDialog } from "@shared/ui/useDialog";
import { useToast } from "@shared/ui/ToastContext";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useGraphPluginStore } from "@renderer/features/research/stores/graphPluginStore";

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
  } = useGraphPluginStore();

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const installedIds = new Set(installed.map((plugin) => plugin.pluginId));
  const availablePlugins = catalog.filter((plugin) => !installedIds.has(plugin.pluginId));

  const handleRefresh = async () => {
    await loadData(true);
  };

  const handleInstall = async (pluginId: string) => {
    const result = await installPlugin(pluginId);
    if (result.success) {
      showToast("플러그인을 설치했습니다.", "success");
      return;
    }
    showToast(result.error ?? "플러그인을 설치하지 못했습니다.", "error");
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
    if (result.success) {
      showToast("플러그인을 제거했습니다.", "success");
      return;
    }
    showToast(result.error ?? "플러그인을 제거하지 못했습니다.", "error");
  };

  const handleApply = async (pluginId: string, templateId: string, title: string) => {
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
    <section className="space-y-6 rounded-3xl border bg-card/70 p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <PlugZap className="h-4 w-4" />
            Graph Plugins
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            라이브러리에서 플러그인을 설치하고 그래프 템플릿을 현재 프로젝트에 적용합니다.
            V1 템플릿은 커스텀 월드 엔티티 그래프만 다룹니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void handleRefresh();
          }}
          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/10"
        >
          <RefreshCcw className="h-4 w-4" />
          새로고침
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-background/80 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <PackageOpen className="h-4 w-4" />
            Installed Plugins
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            설치된 플러그인에서 템플릿을 바로 적용할 수 있습니다.
          </p>

          <div className="mt-4 space-y-3">
            {installed.length === 0 ? (
              <div className="rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground">
                아직 설치된 플러그인이 없습니다.
              </div>
            ) : (
              installed.map((plugin) => {
                const pluginTemplates = templates.filter(
                  (candidate) => candidate.pluginId === plugin.pluginId,
                );
                return (
                  <div
                    key={`${plugin.pluginId}:${plugin.version}`}
                    className="rounded-2xl border bg-card/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {plugin.name}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          v{plugin.version} · {plugin.author}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {plugin.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={uninstallingPluginId === plugin.pluginId}
                        onClick={() => {
                          void handleUninstall(plugin.pluginId, plugin.name);
                        }}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {uninstallingPluginId === plugin.pluginId ? "Removing..." : "Uninstall"}
                      </button>
                    </div>

                    <div className="mt-4 space-y-2">
                      {pluginTemplates.length === 0 ? (
                        <div className="rounded-xl border border-dashed px-3 py-3 text-xs text-muted-foreground">
                          적용 가능한 템플릿이 없습니다.
                        </div>
                      ) : (
                        pluginTemplates.map((entry) => {
                          const templateKey = `${entry.pluginId}:${entry.template.id}`;
                          return (
                            <div
                              key={templateKey}
                              className="rounded-xl border bg-background/70 px-3 py-3"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="text-sm font-medium text-foreground">
                                    {entry.template.title}
                                  </div>
                                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    {entry.template.summary}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {entry.template.tags.map((tag) => (
                                      <span
                                        key={`${templateKey}:${tag}`}
                                        className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  disabled={applyingTemplateKey === templateKey}
                                  onClick={() => {
                                    void handleApply(
                                      entry.pluginId,
                                      entry.template.id,
                                      entry.template.title,
                                    );
                                  }}
                                  className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {applyingTemplateKey === templateKey ? "Applying..." : "Apply"}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-background/80 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FolderCog className="h-4 w-4" />
            Available Plugins
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            그래프 라이브러리 카탈로그에서 설치 가능한 플러그인 목록입니다.
          </p>

          <div className="mt-4 space-y-3">
            {availablePlugins.length === 0 ? (
              <div className="rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground">
                설치 가능한 플러그인이 더 없습니다.
              </div>
            ) : (
              availablePlugins.map((plugin) => (
                <div
                  key={`${plugin.pluginId}:${plugin.version}`}
                  className="rounded-2xl border bg-card/80 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {plugin.name}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        v{plugin.version} · requires {plugin.minAppVersion}+
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {plugin.summary}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isLoading || installingPluginId === plugin.pluginId}
                      onClick={() => {
                        void handleInstall(plugin.pluginId);
                      }}
                      className="inline-flex rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {installingPluginId === plugin.pluginId ? (
                        "Installing..."
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <Download className="h-3.5 w-3.5" />
                          Install
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
