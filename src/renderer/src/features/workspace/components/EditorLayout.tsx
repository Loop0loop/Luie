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
import { EditorDropZones } from "@shared/ui/EditorDropZones";
import { BinderSidebar } from "@renderer/features/manuscript/components/BinderSidebar";

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
  onOpenWorldGraph?: () => void;
}

const WINDOW_BAR_HEIGHT = 40;

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
}: EditorLayoutProps) {
  const { t } = useTranslation();

  const maxWidth = useEditorStore((state) => state.maxWidth);

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

  const sidebarTopOffset = WINDOW_BAR_HEIGHT + ribbonHeight;

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
        <FocusHoverSidebar side="left" topOffset={sidebarTopOffset}>
          <div className="h-full flex flex-col bg-panel border-r border-border min-w-[280px]">
            {sidebar}
          </div>
        </FocusHoverSidebar>

        {/* CENTER: 메인 에디터 영역 */}
        <div className="flex-1 h-full overflow-hidden flex flex-row relative">

          {/* Editor Column Wrapper */}
          <PanelGroup orientation="horizontal" className="flex w-full h-full flex-1 overflow-hidden relative" id="editor-layout">
            <Panel id="main-editor-view" minSize="80px" className="min-w-0 bg-transparent relative flex flex-col">
              <div className="flex-1 h-full overflow-hidden flex flex-col relative">
                <EditorDropZones />

                {/* Scrollable Editor Area */}
                <div className="flex-1 h-full overflow-y-auto bg-[#f3f4f6] dark:bg-[#1a1a1a] flex flex-col items-center custom-scrollbar shrink-0 relative">
                  {/* A4 페이지 (max-width 적용) */}
                  <div
                    className="min-h-[1056px] bg-white dark:bg-[#1e1e1e] shadow-2xl border border-black/5 dark:border-white/5 py-12 px-12 my-8 transition-all duration-200 ease-out shrink-0"
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
          </PanelGroup>
        </div>
      </div>
    </div>
  );
}
