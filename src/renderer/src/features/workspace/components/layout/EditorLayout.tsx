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
import { BinderSidebar } from "@renderer/features/manuscript/components/BinderSidebar";
import { BinderBarCompactHover } from "@renderer/features/workspace/components/BinderBarCompactHover";
import { EDITOR_WINDOW_BAR_HEIGHT_PX } from "@shared/constants/configs";
import { SIDEBAR_WIDTH_CONFIG, toPercentSize } from "@shared/constants/sidebarSizing";
import { useElementWidth } from "@renderer/features/workspace/hooks/useElementWidth";
import { getPanelLayoutValue } from "@renderer/features/workspace/hooks/useLayoutPersist";
import { cn } from "@shared/types/utils";

const ENABLE_LEGACY_BINDER_SIDEBAR = false;

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
  const activeRightTab = useUIStore((state) => state.regions.rightPanel.activeTab);
  const updatePanelSize = useUIStore((state) => state.updatePanelSize);
  const [isBinderRailHoverSuppressed, setIsBinderRailHoverSuppressed] =
    useState(false);
  const [isCompactBinderServing, setIsCompactBinderServing] = useState(false);
  const binderRailHoverSuppressionTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const editorLayoutGroupRef = useRef<HTMLDivElement>(null);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const toolbarHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToolbar = useCallback(() => {
    if (toolbarHideTimerRef.current !== null) {
      clearTimeout(toolbarHideTimerRef.current);
      toolbarHideTimerRef.current = null;
    }
    setIsToolbarVisible(true);
  }, []);

  const scheduleHide = useCallback(() => {
    toolbarHideTimerRef.current = setTimeout(() => {
      toolbarHideTimerRef.current = null;
      setIsToolbarVisible(false);
    }, 400);
  }, []);

  const editorLayoutGroupWidth = useElementWidth(editorLayoutGroupRef);

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
          closeDelayMs={260}
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
          <div
            className="absolute inset-x-0 top-0 z-30 h-7 pointer-events-auto"
            onMouseEnter={showToolbar}
          />

          {/* Floating Toolbar Overlay */}
          <div
            className={cn(
              "absolute inset-x-0 top-0 z-40 transition-opacity duration-200",
              isToolbarVisible ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
            onMouseEnter={showToolbar}
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

            {ENABLE_LEGACY_BINDER_SIDEBAR && !isCompactBinderServing && (
              <BinderSidebar
                activeChapterId={activeChapterId}
                currentProjectId={currentProjectId}
                groupWidthPx={editorLayoutGroupWidth}
                onManualClose={handleBinderSidebarManualClose}
                sidebarTopOffset={sidebarTopOffset}
              />
            )}

            {!activeRightTab && additionalPanelIds.length === 0 && (
              <Panel
                id="editor-layout-placeholder"
                defaultSize={0}
                minSize={0}
                maxSize={0}
                className="pointer-events-none overflow-hidden opacity-0"
              />
            )}
          </PanelGroup>

          <BinderBarCompactHover
            activeChapterId={activeChapterId}
            currentProjectId={currentProjectId}
            sidebarTopOffset={sidebarTopOffset}
            suppressHoverOpen={isBinderRailHoverSuppressed}
            onServingStateChange={setIsCompactBinderServing}
          />
        </div>
      </div>
    </div>
  );
}
