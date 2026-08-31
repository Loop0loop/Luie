import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, ChevronDown, Plus } from "lucide-react";
import { cn } from "@shared/types/utils";
import DocsSidebar from "@renderer/features/manuscript/components/DocsSidebar";
import SidebarCharacterList from "@renderer/features/manuscript/components/sections/SidebarCharacterList";
import SidebarEventList from "@renderer/features/manuscript/components/sections/SidebarEventList";
import SidebarFactionList from "@renderer/features/manuscript/components/sections/SidebarFactionList";
import SidebarWorldList from "@renderer/features/manuscript/components/sections/SidebarWorldList";
import SidebarMemoList from "@renderer/features/manuscript/components/sections/SidebarMemoList";

interface ScrivenerSidebarProps {
  currentProjectId?: string;
}

import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useChapterManagement } from "@renderer/features/manuscript/hooks/useChapterManagement";
import { useShallow } from "zustand/react/shallow";
import type { ScrivenerSectionId } from "@renderer/features/workspace/stores/uiStore";

const SnapshotList = lazy(() =>
  import("@renderer/features/snapshot/components/SnapshotList").then(
    (module) => ({
      default: module.SnapshotList,
    }),
  ),
);
const TrashList = lazy(() =>
  import("@renderer/features/trash/components/TrashList").then((module) => ({
    default: module.TrashList,
  })),
);

export default function ScrivenerSidebar({
  currentProjectId,
}: ScrivenerSidebarProps) {
  const { t } = useTranslation();
  const { handleAddChapter, activeChapterId } = useChapterManagement();
  const { scrivenerSections, setScrivenerSectionOpen } = useUIStore(
    useShallow((state) => ({
      scrivenerSections: state.scrivenerSections,
      setScrivenerSectionOpen: state.setScrivenerSectionOpen,
    })),
  );

  const toggleSection = (id: ScrivenerSectionId) => {
    setScrivenerSectionOpen(id, !scrivenerSections[id]);
  };

  return (
    <div className="flex flex-col h-full w-full bg-sidebar select-none overflow-hidden text-sm">
      <div className="px-4 py-2 text-xs font-semibold text-muted bg-sidebar shadow-sm shrink-0 z-10">
        {t("sidebar.explorerTitle") || "Explorer"}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <CollapsibleSection
          id="manuscript"
          title={t("sidebar.section.manuscript")}
          isOpen={scrivenerSections.manuscript}
          onToggle={() => toggleSection("manuscript")}
          actions={
            <button
              className="p-0.5 hover:bg-white/10 rounded"
              onClick={(e) => {
                e.stopPropagation();
                void handleAddChapter();
              }}
              title={t("sidebar.action.new")}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          }
        >
          <DocsSidebar hideHeader={true} />
        </CollapsibleSection>

        <CollapsibleSection
          id="characters"
          title={t("research.title.characters")}
          isOpen={scrivenerSections.characters}
          onToggle={() => toggleSection("characters")}
        >
          <SidebarCharacterList />
        </CollapsibleSection>

        <CollapsibleSection
          id="events"
          title={t("research.title.events")}
          isOpen={scrivenerSections.events}
          onToggle={() => toggleSection("events")}
        >
          <SidebarEventList />
        </CollapsibleSection>

        <CollapsibleSection
          id="factions"
          title={t("research.title.factions")}
          isOpen={scrivenerSections.factions}
          onToggle={() => toggleSection("factions")}
        >
          <SidebarFactionList />
        </CollapsibleSection>

        <CollapsibleSection
          id="world"
          title={t("research.title.plotBoard")}
          isOpen={scrivenerSections.world}
          onToggle={() => toggleSection("world")}
        >
          <SidebarWorldList mode="plotboard" />
        </CollapsibleSection>

        <CollapsibleSection
          id="scrap"
          title={t("research.title.scrap")}
          isOpen={scrivenerSections.scrap}
          onToggle={() => toggleSection("scrap")}
        >
          <div className="max-h-80 border-b border-border">
            <SidebarWorldList mode="scrap" />
          </div>
          <div className="max-h-80 border-b border-border">
            <SidebarMemoList />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          id="snapshots"
          title={t("sidebar.section.snapshot")}
          isOpen={scrivenerSections.snapshots}
          onToggle={() => toggleSection("snapshots")}
        >
          <div className="h-64 border-b border-border">
            {activeChapterId ? (
              <Suspense
                fallback={
                  <div className="p-4 text-xs text-muted">{t("loading")}</div>
                }
              >
                <SnapshotList chapterId={activeChapterId} />
              </Suspense>
            ) : (
              <div className="p-4 text-xs text-muted text-center italic">
                {t("snapshot.noActiveChapter")}
              </div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          id="analysis"
          title={t("research.title.untitled")}
          isOpen={scrivenerSections.analysis}
          onToggle={() => toggleSection("analysis")}
        >
          <SidebarWorldList mode="untitled" />
        </CollapsibleSection>

        <CollapsibleSection
          id="trash"
          title={t("sidebar.section.trash")}
          isOpen={scrivenerSections.trash}
          onToggle={() => toggleSection("trash")}
        >
          {currentProjectId && (
            <Suspense
              fallback={
                <div className="p-4 text-xs text-muted">{t("loading")}</div>
              }
            >
              <TrashList projectId={currentProjectId} refreshKey={0} />
            </Suspense>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  actions,
  children,
}: {
  id: ScrivenerSectionId;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col border-b border-border">
      <div
        className="flex items-center px-1 py-1 cursor-pointer hover:bg-white/5 transition-colors group"
        onClick={onToggle}
      >
        <div className="p-0.5 text-muted group-hover:text-fg">
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
        <div className="font-semibold text-xs text-fg/80 group-hover:text-fg flex-1 truncate">
          {title}
        </div>
        {actions && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            {actions}
          </div>
        )}
      </div>

      <div
        className={cn(
          "overflow-hidden transition-[height,opacity] duration-200 ease-in-out",
          isOpen ? "h-auto opacity-100" : "h-0 opacity-0",
        )}
      >
        <div className="pb-1">{children}</div>
      </div>
    </div>
  );
}
