import { Library } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@renderer/components/ui/button";

type LibrarySidebarProps = {
  pluginSummary: {
    catalogCount: number;
    installedCount: number;
    templateCount: number;
    isLoading: boolean;
    error: string | null;
    onReload: () => void;
  };
};

export function LibrarySidebar({ pluginSummary }: LibrarySidebarProps) {
  const { t } = useTranslation();

  return (
    <div className="p-6 space-y-8 bg-background/50 h-full">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary font-black text-[11px] uppercase tracking-widest">
          <Library className="w-4 h-4" />
          {t("research.graph.sidebar.library.coreRuntime")}
        </div>
        <div className="grid gap-2.5">
          {[
            {
              label: t("research.graph.sidebar.library.activeModules"),
              value: pluginSummary.installedCount,
            },
            {
              label: t("research.graph.sidebar.library.catalogItems"),
              value: pluginSummary.catalogCount,
            },
            {
              label: t("research.graph.sidebar.library.schemaTemplates"),
              value: pluginSummary.templateCount,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5"
            >
              <span className="text-[11px] font-medium text-muted-foreground">
                {stat.label}
              </span>
              <span className="text-[13px] font-black">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>
      <Button
        variant="outline"
        className="w-full h-9 text-[11px] font-black uppercase tracking-widest border-white/10 hover:bg-white/5"
        onClick={pluginSummary.onReload}
        disabled={pluginSummary.isLoading}
      >
        {pluginSummary.isLoading
          ? t("research.graph.sidebar.library.syncing")
          : t("research.graph.sidebar.library.reloadEnvironment")}
      </Button>
    </div>
  );
}
