import {
  type ReactNode,
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import { type Editor } from "@tiptap/react";
import { Panel, Group as PanelGroup, type Layout } from "react-resizable-panels";
import { useTranslation } from "react-i18next";
import FocusHoverSidebar from "@renderer/features/manuscript/components/FocusHoverSidebar";
import Ribbon from "@renderer/features/editor/components/Ribbon";
import WindowBar from "@renderer/features/workspace/components/WindowBar";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { EditorDropZones } from "@shared/ui/EditorDropZones";
import {
  BinderSidebar,
  BinderSidebarRail,
} from "@renderer/features/manuscript/components/BinderSidebar";
import { EDITOR_WINDOW_BAR_HEIGHT_PX } from "@shared/constants/configs";
import { SIDEBAR_WIDTH_CONFIG, toPercentSize } from "@shared/constants/sidebarSizing";
import { useElementWidth } from "@renderer/features/workspace/hooks/useElementWidth";
import { getPanelLayoutValue } from "@renderer/features/workspace/hooks/useLayoutPersist";
import { cn } from "@shared/types/utils";

interface EditorLayoutProps {
  children?: ReactNode;
  sidebar?: ReactNode;
  activeChapterId?: string;
  activeChapterTitle?: string;
  currentProjectId?: string;
  editor: Editor | null;
  onOpenSettings?: () => void;
  onOpenExport?: () => void;
  onRenameChapter?: (id: string, newTitle: string) => Promise<void>;
  onSaveChapter?: (title: string, content: string) => Promise<void>;
  additionalPanels?: ReactNode;
  additionalPanelIds?: string[];
  onOpenWorldGraph?: () => void;
}

export default function EditorLayout({
  children,
  sidebar,
  activeChapterId,
  activeChapterTitle,
  currentProjectId,
  editor,
  onOpenSettings,
  onOpenExport,
  onOpenWorldGraph,
  additionalPanels,
  additionalPanelIds = [],
}: EditorLayoutProps) {
  const { t } = useTranslation();

  const maxWidth = useEditorStore((state) => state.maxWidth);
  const rightPanelOpen = useUIStore((state) => state.regions.rightPanel.open);
  const rightPanelActiveTab = useUIStore((state) => state.regions.rightPanel.activeTab);
  const isPanelRailOpen = useUIStore((state) => state.regions.rightRail.open);
  const updatePanelSize = useUIStore((state) => state.updatePanelSize);
  const [isBinderRailHoverSuppressed, setIsBinderRailHoverSuppressed] =
    useState(false);
  const binderRailHoverSuppressionTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const editorLayoutGroupRef = useRef<HTMLDivElement>(null);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const [isToolbarHoverZoneActive, setIsToolbarHoverZoneActive] = useState(false);
  const toolbarHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToolbar = useCallback(() => {
    if (toolbarHideTimerRef.current !== null) {
      clearTimeout(toolbarHideTimerRef.current);
      toolbarHideTimerRef.current = null;
    }
    setIsToolbarVisible(true);
  }, []);

  const scheduleHide = useCallback(() => {
    if (toolbarHideTimerRef.current !== null) {
      clearTimeout(toolbarHideTimerRef.current);
      toolbarHideTimerRef.current = null;
    }
    setIsToolbarHoverZoneActive(false);
    toolbarHideTimerRef.current = setTimeout(() => {
      toolbarHideTimerRef.current = null;
      setIsToolbarVisible(false);
    }, 220);
  }, []);

  const editorLayoutGroupWidth = useElementWidth(editorLayoutGroupRef);
  // BinderSidebar 렌더 조건과 동일: rightPanel이 열려있고 activeTab 있고 rail도 열려있을 때
  const isBinderPanelVisible = Boolean(rightPanelOpen && rightPanelActiveTab && isPanelRailOpen);

  const handleEditorLayoutChanged = useCallback(
    (layout: Layout) => {
      additionalPanelIds.forEach((panelId, panelIndex) => {
        const rawSize = getPanelLayoutValue(layout, panelId, panelIndex + 1);
        if (typeof rawSize !== "number" || !Number.isFinite(rawSize)) return;
        updatePanelSize(panelId, rawSize);
      });
    },
    [additionalPanelIds, updatePanelSize],
  );

  useEffect(
    () => () => {
      if (binderRailHoverSuppressionTimeoutRef.current !== null) {
        clearTimeout(binderRailHoverSuppressionTimeoutRef.current);
        binderRailHoverSuppressionTimeoutRef.current = null;
      }
      if (toolbarHideTimerRef.current !== null) {
        clearTimeout(toolbarHideTimerRef.current);
        toolbarHideTimerRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    if (!isBinderPanelVisible) return;
    setIsToolbarVisible(false);
    setIsToolbarHoverZoneActive(false);
    if (toolbarHideTimerRef.current !== null) {
      clearTimeout(toolbarHideTimerRef.current);
      toolbarHideTimerRef.current = null;
    }
  }, [isBinderPanelVisible]);

  const handleBinderSidebarManualClose = useCallback(() => {
    if (binderRailHoverSuppressionTimeoutRef.current !== null) {
      clearTimeout(binderRailHoverSuppressionTimeoutRef.current);
    }
    setIsBinderRailHoverSuppressed(true);
    binderRailHoverSuppressionTimeoutRef.current = setTimeout(() => {
      binderRailHoverSuppressionTimeoutRef.current = null;
      setIsBinderRailHoverSuppressed(false);
    }, 250);
  }, []);

  const isMacOS = navigator.userAgent.toLowerCase().includes("mac");
  const sidebarTopOffset = isMacOS ? EDITOR_WINDOW_BAR_HEIGHT_PX : 0;

  return (
    <div className="flex flex-col h-screen w-screen bg-app text-fg overflow-hidden relative">
      {/* 1. App Window Bar */}
      <WindowBar title={activeChapterTitle || t("editor.layoutTitle")} />

      {/* 3. Main Area (Horizontal Flex) */}
      <div className="flex-1 overflow-hidden relative flex flex-row">
        {/* LEFT: 원고 사이드바 (Overlay Hover) */}
        <FocusHoverSidebar
          side="left"
          topOffset={sidebarTopOffset}
          activationWidthPx={SIDEBAR_WIDTH_CONFIG.mainSidebar.minPx}
          closeDelayMs={180}
          suppressHoverOpen={isToolbarHoverZoneActive}
        >
          <div
            className="h-full flex flex-col bg-panel border-r border-border"
            style={{ minWidth: SIDEBAR_WIDTH_CONFIG.mainSidebar.minPx }}
          >
            {sidebar}
          </div>
        </FocusHoverSidebar>

        {/* CENTER: 메인 에디터 영역 */}
        <div className="flex-1 h-full overflow-hidden flex flex-row relative">

          {/* Hover trigger strip — activates floating toolbar */}
          {!isBinderPanelVisible && (
            <div
              className="absolute inset-x-0 top-0 z-30 h-11 pointer-events-auto"
              onMouseEnter={() => {
                setIsToolbarHoverZoneActive(true);
                showToolbar();
              }}
              onMouseLeave={scheduleHide}
            />
          )}

          {/* Floating Toolbar Overlay */}
          {!isBinderPanelVisible && (
            <div
              className={cn(
                "absolute inset-x-0 top-0 z-40 transition-all duration-200 ease-out",
                isToolbarVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 -translate-y-2 pointer-events-none",
              )}
              onMouseEnter={() => {
                setIsToolbarHoverZoneActive(true);
                showToolbar();
              }}
              onMouseLeave={scheduleHide}
            >
              <Ribbon
                editor={editor}
                onOpenSettings={onOpenSettings}
                activeChapterId={activeChapterId}
                onOpenExportPreview={onOpenExport}
                onOpenWorldGraph={onOpenWorldGraph}
              />
            </div>
          )}

          {/* Editor Column Wrapper */}
          <PanelGroup
            orientation="horizontal"
            className="flex w-full h-full flex-1 overflow-hidden relative"
            id="editor-layout-group"
            elementRef={editorLayoutGroupRef}
            onLayoutChanged={handleEditorLayoutChanged}
          >
            <Panel
              id="main-editor-view"
              minSize={toPercentSize(10)}
              className="min-w-0 bg-transparent relative flex flex-col"
            >
              <div className="flex-1 h-full overflow-hidden flex flex-col relative">
                <EditorDropZones />

                {/* Scrollable Editor Area */}
                <div
                  className="flex-1 h-full overflow-y-scroll bg-background flex flex-col items-center custom-scrollbar shrink-0 relative"
                  data-editor-scroll-container="true"
                >
                  {/* Editor Container (No Paper Shadow) */}
                  <div
                    className="min-h-full bg-transparent text-fg py-12 px-8 transition-all duration-150 ease-out shrink-0"
                    style={{ width: maxWidth ?? 816, maxWidth: "100%" }}
                  >
                    {/* 챕터 제목 */}
                    {activeChapterTitle && (
                      <h1 className="text-3xl font-bold mb-8 pb-4 border-b border-border/50 text-fg break-all">
                        {activeChapterTitle}
                      </h1>
                    )}

                    {/* 에디터 콘텐츠 */}
                    <div className="min-h-[500px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[400px] wrap-break-word">
                      {children}
                    </div>
                  </div>

                  <div className="h-12 w-full shrink-0" />
                </div>
              </div>
            </Panel>

            {additionalPanels}

            <BinderSidebar
              activeChapterId={activeChapterId}
              currentProjectId={currentProjectId}
              groupWidthPx={editorLayoutGroupWidth}
              onManualClose={handleBinderSidebarManualClose}
              sidebarTopOffset={sidebarTopOffset}
            />

            {!isBinderPanelVisible && additionalPanelIds.length === 0 && (
              <Panel
                id="editor-layout-placeholder"
                defaultSize={0}
                minSize={0}
                maxSize={0}
                className="pointer-events-none overflow-hidden opacity-0"
              />
            )}
          </PanelGroup>

          <BinderSidebarRail
            currentProjectId={currentProjectId ?? null}
            sidebarTopOffset={sidebarTopOffset}
            suppressHoverOpen={isBinderRailHoverSuppressed || isToolbarHoverZoneActive}
          />
        </div>
      </div>
    </div>
  );
}
