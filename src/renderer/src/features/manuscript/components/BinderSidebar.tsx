import { useCallback, Suspense, type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { User, Globe, StickyNote, Sparkles, History, Trash2, ChevronLeft, X } from "lucide-react";
import React from 'react';
import { Panel, Separator as PanelResizeHandle, type PanelSize } from "react-resizable-panels";
import { cn } from "@shared/types/utils";
import { useUIStore, type DocsRightTab } from "@renderer/features/workspace/stores/uiStore";
import { DraggableItem } from "@shared/ui/DraggableItem";
import type { DragItemType } from "@shared/ui/GlobalDragContext";
import FocusHoverSidebar from "@renderer/features/manuscript/components/FocusHoverSidebar";

const ResearchPanel = React.lazy(() => import("@renderer/features/research/components/ResearchPanel"));
const WorldPanel = React.lazy(() => import("@renderer/features/research/components/WorldPanel"));
const SnapshotList = React.lazy(() => import("@renderer/features/snapshot/components/SnapshotList").then((m) => ({ default: m.SnapshotList })));
const TrashList = React.lazy(() => import("@renderer/features/trash/components/TrashList").then((m) => ({ default: m.TrashList })));

type BinderTab = Exclude<DocsRightTab, null | "editor" | "export">;

interface BinderSidebarProps {
    activeChapterId?: string;
    currentProjectId?: string;
    sidebarTopOffset: number;
}

export function BinderSidebar({ activeChapterId, currentProjectId, sidebarTopOffset }: BinderSidebarProps) {
    const { t } = useTranslation();
    const { docsRightTab, setDocsRightTab, sidebarWidths, setSidebarWidth } = useUIStore();
    const [containerWidth, setContainerWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setContainerWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const VALID_TABS: BinderTab[] = ["character", "world", "scrap", "analysis", "snapshot", "trash"];
    const activeRightTab: BinderTab | null =
        docsRightTab && VALID_TABS.includes(docsRightTab as BinderTab)
            ? (docsRightTab as BinderTab)
            : null;

    const setActiveRightTab = useCallback(
        (tab: BinderTab | null) => {
            setDocsRightTab(tab);
        },
        [setDocsRightTab]
    );

    const handleRightTabClick = useCallback(
        (tab: BinderTab) => {
            setActiveRightTab(activeRightTab === tab ? null : tab);
        },
        [activeRightTab, setActiveRightTab]
    );

    const getPercentage = useCallback((panelSize: PanelSize): number => {
        if (typeof panelSize === "number") {
            return panelSize;
        }
        const parsed = typeof panelSize === "string" ? Number.parseFloat(panelSize) : Number(panelSize);
        return Number.isFinite(parsed) ? parsed : 0;
    }, []);

    const handleResize = useCallback(
        (panelSize: PanelSize) => {
            if (!activeRightTab) return;
            const percentage = getPercentage(panelSize);
            const pxWidth = (percentage / 100) * containerWidth;
            setSidebarWidth(activeRightTab, Math.round(pxWidth));
        },
        [activeRightTab, containerWidth, getPercentage, setSidebarWidth]
    );

    const savedPxWidth = activeRightTab ? sidebarWidths[activeRightTab] || 350 : 350;
    const defaultPercentage = (savedPxWidth / containerWidth) * 100;

    const handleBackToSnapshotList = () => {
        setActiveRightTab("snapshot");
    };

    const renderIconBar = () => (
        <div className="w-12 bg-surface border-l border-border flex flex-col items-center py-3 gap-2 shrink-0 z-20 h-full">
            <BinderTabButton
                icon={<User className="w-5 h-5" />}
                isActive={activeRightTab === "character"}
                onClick={() => handleRightTabClick("character")}
                title={t("research.title.characters")}
                type="character"
            />
            <BinderTabButton
                icon={<Globe className="w-5 h-5" />}
                isActive={activeRightTab === "world"}
                onClick={() => handleRightTabClick("world")}
                title={t("research.title.world")}
                type="world"
            />
            <BinderTabButton
                icon={<StickyNote className="w-5 h-5" />}
                isActive={activeRightTab === "scrap"}
                onClick={() => handleRightTabClick("scrap")}
                title={t("research.title.scrap")}
                type="memo"
            />
            <BinderTabButton
                icon={<Sparkles className="w-5 h-5" />}
                isActive={activeRightTab === "analysis"}
                onClick={() => handleRightTabClick("analysis")}
                title={t("research.title.analysis")}
                type="analysis"
            />
            <div className="w-6 h-px bg-border/50 my-1" />
            <BinderTabButton
                icon={<History className="w-5 h-5" />}
                isActive={activeRightTab === "snapshot"}
                onClick={() => handleRightTabClick("snapshot")}
                title={t("sidebar.section.snapshot")}
                type="snapshot"
            />
            <BinderTabButton
                icon={<Trash2 className="w-5 h-5" />}
                isActive={activeRightTab === "trash"}
                onClick={() => handleRightTabClick("trash")}
                title={t("sidebar.section.trash")}
                type="trash"
            />
        </div>
    );

    if (!activeRightTab) {
        return (
            <FocusHoverSidebar side="right" topOffset={sidebarTopOffset}>
                <div className="h-full flex flex-row shadow-2xl">
                    {renderIconBar()}
                </div>
            </FocusHoverSidebar>
        );
    }

    return (
        <>
            <PanelResizeHandle className="w-1 shrink-0 bg-border/40 hover:bg-accent focus-visible:bg-accent transition-colors cursor-col-resize z-20 relative">
                <div className="absolute inset-y-0 -left-1 -right-1" />
            </PanelResizeHandle>

            <Panel
                id="binder-sidebar"
                defaultSize={defaultPercentage}
                minSize={250}
                maxSize={800}
                onResize={handleResize}
                className="bg-panel shadow-2xl flex flex-row shrink-0 min-w-0 z-10 transition-none"
            >
                <div className="flex-1 h-full overflow-hidden relative min-w-0">
                    <button
                        onClick={() => setActiveRightTab(null)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-surface/80 backdrop-blur-sm border border-border/50 text-muted hover:text-fg hover:bg-surface z-50 shadow-sm transition-all hover:opacity-100"
                        title={t("sidebar.toggle.close")}
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {activeRightTab === 'snapshot' && (
                        <button
                            onClick={handleBackToSnapshotList}
                            className="absolute top-2 left-3 p-1.5 rounded-full bg-surface/80 backdrop-blur-sm border border-border/50 text-muted hover:text-fg hover:bg-surface z-50 shadow-sm transition-all"
                            title={t("common.back")}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    )}

                    <div className="flex-1 overflow-hidden pt-4 h-full">
                        <Suspense
                            fallback={
                                <div className="p-4 text-sm text-muted">
                                    {t("common.loading")}
                                </div>
                            }
                        >
                            {activeRightTab === "character" && (
                                <ResearchPanel
                                    activeTab="character"
                                    onClose={() => setActiveRightTab(null)}
                                />
                            )}
                            {activeRightTab === "world" && (
                                <WorldPanel onClose={() => setActiveRightTab(null)} />
                            )}
                            {activeRightTab === "scrap" && (
                                <ResearchPanel
                                    activeTab="scrap"
                                    onClose={() => setActiveRightTab(null)}
                                />
                            )}
                            {activeRightTab === "analysis" && (
                                <ResearchPanel
                                    activeTab="analysis"
                                    onClose={() => setActiveRightTab(null)}
                                />
                            )}
                            {activeRightTab === "snapshot" &&
                                (activeChapterId ? (
                                    <SnapshotList chapterId={activeChapterId} />
                                ) : (
                                    <div className="p-4 text-xs text-muted italic text-center">
                                        {t("snapshot.list.selectChapter")}
                                    </div>
                                ))}
                            {activeRightTab === "trash" &&
                                (currentProjectId ? (
                                    <TrashList projectId={currentProjectId} refreshKey={0} />
                                ) : (
                                    <div className="p-4 text-xs text-muted italic text-center">
                                        {t("sidebar.trashEmpty")}
                                    </div>
                                ))}
                        </Suspense>
                    </div>
                </div>

                {renderIconBar()}
            </Panel >
        </>
    );
}

function BinderTabButton({
    icon,
    isActive,
    onClick,
    title,
    type,
}: {
    icon: ReactNode;
    isActive: boolean;
    onClick: () => void;
    title: string;
    type?: DragItemType;
}) {
    const button = (
        <button
            onClick={onClick}
            title={title}
            className={cn(
                "w-9 h-9 flex items-center justify-center rounded-full transition-colors",
                isActive
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                    : "text-muted hover:text-fg hover:bg-black/5 dark:hover:bg-white/5"
            )}
        >
            {icon}
        </button>
    );

    if (type) {
        return (
            <DraggableItem
                id={`binder-icon-${type}`}
                data={{ type, id: `binder-${type}`, title }}
                className="flex items-center justify-center"
            >
                {button}
            </DraggableItem>
        );
    }

    return button;
}
