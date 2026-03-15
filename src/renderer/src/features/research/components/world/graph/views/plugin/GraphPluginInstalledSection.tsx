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
    <section className="rounded-xl border bg-card/80 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <PackageOpen className="h-4 w-4 text-emerald-500" />
            Installed Plugins
          </div>
          <p className="text-xs text-muted-foreground">
            설치된 번들에서 템플릿을 선택해 현재 그래프에 바로 적용합니다.
          </p>
        </div>
        <div className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-500">
          {installed.length} Active
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {installed.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-5 text-sm text-center text-muted-foreground">
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
                className="group flex flex-col gap-3 rounded-lg border bg-background/50 p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <div className="flex items-center gap-2">
                       <h4 className="text-sm font-medium leading-none">{plugin.name}</h4>
                       <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground font-mono">v{plugin.version}</span>
                       <span className="text-[11px] text-muted-foreground">{plugin.author}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {plugin.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={uninstallingPluginId === plugin.pluginId}
                    onClick={() => onUninstall(plugin.pluginId, plugin.name)}
                    className="shrink-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:pointer-events-none disabled:opacity-50"
                  >
                    {uninstallingPluginId === plugin.pluginId ? "Removing..." : "Uninstall"}
                  </button>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Templates</div>
                  {pluginTemplates.length === 0 ? (
                    <div className="rounded-md border border-dashed px-3 py-2 text-[11px] text-muted-foreground">
                      적용 가능한 템플릿이 없습니다.
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {pluginTemplates.map((entry) => {
                        const templateKey = `${entry.pluginId}:${entry.template.id}`;
                        return (
                          <div
                            key={templateKey}
                            className="flex items-center justify-between gap-3 rounded-md border border-border/50 bg-background/50 px-3 py-2"
                          >
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-foreground truncate">{entry.template.title}</span>
                                <div className="flex flex-wrap gap-1">
                                  {entry.template.tags.slice(0, 2).map((tag) => (
                                    <span key={tag} className="rounded bg-muted px-1 py-0 text-[9px] text-muted-foreground uppercase">
                                      {tag}
                                    </span>
                                  ))}
                                  {entry.template.tags.length > 2 && (
                                     <span className="rounded bg-muted px-1 py-0 text-[9px] text-muted-foreground">+{entry.template.tags.length - 2}</span>
                                  )}
                                </div>
                              </div>
                              <span className="text-[11px] text-muted-foreground truncate">{entry.template.summary}</span>
                            </div>
                            <button
                              type="button"
                              disabled={applyingTemplateKey === templateKey}
                              onClick={() =>
                                onApply(entry.pluginId, entry.template.id, entry.template.title)
                              }
                              className="shrink-0 rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
                            >
                              {applyingTemplateKey === templateKey ? "Applying..." : "Apply"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
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
