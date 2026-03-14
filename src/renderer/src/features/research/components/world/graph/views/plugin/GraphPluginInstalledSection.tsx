import { PackageOpen } from "lucide-react";
import type { GraphPluginTemplateRef, InstalledGraphPlugin } from "@shared/types";

type GraphPluginInstalledSectionProps = {
  applyingTemplateKey: string | null;
  installed: InstalledGraphPlugin[];
  templates: GraphPluginTemplateRef[];
  uninstallingPluginId: string | null;
  onApply: (pluginId: string, templateId: string, title: string) => void;
  onUninstall: (pluginId: string, pluginName: string) => void;
};

export function GraphPluginInstalledSection({
  applyingTemplateKey,
  installed,
  templates,
  uninstallingPluginId,
  onApply,
  onUninstall,
}: GraphPluginInstalledSectionProps) {
  return (
    <section className="rounded-[24px] border bg-card/80 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <PackageOpen className="h-4 w-4" />
        Installed Plugins
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        설치된 번들에서 템플릿을 선택해 현재 그래프에 바로 적용합니다.
      </p>

      <div className="mt-5 space-y-4">
        {installed.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
            아직 설치된 플러그인이 없습니다.
          </div>
        ) : (
          installed.map((plugin) => {
            const pluginTemplates = templates.filter(
              (candidate) => candidate.pluginId === plugin.pluginId,
            );
            return (
              <article
                key={`${plugin.pluginId}:${plugin.version}`}
                className="rounded-[22px] border border-border/70 bg-background/80 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {plugin.name}
                      </h3>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
                        v{plugin.version}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {plugin.author}
                      </span>
                    </div>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                      {plugin.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={uninstallingPluginId === plugin.pluginId}
                    onClick={() => onUninstall(plugin.pluginId, plugin.name)}
                    className="rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uninstallingPluginId === plugin.pluginId ? "Removing..." : "Uninstall"}
                  </button>
                </div>

                <div className="mt-4 grid gap-3">
                  {pluginTemplates.length === 0 ? (
                    <div className="rounded-2xl border border-dashed px-3 py-4 text-xs text-muted-foreground">
                      적용 가능한 템플릿이 없습니다.
                    </div>
                  ) : (
                    pluginTemplates.map((entry) => {
                      const templateKey = `${entry.pluginId}:${entry.template.id}`;
                      return (
                        <div
                          key={templateKey}
                          className="grid gap-3 rounded-2xl border border-border/60 bg-muted/20 px-4 py-4 lg:grid-cols-[minmax(0,1fr),auto]"
                        >
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-medium text-foreground">
                                {entry.template.title}
                              </div>
                              {entry.template.tags.map((tag) => (
                                <span
                                  key={`${templateKey}:${tag}`}
                                  className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs leading-5 text-muted-foreground">
                              {entry.template.summary}
                            </p>
                          </div>
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              disabled={applyingTemplateKey === templateKey}
                              onClick={() =>
                                onApply(
                                  entry.pluginId,
                                  entry.template.id,
                                  entry.template.title,
                                )
                              }
                              className="rounded-2xl bg-foreground px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {applyingTemplateKey === templateKey ? "Applying..." : "Apply"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
