import { Download, FolderCog, Network } from "lucide-react";
import type { GraphPluginCatalogItem } from "@shared/types";

type GraphPluginCatalogSectionProps = {
  availablePlugins: GraphPluginCatalogItem[];
  installingPluginId: string | null;
  isLoading: boolean;
  onInstall: (pluginId: string) => void;
};

export function GraphPluginCatalogSection({
  availablePlugins,
  installingPluginId,
  isLoading,
  onInstall,
}: GraphPluginCatalogSectionProps) {
  return (
    <section className="rounded-[16px] border border-white/10 bg-black/20 backdrop-blur-md p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-foreground drop-shadow-sm">
            <Download className="h-5 w-5 text-sky-400" />
            Extension Catalog
          </div>
          <p className="text-xs text-muted-foreground">
            GitHub release 자산에서 내려받을 수 있는 플러그인 번들입니다.
          </p>
        </div>
        <div className="rounded-full bg-sky-500/10 border border-white/5 px-3 py-1 text-[11px] font-medium text-sky-400 shadow-inner">
          {availablePlugins.length} Available
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {availablePlugins.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center text-sm text-muted-foreground transition-colors hover:bg-black/20">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent shadow-inner text-sky-400">
              <FolderCog className="h-5 w-5 opacity-40" />
            </div>
            설치 가능한 플러그인이 더 없습니다.
          </div>
        ) : (
          availablePlugins.map((plugin) => (
            <article
              key={`${plugin.pluginId}:${plugin.version}`}
              className="group flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/5 p-5 transition-all duration-300 hover:bg-white/10 hover:shadow-lg hover:border-white/10"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-b from-sky-500/20 to-transparent shadow-inner text-sky-400">
                  <Network className="h-6 w-6 opacity-80" />
                </div>
                <div className="flex flex-col space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[15px] font-semibold leading-none truncate drop-shadow-sm">{plugin.name}</h4>
                    <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/80 font-mono shadow-inner border border-white/5">
                      v{plugin.version}
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground/80 line-clamp-1 leading-relaxed">
                    {plugin.summary}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground/60 tracking-wide">
                    <span className="flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/40"></span>
                      Min app v{plugin.minAppVersion}+
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/40"></span>
                      API v{plugin.apiVersion}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/40"></span>
                      {(plugin.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                type="button"
                disabled={isLoading || installingPluginId === plugin.pluginId}
                onClick={() => onInstall(plugin.pluginId)}
                className="shrink-0 flex items-center gap-1.5 rounded-md bg-sky-500/20 border border-sky-500/30 px-4 py-1.5 text-[11px] font-semibold text-sky-300 shadow-inner transition-all hover:bg-sky-500 hover:text-white disabled:pointer-events-none disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                {installingPluginId === plugin.pluginId ? "Installing..." : "Install"}
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
