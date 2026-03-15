import { Archive, Boxes, CalendarRange, Network, NotebookPen } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useGraphIdeStore } from "@renderer/features/research/stores/graphIdeStore";
import { useGraphPluginStore } from "@renderer/features/research/stores/graphPluginStore";
import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";

export function LibrarySidebarContent() {
  const { t } = useTranslation();
  const setActiveTab = useGraphIdeStore((state) => state.setActiveTab);
  const installed = useGraphPluginStore((state) => state.installed);
  const templates = useGraphPluginStore((state) => state.templates);
  const pluginError = useGraphPluginStore((state) => state.error);

  const pluginSummaryLabel = useMemo(
    () => `Bundles · ${installed.length} / Templates · ${templates.length}`,
    [installed.length, templates.length],
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <SidebarTreeSection
        title={t("world.graph.ide.sidebar.library.graphWorkspace", "Workspace")}
        actionIcon={<Network className="h-3.5 w-3.5" />}
      >
        <TreeItem
          icon={<Network className="h-[14px] w-[14px] text-indigo-400/70" />}
          label={t("world.graph.ide.title.graph", "그래프")}
          onClick={() => setActiveTab("graph")}
        />
        <TreeItem
          icon={<CalendarRange className="h-[14px] w-[14px] text-indigo-400/70" />}
          label={t("world.graph.ide.title.timeline", "타임라인")}
          onClick={() => setActiveTab("timeline")}
        />
        <TreeItem
          icon={<NotebookPen className="h-[14px] w-[14px] text-indigo-400/70" />}
          label={t("world.graph.ide.title.note", "노트")}
          onClick={() => setActiveTab("note")}
        />
        <TreeItem
          icon={<Boxes className="h-[14px] w-[14px] text-indigo-400/70" />}
          label={t("world.graph.ide.title.entity", "엔티티")}
          onClick={() => setActiveTab("entity")}
        />
      </SidebarTreeSection>

      <SidebarTreeSection
        title="Plugins"
        actionIcon={<Archive className="h-3.5 w-3.5" />}
      >
        {pluginError ? (
          <p className="px-2 py-1.5 text-[11px] text-destructive/80">{pluginError}</p>
        ) : (
          <TreeItem
            icon={<Archive className="h-[14px] w-[14px] text-indigo-400/70" />}
            label={pluginSummaryLabel}
          />
        )}
      </SidebarTreeSection>
    </div>
  );
}
