import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import FocusHoverSidebar from "@renderer/features/manuscript/components/FocusHoverSidebar";
import { beginLayoutRestoring } from "@renderer/features/workspace/hooks/useProjectLayoutPersistence";
import {
  getResponsivePanelSize,
  toPanelPercentSize,
} from "@shared/constants/layoutSizing";
import { api } from "@shared/api";
import { BinderSidebarPanelBody } from "./BinderSidebarPanelBody";
import { BinderSidebarTabs } from "./BinderSidebarTabs";
import { useBinderSidebarState } from "./useBinderSidebarState";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";

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
    const [isPinned, setIsPinned] = useState(false);
    const [isAutoClosing, setIsAutoClosing] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const enableAnimations = useEditorStore((state) => state.enableAnimations);
    const isSnapshotTab = activeRightTab === "snapshot";
    const effectivePinned = isPinned || isSnapshotTab;

    useLayoutEffect(() => {
        if (!activeRightTab) return;
        void api.logger.warn("legacy-binder.rendered", {
            activeRightTab,
            currentProjectId: currentProjectId ?? null,
        });
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
    }, [activeRightTab, savedRatio, currentProjectId]);

    useLayoutEffect(
        () => {
            const handlePointerUp = () => setIsResizing(false);
            window.addEventListener("pointerup", handlePointerUp);
            window.addEventListener("pointercancel", handlePointerUp);
            return () => {
                window.removeEventListener("pointerup", handlePointerUp);
                window.removeEventListener("pointercancel", handlePointerUp);
                if (closeTimerRef.current !== null) {
                    clearTimeout(closeTimerRef.current);
                    closeTimerRef.current = null;
                }
            };
        },
        [],
    );

    const handleClosePanel = () => {
        if (closeTimerRef.current !== null) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        setIsAutoClosing(false);
        setIsResizing(false);
        onManualClose?.();
        setActiveRightTab(null);
        setRailOpen(false);
    };

    const hidePanelKeepState = (options?: { suppressHover?: boolean }) => {
        if (closeTimerRef.current !== null) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        setIsAutoClosing(false);
        setIsResizing(false);
        if (options?.suppressHover) {
            onManualClose?.();
        }
        setRailOpen(false);
    };

    const scheduleClosePanel = () => {
        if (effectivePinned || isResizing) return;
        if (!enableAnimations) {
            hidePanelKeepState();
            return;
        }
        setIsAutoClosing(true);
        if (closeTimerRef.current !== null) {
            clearTimeout(closeTimerRef.current);
        }
        closeTimerRef.current = setTimeout(() => {
            closeTimerRef.current = null;
            hidePanelKeepState();
        }, 170);
    };

    const cancelScheduledClose = () => {
        if (closeTimerRef.current !== null) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        setIsAutoClosing(false);
    };

    if (!activeRightTab || !isPanelRailOpen) return null;

    return (
        <>
            <PanelResizeHandle
                className="w-1 shrink-0 bg-border/40 hover:bg-accent focus-visible:bg-accent transition-colors cursor-col-resize z-20 relative"
                onPointerDown={() => setIsResizing(true)}
                onPointerUp={() => setIsResizing(false)}
                onPointerCancel={() => setIsResizing(false)}
                onMouseEnter={cancelScheduledClose}
            >
                <div className="absolute inset-y-0 -left-1 -right-1" />
            </PanelResizeHandle>

            <Panel
                id="editor-binder-sidebar"
                defaultSize={toPanelPercentSize(savedRatio)}
                minSize={binderSize.minSize}
                maxSize={binderSize.maxSize}
                onResize={handleResize}
                onMouseDownCapture={() => {
                    setFocusedClosableTarget({ kind: "docs-tab" });
                }}
                onMouseEnter={cancelScheduledClose}
                onMouseLeave={(event) => {
                    if (event.buttons !== 0) return;
                    scheduleClosePanel();
                }}
                className={`bg-panel shadow-xl flex flex-row shrink-0 min-w-0 z-10 ${
                    enableAnimations
                        ? isAutoClosing
                            ? "animate-out slide-out-to-right fade-out duration-150"
                            : "animate-in slide-in-from-right fade-in duration-150"
                        : ""
                }`}
            >
                <BinderSidebarPanelBody
                    activeChapterId={activeChapterId}
                    activeTab={activeRightTab}
                    currentProjectId={currentProjectId}
                    onBackToSnapshotList={() => setActiveRightTab("snapshot")}
                    onClose={handleClosePanel}
                    isPinned={effectivePinned}
                    pinLocked={isSnapshotTab}
                    onTogglePinned={() => setIsPinned((prev) => !prev)}
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
    const {
        activeRightTab,
        isPanelRailOpen,
        handleRightTabClick,
        setRailOpen,
    } = useBinderSidebarState(currentProjectId ?? null);

    if (activeRightTab && isPanelRailOpen) return null;

    return (
        <FocusHoverSidebar
            side="right"
            topOffset={sidebarTopOffset}
            suppressHoverOpen={suppressHoverOpen}
            onOpenChange={(isOpen) => {
                if (isOpen && activeRightTab && !isPanelRailOpen) {
                    setRailOpen(true);
                }
            }}
        >
            <BinderSidebarTabs
                activeTab={activeRightTab}
                onTabClick={handleRightTabClick}
                t={t}
            />
        </FocusHoverSidebar>
    );
}
