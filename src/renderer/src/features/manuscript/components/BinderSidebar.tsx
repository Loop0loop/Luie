import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import FocusHoverSidebar from "@renderer/features/manuscript/components/FocusHoverSidebar";
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
        setRegionOpen,
        widthConfig,
    } = useBinderSidebarState(currentProjectId ?? null);
    const binderSize = getResponsivePanelSize(groupWidthPx, widthConfig);
    const restoreFrameRef = useRef<number | null>(null);

    useEffect(() => {
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
        setRegionOpen("rightRail", false);
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
                        onCloseRail={() => setRegionOpen("rightRail", false)}
                        onTabClick={handleRightTabClick}
                        t={t}
                    />
                ) : (
                    <BinderSidebarTabs
                        activeTab={activeRightTab}
                        compact
                        onOpenRail={() => setRegionOpen("rightRail", true)}
                        onTabClick={handleRightTabClick}
                        t={t}
                    />
                )}
            </Panel>
        </>
    );
}

export function BinderSidebarRail({
    sidebarTopOffset,
    suppressHoverOpen = false,
}: {
    sidebarTopOffset: number;
    suppressHoverOpen?: boolean;
}) {
    const { t } = useTranslation();
    const {
        activeRightTab,
        isRightRailOpen,
        setActiveRightTab,
        setRegionOpen,
    } = useBinderSidebarState();

    if (activeRightTab) return null;

    if (!isRightRailOpen) {
        return null;
    }

    return (
        <FocusHoverSidebar
            side="right"
            topOffset={sidebarTopOffset}
            activationWidthPx={84}
            closeDelayMs={240}
            suppressHoverOpen={suppressHoverOpen}
        >
            <div className="h-full flex flex-row shadow-xl">
                <BinderSidebarTabs
                    activeTab={activeRightTab}
                    onCloseRail={() => setRegionOpen("rightRail", false)}
                    onTabClick={setActiveRightTab}
                    t={t}
                />
            </div>
        </FocusHoverSidebar>
    );
}
