import { useCallback, useMemo, Suspense, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { User, Globe, StickyNote, Sparkles, History, Trash2, ChevronLeft, X } from "lucide-react";
import React from 'react';
import { Panel, Separator as PanelResizeHandle, type PanelSize } from "react-resizable-panels";
import { cn } from "@shared/types/utils";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useShallow } from "zustand/react/shallow";
import { DraggableItem } from "@shared/ui/DraggableItem";
import type { DragItemType } from "@shared/ui/GlobalDragContext";
import FocusHoverSidebar from "@renderer/features/manuscript/components/FocusHoverSidebar";
import {
    clampSidebarWidth,
    getSidebarDefaultWidth,
    getSidebarWidthConfig,
    toPxSize,
} from "@shared/constants/sidebarSizing";
import { useSidebarResizeCommit } from "@renderer/features/workspace/hooks/useSidebarResizeCommit";

const ResearchPanel = React.lazy(() => import("@renderer/features/research/components/ResearchPanel"));
const WorldPanel = React.lazy(() => import("@renderer/features/research/components/WorldPanel"));
const SnapshotList = React.lazy(() => import("@renderer/features/snapshot/components/SnapshotList").then((m) => ({ default: m.SnapshotList })));
const TrashList = React.lazy(() => import("@renderer/features/trash/components/TrashList").then((m) => ({ default: m.TrashList })));

type BinderTab = "character" | "world" | "scrap" | "analysis" | "snapshot" | "trash";

interface BinderSidebarProps {
    activeChapterId?: string;
    currentProjectId?: string;
    sidebarTopOffset: number;
}

const EDITOR_TAB_WIDTH_FEATURE_MAP = {
    character: "editorCharacter",
    world: "editorWorld",
    scrap: "editorScrap",
    analysis: "editorAnalysis",
    snapshot: "editorSnapshot",
    trash: "editorTrash",
} as const;

export function BinderSidebar({ activeChapterId, currentProjectId, sidebarTopOffset: _sidebarTopOffset }: BinderSidebarProps) {
    const { t } = useTranslation();
    const {
        docsRightTab,
        rightPanelOpen,
        rightPanelActiveTab,
        isRightRailOpen,
        openRightPanelTab,
        closeRightPanel,
        setRegionOpen,
        sidebarWidths,
        setSidebarWidth,
        setFocusedClosableTarget,
        hasHydrated,
    } = useUIStore(
        useShallow((state) => ({
            docsRightTab: state.docsRightTab,
            rightPanelOpen: state.regions.rightPanel.open,
            rightPanelActiveTab: state.regions.rightPanel.activeTab,
            isRightRailOpen: state.regions.rightRail.open,
            openRightPanelTab: state.openRightPanelTab,
            closeRightPanel: state.closeRightPanel,
            setRegionOpen: state.setRegionOpen,
            sidebarWidths: state.sidebarWidths,
            setSidebarWidth: state.setSidebarWidth,
            setFocusedClosableTarget: state.setFocusedClosableTarget,
            hasHydrated: state.hasHydrated,
        }))
    );

    const VALID_TABS: BinderTab[] = ["character", "world", "scrap", "analysis", "snapshot", "trash"];
    const activeTabCandidate = rightPanelOpen
        ? (docsRightTab ?? rightPanelActiveTab)
        : null;
    const activeRightTab: BinderTab | null =
        activeTabCandidate && VALID_TABS.includes(activeTabCandidate as BinderTab)
            ? (activeTabCandidate as BinderTab)
            : null;

    const setActiveRightTab = useCallback(
        (tab: BinderTab | null) => {
            if (tab === null) {
                closeRightPanel();
                return;
            }
            openRightPanelTab(tab);
        },
        [closeRightPanel, openRightPanelTab]
    );

    const handleCharacterResize = useSidebarResizeCommit("editorCharacter", setSidebarWidth);
    const handleWorldResize = useSidebarResizeCommit("editorWorld", setSidebarWidth);
    const handleScrapResize = useSidebarResizeCommit("editorScrap", setSidebarWidth);
    const handleAnalysisResize = useSidebarResizeCommit("editorAnalysis", setSidebarWidth);
    const handleSnapshotResize = useSidebarResizeCommit("editorSnapshot", setSidebarWidth);
    const handleTrashResize = useSidebarResizeCommit("editorTrash", setSidebarWidth);

    const rightTabResizeHandlers: Record<BinderTab, (panelSize: PanelSize) => void> = useMemo(() => ({
        character: handleCharacterResize,
        world: handleWorldResize,
        scrap: handleScrapResize,
        analysis: handleAnalysisResize,
        snapshot: handleSnapshotResize,
        trash: handleTrashResize,
    }), [
        handleCharacterResize,
        handleWorldResize,
        handleScrapResize,
        handleAnalysisResize,
        handleSnapshotResize,
        handleTrashResize,
    ]);

    const handleRightTabClick = useCallback(
        (tab: BinderTab) => {
            setFocusedClosableTarget({ kind: "docs-tab" });
            setActiveRightTab(activeRightTab === tab ? null : tab);
        },
        [activeRightTab, setActiveRightTab, setFocusedClosableTarget]
    );

    const handleResize = useCallback(
        (panelSize: PanelSize) => {
            if (!activeRightTab) return;
            rightTabResizeHandlers[activeRightTab](panelSize);
        },
        [activeRightTab, rightTabResizeHandlers]
    );

    const savedPxWidth = activeRightTab
        ? clampSidebarWidth(
            EDITOR_TAB_WIDTH_FEATURE_MAP[activeRightTab],
            sidebarWidths[EDITOR_TAB_WIDTH_FEATURE_MAP[activeRightTab]]
            || getSidebarDefaultWidth(EDITOR_TAB_WIDTH_FEATURE_MAP[activeRightTab]),
        )
        : getSidebarDefaultWidth("editorCharacter");

    const panelMountKey = activeRightTab
        ? `binder-sidebar-${activeRightTab}-${hasHydrated ? "hydrated" : "cold"}`
        : null;
    const panelDefaultSize = useMemo(
        () => toPxSize(savedPxWidth),
        [panelMountKey],
    );
    const widthConfig = getSidebarWidthConfig(
        activeRightTab ? EDITOR_TAB_WIDTH_FEATURE_MAP[activeRightTab] : "editorCharacter",
    );

    const handleBackToSnapshotList = () => {
        setActiveRightTab("snapshot");
    };

    const renderIconBar = () => (
        <div className="w-12 bg-surface border-l border-border flex flex-col items-center py-3 gap-2 shrink-0 z-20 h-full">
            <button
                onClick={() => setRegionOpen("rightRail", false)}
                className="w-8 h-8 mb-1 rounded-full hover:bg-surface-hover text-muted-foreground flex items-center justify-center"
                title={t("sidebar.toggle.close")}
            >
                <ChevronLeft className="w-4 h-4 rotate-180" />
            </button>
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

    if (!activeRightTab) return null;

    return (
        <>
            <PanelResizeHandle className="w-1 shrink-0 bg-border/40 hover:bg-accent focus-visible:bg-accent transition-colors cursor-col-resize z-20 relative">
                <div className="absolute inset-y-0 -left-1 -right-1" />
            </PanelResizeHandle>

            <Panel
                key={panelMountKey}
                id={`binder-sidebar-${activeRightTab}`}
                defaultSize={panelDefaultSize}
                minSize={toPxSize(widthConfig.minPx)}
                maxSize={toPxSize(widthConfig.maxPx)}
                onResize={handleResize}
                onMouseDownCapture={() => {
                    setFocusedClosableTarget({ kind: "docs-tab" });
                }}
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
                            title={t("back")}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    )}

                    <div className="flex-1 overflow-hidden pt-4 h-full">
                        <Suspense
                            fallback={
                                <div className="p-4 text-sm text-muted">
                                    {t("loading")}
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

                {isRightRailOpen ? (
                    renderIconBar()
                ) : (
                    <div className="w-8 bg-surface border-l border-border flex items-start justify-center py-3 shrink-0">
                        <button
                            onClick={() => setRegionOpen("rightRail", true)}
                            className="w-6 h-6 rounded-md hover:bg-surface-hover text-muted-foreground flex items-center justify-center"
                            title={t("sidebar.toggle.open")}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </Panel >
        </>
    );
}

export function BinderSidebarRail({ sidebarTopOffset }: { sidebarTopOffset: number }) {
    const { t } = useTranslation();
    const {
        docsRightTab,
        rightPanelOpen,
        rightPanelActiveTab,
        isRightRailOpen,
        openRightPanelTab,
        setRegionOpen,
        setFocusedClosableTarget,
    } = useUIStore(
        useShallow((state) => ({
            docsRightTab: state.docsRightTab,
            rightPanelOpen: state.regions.rightPanel.open,
            rightPanelActiveTab: state.regions.rightPanel.activeTab,
            isRightRailOpen: state.regions.rightRail.open,
            openRightPanelTab: state.openRightPanelTab,
            setRegionOpen: state.setRegionOpen,
            setFocusedClosableTarget: state.setFocusedClosableTarget,
        }))
    );

    const VALID_TABS: BinderTab[] = ["character", "world", "scrap", "analysis", "snapshot", "trash"];
    const activeTabCandidate = rightPanelOpen
        ? (docsRightTab ?? rightPanelActiveTab)
        : null;
    const activeRightTab: BinderTab | null =
        activeTabCandidate && VALID_TABS.includes(activeTabCandidate as BinderTab)
            ? (activeTabCandidate as BinderTab)
            : null;

    if (activeRightTab) return null;

    const handleRightTabClick = (tab: BinderTab) => {
        setFocusedClosableTarget({ kind: "docs-tab" });
        openRightPanelTab(tab);
    };

    if (!isRightRailOpen) {
        return (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center">
                <button
                    onClick={() => setRegionOpen("rightRail", true)}
                    className="w-8 h-12 bg-background border border-r-0 border-border shadow-md rounded-l-lg flex items-center justify-center hover:bg-surface-hover transition-colors text-muted-foreground"
                    title={t("sidebar.toggle.open")}
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
            </div>
        );
    }

    return (
        <FocusHoverSidebar side="right" topOffset={sidebarTopOffset}>
            <div className="h-full flex flex-row shadow-2xl">
                <div className="w-12 bg-surface border-l border-border flex flex-col items-center py-3 gap-2 shrink-0 z-20 h-full">
                    <button
                        onClick={() => setRegionOpen("rightRail", false)}
                        className="w-8 h-8 mb-1 rounded-full hover:bg-surface-hover text-muted-foreground flex items-center justify-center"
                        title={t("sidebar.toggle.close")}
                    >
                        <ChevronLeft className="w-4 h-4 rotate-180" />
                    </button>
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
            </div>
        </FocusHoverSidebar>
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
