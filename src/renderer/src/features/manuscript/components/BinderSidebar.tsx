import { useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import { PanelRightOpen } from "lucide-react";
import FocusHoverSidebar from "@renderer/features/manuscript/components/FocusHoverSidebar";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { beginLayoutRestoring } from "@renderer/features/workspace/hooks/useProjectLayoutPersistence";
import {
  getResponsivePanelSize,
  toPanelPercentSize,
} from "@shared/constants/layoutSizing";
import { BinderSidebarPanelBody } from "./BinderSidebarPanelBody";
import { BinderSidebarTabs } from "./BinderSidebarTabs";
import { useBinderSidebarState } from "./useBinderSidebarState";

interface BinderSidebarProps {
    activeChapterId?: string;
    currentProjectId?: string;
    onManualClose?: () => void;
    groupWidthPx: number;
    sidebarTopOffset: number;
}

export function BinderSidebar({
    activeChapterId,
    currentProjectId,
    onManualClose,
    groupWidthPx,
    sidebarTopOffset: _sidebarTopOffset,
}: BinderSidebarProps) {
    const { t } = useTranslation();
    const {
        activeRightTab,
        handleResize,
        handleRightTabClick,
        isPanelRailOpen,
        savedRatio,
        setActiveRightTab,
        setFocusedClosableTarget,
        setRailOpen,
        widthConfig,
    } = useBinderSidebarState(currentProjectId ?? null);
    const binderSize = getResponsivePanelSize(groupWidthPx, widthConfig);
    const restoreFrameRef = useRef<number | null>(null);

    useLayoutEffect(() => {
        if (!activeRightTab) return;
        const endRestoring = beginLayoutRestoring();
        restoreFrameRef.current = requestAnimationFrame(() => {
            restoreFrameRef.current = requestAnimationFrame(() => {
                restoreFrameRef.current = null;
                endRestoring();
            });
        });
        return () => {
            if (restoreFrameRef.current !== null) {
                cancelAnimationFrame(restoreFrameRef.current);
                restoreFrameRef.current = null;
            }
            endRestoring();
        };
    }, [activeRightTab, savedRatio]);

    const handleClosePanel = () => {
        onManualClose?.();
        setActiveRightTab(null);
        setRailOpen(false);
    };

    if (!activeRightTab) return null;

    return (
        <>
            <PanelResizeHandle className="w-1 shrink-0 bg-border/40 hover:bg-accent focus-visible:bg-accent transition-colors cursor-col-resize z-20 relative">
                <div className="absolute inset-y-0 -left-1 -right-1" />
            </PanelResizeHandle>

            <Panel
                id={`binder-sidebar-${activeRightTab}`}
                defaultSize={toPanelPercentSize(savedRatio)}
                minSize={binderSize.minSize}
                maxSize={binderSize.maxSize}
                onResize={handleResize}
                onMouseDownCapture={() => {
                    setFocusedClosableTarget({ kind: "docs-tab" });
                }}
                className="bg-panel shadow-xl flex flex-row shrink-0 min-w-0 z-10"
            >
                <BinderSidebarPanelBody
                    activeChapterId={activeChapterId}
                    activeTab={activeRightTab}
                    currentProjectId={currentProjectId}
                    onBackToSnapshotList={() => setActiveRightTab("snapshot")}
                    onClose={handleClosePanel}
                    t={t}
                />

                {isPanelRailOpen ? (
                    <BinderSidebarTabs
                        activeTab={activeRightTab}
                        onCloseRail={() => setRailOpen(false)}
                        onTabClick={handleRightTabClick}
                        t={t}
                    />
                ) : (
                    <BinderSidebarTabs
                        activeTab={activeRightTab}
                        compact
                        onOpenRail={() => setRailOpen(true)}
                        onTabClick={handleRightTabClick}
                        t={t}
                    />
                )}
            </Panel>
        </>
    );
}

export function BinderSidebarRail({
    currentProjectId,
    sidebarTopOffset,
    suppressHoverOpen = false,
}: {
    currentProjectId?: string | null;
    sidebarTopOffset: number;
    suppressHoverOpen?: boolean;
}) {
    const { t } = useTranslation();
    const enableAnimations = useEditorStore((state) => state.enableAnimations);
    const { activeRightTab, setActiveRightTab } = useBinderSidebarState(currentProjectId ?? null);

    if (activeRightTab) return null;

    return (
        <>
            <button
                type="button"
                onClick={() => setActiveRightTab("character")}
                className={`fixed right-2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-background text-muted-foreground shadow-sm hover:bg-surface-hover hover:text-fg ${enableAnimations ? "transition-colors duration-150" : "transition-none"}`}
                style={{ top: sidebarTopOffset + 8 }}
                title={t("sidebar.toggle.open")}
            >
                <PanelRightOpen className="h-5 w-5" />
            </button>
            <FocusHoverSidebar
                side="right"
                topOffset={sidebarTopOffset}
                suppressHoverOpen={suppressHoverOpen}
            >
                <BinderSidebarTabs
                    activeTab={null}
                    onTabClick={setActiveRightTab}
                    t={t}
                />
            </FocusHoverSidebar>
        </>
    );
}
