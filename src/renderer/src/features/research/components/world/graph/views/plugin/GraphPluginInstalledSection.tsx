import { PackageOpen, Sparkles, Network } from "lucide-react";
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
    <section className="rounded-[16px] border border-white/10 bg-black/20 backdrop-blur-md p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-foreground drop-shadow-sm">
            <PackageOpen className="h-5 w-5 text-indigo-400" />
            Installed Extensions
          </div>
          <p className="text-xs text-muted-foreground">
            설치된 번들에서 템플릿을 선택해 현재 그래프에 바로 적용합니다.
          </p>
        </div>
        <div className="rounded-full bg-indigo-500/10 border border-white/5 px-3 py-1 text-[11px] font-medium text-indigo-400 shadow-inner">
          {installed.length} Active
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {installed.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center text-sm text-muted-foreground transition-colors hover:bg-black/20">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent shadow-inner text-indigo-400">
              <PackageOpen className="h-5 w-5 opacity-40" />
            </div>
            아직 설치된 확장 프로그램이 없습니다.
          </div>
        ) : (
          installed.map((plugin) => {
            const pluginTemplates = templates.filter(
              (candidate) => candidate.pluginId === plugin.pluginId,
            );
            return (
              <article
                key={`${plugin.pluginId}:${plugin.version}`}
                className="group flex flex-col gap-4 rounded-xl border border-white/5 bg-white/5 p-5 transition-all duration-300 hover:bg-white/10 hover:shadow-lg hover:border-white/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-b from-indigo-500/20 to-transparent shadow-inner text-indigo-400">
                      <Network className="h-6 w-6 opacity-80" />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <div className="flex items-center gap-2">
                         <h4 className="text-[15px] font-semibold leading-none tracking-tight drop-shadow-sm">{plugin.name}</h4>
                         <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/80 font-mono shadow-inner border border-white/5">v{plugin.version}</span>
                         <span className="text-[11px] text-muted-foreground/60">{plugin.author}</span>
                      </div>
                      <p className="text-[13px] text-muted-foreground/80 line-clamp-2 leading-relaxed">
                        {plugin.description}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={uninstallingPluginId === plugin.pluginId}
                    onClick={() => onUninstall(plugin.pluginId, plugin.name)}
                    className="shrink-0 rounded-md border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-medium text-foreground transition-all hover:bg-destructive hover:text-destructive-foreground hover:border-destructive/50 disabled:pointer-events-none disabled:opacity-50 shadow-inner"
                  >
                    {uninstallingPluginId === plugin.pluginId ? "Removing" : "Uninstall"}
                  </button>
                </div>

                <div className="flex flex-col gap-3 mt-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-indigo-400/70" />
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Included Templates</div>
                  </div>
                  
                  {pluginTemplates.length === 0 ? (
                    <div className="rounded-lg border border-white/5 border-dashed bg-black/20 px-4 py-3 text-[12px] text-center text-muted-foreground/70">
                      이 번들에는 적용 가능한 템플릿이 포함되어 있지 않습니다.
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {pluginTemplates.map((entry) => {
                        const templateKey = `${entry.pluginId}:${entry.template.id}`;
                        return (
                          <div
                            key={templateKey}
                            className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-black/20 px-4 py-3 transition-colors hover:bg-black/40"
                          >
                            <div className="flex flex-col min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-medium text-foreground truncate drop-shadow-sm">{entry.template.title}</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {entry.template.tags.slice(0, 2).map((tag) => (
                                    <span key={tag} className="rounded bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 text-[9px] text-indigo-300 font-medium uppercase tracking-wider">
                                      {tag}
                                    </span>
                                  ))}
                                  {entry.template.tags.length > 2 && (
                                     <span className="rounded bg-white/10 border border-white/5 px-1.5 py-0.5 text-[9px] text-muted-foreground">+{entry.template.tags.length - 2}</span>
                                  )}
                                </div>
                              </div>
                              <span className="text-[11px] text-muted-foreground/80 truncate">{entry.template.summary}</span>
                            </div>
                            <button
                              type="button"
                              disabled={applyingTemplateKey === templateKey}
                              onClick={() =>
                                onApply(entry.pluginId, entry.template.id, entry.template.title)
                              }
                              className="shrink-0 rounded-md bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 text-[11px] font-medium text-indigo-300 shadow-inner transition-colors hover:bg-indigo-500 hover:text-white disabled:pointer-events-none disabled:opacity-50"
                            >
                              {applyingTemplateKey === templateKey ? "Applying..." : "Apply Template"}
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
