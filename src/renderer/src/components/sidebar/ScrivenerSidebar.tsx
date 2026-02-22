import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ChevronRight,
    ChevronDown,
    Plus,
} from "lucide-react";
import { cn } from "../../../../shared/types/utils";
import DocsSidebar from "./DocsSidebar";
import { TrashList } from "../trash/TrashList";
import { SnapshotList } from "../snapshot/SnapshotList";
import SidebarCharacterList from "./sections/SidebarCharacterList";
import SidebarWorldList from "./sections/SidebarWorldList";
import SidebarMemoList from "./sections/SidebarMemoList";

interface ScrivenerSidebarProps {
    currentProjectId?: string;
}

type SectionId = "manuscript" | "characters" | "world" | "scrap" | "snapshots" | "trash" | "analysis";

import { useUIStore } from "../../stores/uiStore";
import { useChapterManagement } from "../../hooks/useChapterManagement";

export default function ScrivenerSidebar({
    currentProjectId,
}: ScrivenerSidebarProps) {
    const { t } = useTranslation();
    const { handleAddChapter, activeChapterId } = useChapterManagement();


    // Track expanded sections
    const [expanded, setExpanded] = useState<Record<SectionId, boolean>>({
        manuscript: true,
        characters: true, // Default open for visibility
        world: false,
        scrap: false,
        snapshots: false,
        analysis: false,
        trash: false,
    });

    const toggleSection = (id: SectionId) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="flex flex-col h-full w-full bg-sidebar select-none overflow-hidden text-sm">
            {/* Top Header - maybe "Explorer"? Optional. */}
            <div className="px-4 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-sidebar shadow-sm shrink-0 z-10">
                {t("sidebar.explorerTitle") || "Explorer"}
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {/* MANUSCRIPT SECTION */}
                <CollapsibleSection
                    id="manuscript"
                    title={t("sidebar.section.manuscript")}
                    isOpen={expanded.manuscript}
                    onToggle={() => toggleSection("manuscript")}
                    actions={
                        <button
                            className="p-0.5 hover:bg-white/10 rounded"
                            onClick={(e) => { e.stopPropagation(); void handleAddChapter(); }}
                            title={t("sidebar.action.new")}
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    }
                >
                    <DocsSidebar hideHeader={true} />
                </CollapsibleSection>

                {/* CHARACTERS SECTION */}
                <CollapsibleSection
                    id="characters"
                    title={t("research.title.characters")}
                    isOpen={expanded.characters}
                    onToggle={() => toggleSection("characters")}
                >
                    <SidebarCharacterList />
                </CollapsibleSection>

                {/* WORLD SECTION */}
                <CollapsibleSection
                    id="world"
                    title={t("research.title.world")}
                    isOpen={expanded.world}
                    onToggle={() => toggleSection("world")}
                >
                    <SidebarWorldList />
                </CollapsibleSection>

                {/* SCRAP SECTION */}
                <CollapsibleSection
                    id="scrap"
                    title={t("research.title.scrap")}
                    isOpen={expanded.scrap}
                    onToggle={() => toggleSection("scrap")}
                >
                    <div className="h-64 border-b border-border/10">
                        <SidebarMemoList />
                    </div>
                </CollapsibleSection>

                {/* SNAPSHOTS SECTION */}
                <CollapsibleSection
                    id="snapshots"
                    title={t("sidebar.section.snapshot")}
                    isOpen={expanded.snapshots}
                    onToggle={() => toggleSection("snapshots")}
                >
                    <div className="h-64 border-b border-border/10">
                        {activeChapterId ? (
                            <SnapshotList chapterId={activeChapterId} />
                        ) : (
                            <div className="p-4 text-xs text-muted text-center italic">{t("snapshot.noActiveChapter")}</div>
                        )}
                    </div>
                </CollapsibleSection>

                {/* ANALYSIS SECTION */}
                <CollapsibleSection
                    id="analysis"
                    title={t("research.title.analysis")}
                    isOpen={expanded.analysis} // Need to add to state
                    onToggle={() => toggleSection("analysis")}
                >
                    <div className="flex flex-col h-full bg-sidebar/50">
                        <button
                            onClick={() => useUIStore.getState().setMainView({ type: "analysis" })}
                            className="px-3 py-2 text-xs text-left hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500/50"></span>
                            {t("research.title.analysis")}
                        </button>
                        {/* Could list recent analysis items here if store supports it */}
                    </div>
                </CollapsibleSection>

                {/* TRASH SECTION */}
                <CollapsibleSection
                    id="trash"
                    title={t("sidebar.section.trash")}
                    isOpen={expanded.trash}
                    onToggle={() => toggleSection("trash")}
                >
                    {currentProjectId && <TrashList projectId={currentProjectId} refreshKey={0} />}
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
    children
}: {
    id: SectionId;
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    actions?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col border-b border-border/20">
            <div
                className="flex items-center px-1 py-1 cursor-pointer hover:bg-white/5 transition-colors group"
                onClick={onToggle}
            >
                <div className="p-0.5 text-muted-foreground group-hover:text-foreground">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
                <div className="font-bold text-[11px] uppercase tracking-wide text-foreground/80 group-hover:text-foreground flex-1 truncate">
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
                    isOpen ? "h-auto opacity-100" : "h-0 opacity-0"
                )}
            >
                <div className="pb-1">
                    {children}
                </div>
            </div>
        </div>
    );
}
