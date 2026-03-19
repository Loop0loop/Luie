import { useMemo } from "react";
import type {
  GraphPluginTemplateRef,
  InstalledGraphPlugin,
  GraphPluginCatalogItem,
} from "@shared/types";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { GRAPH_PLUGIN_EMPTY_ICON } from "../constants";

type LibraryViewProps = {
  currentProjectId: string | null;
  catalog: GraphPluginCatalogItem[];
  installed: InstalledGraphPlugin[];
  templates: GraphPluginTemplateRef[];
  isLoading: boolean;
  error: string | null;
  installingPluginId: string | null;
  uninstallingPluginId: string | null;
  applyingTemplateKey: string | null;
  onInstall: (pluginId: string) => Promise<void>;
  onUninstall: (pluginId: string) => Promise<void>;
  onApplyTemplate: (pluginId: string, templateId: string) => Promise<void>;
};

export function LibraryView({
  currentProjectId,
  catalog,
  installed,
  templates,
  isLoading,
  error,
  installingPluginId,
  uninstallingPluginId,
  applyingTemplateKey,
  onInstall,
  onUninstall,
  onApplyTemplate,
}: LibraryViewProps) {
  const installedIds = useMemo(
    () => new Set(installed.map((plugin) => plugin.pluginId)),
    [installed],
  );
  const available = catalog.filter((item) => !installedIds.has(item.pluginId));
  const templatesByPluginId = useMemo(() => {
    const map = new Map<string, GraphPluginTemplateRef[]>();
    templates.forEach((template) => {
      const current = map.get(template.pluginId) ?? [];
      current.push(template);
      map.set(template.pluginId, current);
    });
    return map;
  }, [templates]);

  return (
    <div className="h-full overflow-y-auto bg-canvas">
      <div className="mx-auto max-w-6xl space-y-8 px-8 py-8">
        {error ? (
          <div className="rounded-[24px] border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <section className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-fg/45">
              Installed Plugins
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-fg">설치된 플러그인</h2>
          </div>

          {installed.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-border/60 bg-white/5 px-6 py-8 text-sm text-fg/65">
              설치된 플러그인이 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {installed.map((plugin) => (
                <Card
                  key={plugin.pluginId}
                  className="rounded-[24px] border border-border/60 bg-panel"
                >
                  <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg text-fg">{plugin.name}</CardTitle>
                      <p className="mt-1 text-sm text-fg/55">
                        {plugin.description || plugin.pluginId}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void onUninstall(plugin.pluginId)}
                    >
                      {uninstallingPluginId === plugin.pluginId ? "제거 중..." : "제거"}
                    </Button>
                  </div>
                  </CardHeader>

                  <CardContent className="space-y-2">
                    {(templatesByPluginId.get(plugin.pluginId) ?? []).map((template) => {
                      const templateKey = `${template.pluginId}:${template.template.id}`;

                      return (
                        <div
                          key={template.template.id}
                          className="rounded-2xl border border-border/60 bg-white/5 px-4 py-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-fg">
                                {template.template.title}
                              </p>
                              <p className="mt-1 text-xs text-fg/55">
                                {template.template.summary}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={!currentProjectId}
                              onClick={() =>
                                void onApplyTemplate(
                                  template.pluginId,
                                  template.template.id,
                                )
                              }
                            >
                              {applyingTemplateKey === templateKey ? "적용 중..." : "적용"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-fg/45">
              Available Plugins
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-fg">카탈로그</h2>
          </div>

          {available.length === 0 && !isLoading ? (
            <div className="rounded-[24px] border border-dashed border-border/60 bg-white/5 px-6 py-8 text-sm text-fg/65">
              설치 가능한 플러그인이 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {available.map((plugin) => {
                const Icon = GRAPH_PLUGIN_EMPTY_ICON;
                return (
                  <Card
                    key={plugin.pluginId}
                    className="rounded-[24px] border border-border/60 bg-[#161a21]"
                  >
                    <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-white/5 text-fg/70">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-semibold text-fg">{plugin.name}</p>
                        <p className="mt-1 text-sm text-fg/55">{plugin.summary}</p>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">v{plugin.version}</Badge>
                            <Badge variant="outline">{plugin.releaseTag}</Badge>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => void onInstall(plugin.pluginId)}
                          >
                            {installingPluginId === plugin.pluginId ? "설치 중..." : "설치"}
                          </Button>
                        </div>
                      </div>
                    </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
