import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Puzzle, Download, Trash2, Loader2, AlertCircle } from "lucide-react";
import type { GraphPluginCatalogItem, InstalledGraphPlugin } from "@shared/types";
import { cn } from "@renderer/lib/utils";

type PluginsTab = "available" | "installed";

interface PluginsViewProps {
  catalog: GraphPluginCatalogItem[];
  installed: InstalledGraphPlugin[];
  isLoading: boolean;
  error: string | null;
  installingId: string | null;
  uninstallingId: string | null;
  onInstall: (pluginId: string) => void;
  onUninstall: (pluginId: string) => void;
}

export function PluginsView({
  catalog,
  installed,
  isLoading,
  error,
  installingId,
  uninstallingId,
  onInstall,
  onUninstall,
}: PluginsViewProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PluginsTab>("available");

  const installedIds = new Set(installed.map((p) => p.pluginId));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border/30 px-5 py-3">
        <Puzzle size={14} className="text-muted" />
        <span className="text-[12px] font-semibold text-fg">{t("canvas.tab.plugins")}</span>
      </div>

      {/* Sub-tabs */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border/20 px-4 py-2">
        {(["available", "installed"] as PluginsTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "rounded-lg px-3 py-1 text-[11px] font-medium transition-colors",
              activeTab === tab
                ? "bg-element text-fg"
                : "text-muted hover:text-fg",
            )}
          >
            {t(`canvas.plugins.tab.${tab}`)}
            {tab === "installed" && installed.length > 0 && (
              <span className="ml-1.5 rounded-full border border-border/40 bg-element px-1.5 py-0.5 text-[9px]">
                {installed.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center gap-2 text-muted">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[12px]">{t("canvas.plugins.loading")}</span>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <AlertCircle size={24} className="text-muted/40" strokeWidth={1} />
            <p className="text-[12px] text-muted">{error}</p>
          </div>
        ) : activeTab === "available" ? (
          <AvailablePlugins
            catalog={catalog}
            installedIds={installedIds}
            installingId={installingId}
            onInstall={onInstall}
            t={t}
          />
        ) : (
          <InstalledPlugins
            installed={installed}
            uninstallingId={uninstallingId}
            onUninstall={onUninstall}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

function AvailablePlugins({
  catalog,
  installedIds,
  installingId,
  onInstall,
  t,
}: {
  catalog: GraphPluginCatalogItem[];
  installedIds: Set<string>;
  installingId: string | null;
  onInstall: (id: string) => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  if (catalog.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <Puzzle size={32} className="text-muted/30" strokeWidth={1} />
        <p className="text-[12px] text-muted">{t("canvas.plugins.empty")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {catalog.map((plugin) => {
        const isInstalled = installedIds.has(plugin.pluginId);
        const isInstalling = installingId === plugin.pluginId;

        return (
          <div
            key={plugin.pluginId}
            className="flex gap-3 rounded-xl border border-border/30 bg-panel/60 p-3.5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/30 bg-element text-muted">
              <Puzzle size={18} strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-fg">{plugin.name}</p>
              {plugin.summary && (
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted">
                  {plugin.summary}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between">
                {plugin.version && (
                  <span className="rounded border border-border/30 px-1.5 py-0.5 text-[9px] text-muted">
                    v{plugin.version}
                  </span>
                )}
                <button
                  type="button"
                  disabled={isInstalled || isInstalling}
                  onClick={() => onInstall(plugin.pluginId)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors",
                    isInstalled
                      ? "cursor-default text-muted/50"
                      : isInstalling
                        ? "cursor-wait text-muted"
                        : "border border-border/40 bg-element text-fg hover:bg-element-hover",
                  )}
                >
                  {isInstalling ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <Download size={10} />
                  )}
                  {isInstalled ? t("canvas.plugins.installed") : t("canvas.plugins.install")}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InstalledPlugins({
  installed,
  uninstallingId,
  onUninstall,
  t,
}: {
  installed: InstalledGraphPlugin[];
  uninstallingId: string | null;
  onUninstall: (id: string) => void;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  if (installed.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <Puzzle size={32} className="text-muted/30" strokeWidth={1} />
        <p className="text-[12px] text-muted">{t("canvas.plugins.noneInstalled")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {installed.map((plugin) => {
        const isUninstalling = uninstallingId === plugin.pluginId;
        return (
          <div
            key={plugin.pluginId}
            className="flex items-center gap-3 rounded-xl border border-border/30 bg-panel/60 px-3.5 py-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/30 bg-element text-muted">
              <Puzzle size={16} strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-fg">{plugin.pluginId}</p>
            </div>
            <button
              type="button"
              disabled={isUninstalling}
              onClick={() => onUninstall(plugin.pluginId)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-element hover:text-red-400 disabled:opacity-40"
            >
              {isUninstalling ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            </button>
          </div>
        );
      })}
    </div>
  );
}
