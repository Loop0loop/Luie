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
    <section className="rounded-[24px] border bg-card/80 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <FolderCog className="h-4 w-4" />
        Catalog
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        GitHub release 자산에서 내려받을 수 있는 플러그인 번들입니다.
      </p>

      <div className="mt-5 space-y-4">
        {availablePlugins.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
            설치 가능한 플러그인이 더 없습니다.
          </div>
        ) : (
          availablePlugins.map((plugin) => (
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
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {plugin.summary}
                  </p>
                  <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    <span>Min app {plugin.minAppVersion}+</span>
                    <span>API {plugin.apiVersion}</span>
                    <span>{plugin.size.toLocaleString()} bytes</span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isLoading || installingPluginId === plugin.pluginId}
                  onClick={() => onInstall(plugin.pluginId)}
                  className="inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  {installingPluginId === plugin.pluginId ? "Installing..." : "Install"}
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
