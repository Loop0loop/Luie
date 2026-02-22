import {
  type ReactNode,
  useCallback,
  useRef,
  useEffect,
  useState,
  lazy,
  Suspense,
} from "react";
import { type Editor } from "@tiptap/react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { useTranslation } from "react-i18next";
import {
  User,
  Globe,
  StickyNote,
  Sparkles,
  History,
  Trash2,
  ChevronLeft,
  X,
} from "lucide-react";
import FocusHoverSidebar from "../sidebar/FocusHoverSidebar";
import Ribbon from "../editor/Ribbon";
import WindowBar from "./WindowBar";
import { cn } from "../../../../shared/types/utils";
import { useUIStore, type DocsRightTab } from "../../stores/uiStore";
import { useEditorStore } from "../../stores/editorStore";
import { EditorDropZones } from "../common/EditorDropZones";
import { DraggableItem } from "../common/DraggableItem";
import type { DragItemType } from "../common/GlobalDragContext";

const ResearchPanel = lazy(() => import("../research/ResearchPanel"));
const WorldPanel = lazy(() => import("../research/WorldPanel"));
const SnapshotList = lazy(() =>
  import("../snapshot/SnapshotList").then((m) => ({ default: m.SnapshotList }))
);
const TrashList = lazy(() =>
  import("../trash/TrashList").then((m) => ({ default: m.TrashList }))
);

interface EditorLayoutProps {
  children?: ReactNode;
  sidebar?: ReactNode;
  activeChapterId?: string;
  activeChapterTitle?: string;
  currentProjectId?: string;
  editor: Editor | null;
  onOpenSettings?: () => void;
  onRenameChapter?: (id: string, newTitle: string) => Promise<void>;
  onSaveChapter?: (title: string, content: string) => Promise<void>;
  additionalPanels?: ReactNode;
}

const WINDOW_BAR_HEIGHT = 40;

type BinderTab = Exclude<DocsRightTab, null | "editor" | "export">;

export default function EditorLayout({
  children,
  sidebar,
  activeChapterId,
  activeChapterTitle,
  currentProjectId,
  editor,
  onOpenSettings,
  additionalPanels,
}: EditorLayoutProps) {
  const { t } = useTranslation();

  const { docsRightTab, setDocsRightTab } = useUIStore();
  const maxWidth = useEditorStore((state) => state.maxWidth);

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

  const handleRightTabClick = useCallback(
    (tab: BinderTab) => {
      setActiveRightTab(activeRightTab === tab ? null : tab);
    },
    [activeRightTab, setActiveRightTab]
  );

  const handleBackToSnapshotList = () => {
    // TODO: Need snapshot viewer state inside snapshot panel
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
            <Panel id="main-editor-view" minSize={20} className="min-w-0 bg-transparent relative flex flex-col">
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

            {/* RIGHT: 바인더바 Static Panel (에디터 영역을 밈) */}
            {activeRightTab && (
              <>
                <PanelResizeHandle className="w-1 shrink-0 bg-border/40 hover:bg-accent focus-visible:bg-accent transition-colors cursor-col-resize z-20 relative">
                  <div className="absolute inset-y-0 -left-1 -right-1" />
                </PanelResizeHandle>

                <Panel id="binder-sidebar" defaultSize={25} minSize={15} maxSize={40} className="bg-panel shadow-2xl flex flex-row shrink-0 min-w-0 z-10 transition-none">
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
                </Panel>
              </>
            )}
          </PanelGroup>

          {/* 탭 비활성 시: Hover Sidebar (에디터 위에 뜸, 패널은 닫혀있고 아이콘바만 보임) */}
          {!activeRightTab && (
            <FocusHoverSidebar side="right" topOffset={sidebarTopOffset}>
              <div className="h-full flex flex-row shadow-2xl">
                {renderIconBar()}
              </div>
            </FocusHoverSidebar>
          )}
        </div>
      </div>
    </div>
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
