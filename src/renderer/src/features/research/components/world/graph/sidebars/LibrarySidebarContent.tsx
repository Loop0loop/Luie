import { Archive, BookOpenText, Boxes, CalendarRange, LibraryBig, Map, Network, NotebookPen, Route } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useGraphIdeStore } from "@renderer/features/research/stores/graphIdeStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";
import { useWorldLibrarySummary } from "../hooks/useWorldLibrarySummary";
import type { LibrarySummaryEntryId } from "../utils/worldGraphIdeViewModels";
import { useGraphPluginLibraryData } from "../views/plugin/useGraphPluginLibraryData";

const ENTRY_ICONS: Record<LibrarySummaryEntryId, typeof Network> = {
  graph: Network,
  timeline: CalendarRange,
  notes: NotebookPen,
  entity: Boxes,
  synopsis: BookOpenText,
  plot: Route,
  drawing: Map,
  mindmap: LibraryBig,
};

export function LibrarySidebarContent() {
  const { t } = useTranslation();
  const setActiveTab = useGraphIdeStore((state) => state.setActiveTab);
  const setWorldTab = useUIStore((state) => state.setWorldTab);
  const { entries, error, isLoading } = useWorldLibrarySummary();
  const activeTab = useGraphIdeStore((state) => state.activeTab);
  const { installed, templates, error: pluginError } = useGraphPluginLibraryData({
    enabled: activeTab === "library",
  });

  const handleOpenEntry = (entryId: LibrarySummaryEntryId) => {
    switch (entryId) {
      case "graph":
      case "timeline":
      case "entity":
        setActiveTab(entryId);
        return;
      case "notes":
        setActiveTab("note");
        return;
      case "synopsis":
      case "plot":
      case "drawing":
      case "mindmap":
        setWorldTab(entryId);
        return;
    }
  };

  const graphEntries = entries.filter((entry) =>
    entry.id === "graph" ||
    entry.id === "timeline" ||
    entry.id === "notes" ||
    entry.id === "entity",
  );
  const documentEntries = entries.filter((entry) =>
    entry.id === "synopsis" ||
    entry.id === "plot" ||
    entry.id === "drawing" ||
    entry.id === "mindmap",
  );

  const pluginSummaryLabel = useMemo(
    () => `Bundles · ${installed.length} / Templates · ${templates.length}`,
    [installed.length, templates.length],
  );

  const renderEntry = (entry: (typeof entries)[number]) => {
    const Icon = ENTRY_ICONS[entry.id] ?? Archive;
    return (
      <TreeItem
        key={entry.id}
        icon={<Icon className="h-[14px] w-[14px] text-indigo-400/70" />}
        label={`${entry.title} · ${entry.badge}`}
        onClick={() => handleOpenEntry(entry.id)}
      />
    );
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <SidebarTreeSection
        title={t("world.graph.ide.sidebar.library.graphWorkspace", "Graph Workspace")}
        actionIcon={<Network className="h-3.5 w-3.5" />}
      >
        {isLoading ? (
          <p className="px-2 py-1.5 text-[11px] text-muted-foreground/50">
            {t("world.graph.library.loading", "문서 상태를 불러오는 중입니다...")}
          </p>
        ) : (
          graphEntries.map(renderEntry)
        )}
      </SidebarTreeSection>

      <SidebarTreeSection
        title={t("world.graph.ide.sidebar.library.documents", "World Documents")}
        actionIcon={<LibraryBig className="h-3.5 w-3.5" />}
      >
        {error ? (
          <p className="px-2 py-1.5 text-[11px] text-destructive/80">{error}</p>
        ) : isLoading ? null : (
          documentEntries.map(renderEntry)
        )}
      </SidebarTreeSection>

      <SidebarTreeSection
        title="Plugins"
        actionIcon={<LibraryBig className="h-3.5 w-3.5" />}
      >
        {pluginError ? (
          <p className="px-2 py-1.5 text-[11px] text-destructive/80">{pluginError}</p>
        ) : (
          <>
            <TreeItem
              icon={<Archive className="h-[14px] w-[14px] text-indigo-400/70" />}
              label={pluginSummaryLabel}
            />
          </>
        )}
      </SidebarTreeSection>
    </div>
  );
}
