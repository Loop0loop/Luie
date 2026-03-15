import { Download, FolderCog } from "lucide-react";
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
    <section className="rounded-xl border bg-card/80 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Download className="h-4 w-4 text-sky-500" />
            Extension Catalog
          </div>
          <p className="text-xs text-muted-foreground">
            GitHub release 자산에서 내려받을 수 있는 플러그인 번들입니다.
          </p>
        </div>
        <div className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-medium text-sky-500">
          {availablePlugins.length} Available
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {availablePlugins.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-background border shadow-sm">
              <FolderCog className="h-5 w-5 opacity-40" />
            </div>
            <p className="font-medium text-foreground">설치 가능한 플러그인이 더 없습니다.</p>
          </div>
        ) : (
          availablePlugins.map((plugin) => (
            <article
              key={`${plugin.pluginId}:${plugin.version}`}
              className="group flex items-center justify-between gap-4 rounded-lg border bg-background/50 p-4 transition-colors hover:bg-muted/30"
            >
              <div className="flex flex-col space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium leading-none truncate">{plugin.name}</h4>
                  <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground font-mono">
                    v{plugin.version}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {plugin.summary}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground/70">
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
              
              <button
                type="button"
                disabled={isLoading || installingPluginId === plugin.pluginId}
                onClick={() => onInstall(plugin.pluginId)}
                className="shrink-0 flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
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
