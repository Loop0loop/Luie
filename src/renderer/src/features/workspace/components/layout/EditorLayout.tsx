import {
  type ReactNode,
  useRef,
  useEffect,
  useState,
} from "react";
import { type Editor } from "@tiptap/react";
import { Panel, Group as PanelGroup } from "react-resizable-panels";
import { useTranslation } from "react-i18next";
import FocusHoverSidebar from "@renderer/features/manuscript/components/FocusHoverSidebar";
import Ribbon from "@renderer/features/editor/components/Ribbon";
import WindowBar from "@renderer/features/workspace/components/WindowBar";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { EditorDropZones } from "@shared/ui/EditorDropZones";
import { BinderSidebar, BinderSidebarRail } from "@renderer/features/manuscript/components/BinderSidebar";
import { EDITOR_WINDOW_BAR_HEIGHT_PX } from "@shared/constants/configs";
import { toPercentSize } from "@shared/constants/sidebarSizing";

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
  const activeRightTab = useUIStore((state) => state.docsRightTab);

  const ribbonRef = useRef<HTMLDivElement>(null);
  const [ribbonHeight, setRibbonHeight] = useState(56);

  useEffect(() => {
    if (!ribbonRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setRibbonHeight(entry.contentRect.height);
      }
    });
    observer.observe(ribbonRef.current);
    return () => observer.disconnect();
  }, []);

  const isMacOS = navigator.platform.toLowerCase().includes("mac");
  const sidebarTopOffset = (isMacOS ? EDITOR_WINDOW_BAR_HEIGHT_PX : 0) + ribbonHeight;

  return (
    <div className="flex flex-col h-screen w-screen bg-app text-fg overflow-hidden relative">
      {/* 1. App Window Bar */}
      <WindowBar title={activeChapterTitle || t("editor.layoutTitle")} />

      {/* 2. Toolbar */}
      <div ref={ribbonRef}>
        <Ribbon
          editor={editor}
          onOpenSettings={onOpenSettings}
          activeChapterId={activeChapterId}
          onOpenExportPreview={onOpenExport}
          onOpenWorldGraph={onOpenWorldGraph}
        />
      </div>

      {/* 3. Main Area (Horizontal Flex) */}
      <div className="flex-1 overflow-hidden relative flex flex-row">
        {/* LEFT: 원고 사이드바 (Overlay Hover) */}
        <FocusHoverSidebar
          side="left"
          topOffset={sidebarTopOffset}
          activationWidthPx={320}
          closeDelayMs={260}
        >
          <div className="h-full flex flex-col bg-panel border-r border-border min-w-[280px]">
            {sidebar}
          </div>
        </FocusHoverSidebar>

        {/* CENTER: 메인 에디터 영역 */}
        <div className="flex-1 h-full overflow-hidden flex flex-row relative">

          {/* Editor Column Wrapper */}
          <PanelGroup
            orientation="horizontal"
            className="flex w-full h-full flex-1 overflow-hidden relative"
            id="editor-layout-group"
          >
            <Panel
              id="main-editor-view"
              minSize={toPercentSize(10)}
              className="min-w-0 bg-transparent relative flex flex-col"
            >
              <div className="flex-1 h-full overflow-hidden flex flex-col relative">
                <EditorDropZones />

                {/* Scrollable Editor Area */}
                <div className="flex-1 h-full overflow-y-auto bg-sidebar flex flex-col items-center custom-scrollbar shrink-0 relative">
                  {/* A4 페이지 (max-width 적용) */}
                  <div
                    className="min-h-[1056px] bg-surface text-fg shadow-xl border border-border py-12 px-12 my-8 transition-shadow duration-150 ease-out shrink-0"
                    style={{ width: maxWidth ?? 816 }}
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
              sidebarTopOffset={sidebarTopOffset}
            />

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

          <BinderSidebarRail sidebarTopOffset={sidebarTopOffset} />
        </div>
      </div>
    </div>
  );
}
