import {
  Archive,
  Box,
  Download,
  LayoutTemplate,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";
import { useGraphPluginStore } from "@renderer/features/research/stores/graphPluginStore";

export function LibrarySidebarContent() {
  const { t } = useTranslation();
  const installed = useGraphPluginStore((state) => state.installed);
  const catalog = useGraphPluginStore((state) => state.catalog);
  const templates = useGraphPluginStore((state) => state.templates);
  const isLoading = useGraphPluginStore((state) => state.isLoading);
  const error = useGraphPluginStore((state) => state.error);

  return (
    <div className="flex h-full flex-col overflow-y-auto pb-8">
      <SidebarTreeSection
        title={t("world.graph.ide.sidebar.library.title", "Plugin Library")}
        actionIcon={<Archive className="h-3.5 w-3.5" />}
      >
        <TreeItem
          icon={<Box className="h-[14px] w-[14px] text-indigo-400/80" />}
          label={t("world.graph.ide.sidebar.library.installed", `설치됨 ${installed.length}`)}
        />
        <TreeItem
          icon={<Download className="h-[14px] w-[14px] text-sky-400/80" />}
          label={t("world.graph.ide.sidebar.library.available", `카탈로그 ${catalog.length}`)}
        />
        <TreeItem
          icon={<LayoutTemplate className="h-[14px] w-[14px] text-emerald-400/80" />}
          label={t("world.graph.ide.sidebar.library.templates", `템플릿 ${templates.length}`)}
        />
      </SidebarTreeSection>
      <div className="px-3 pt-3 text-[11px] leading-5 text-muted-foreground/70">
        {error
          ? error
          : isLoading
            ? t("loading")
            : t(
                "world.graph.ide.sidebar.library.scope",
                "설치 범위는 앱 전역이며 적용 시 현재 그래프 레이어를 교체합니다.",
              )}
      </div>
    </div>
  );
}
