import {
  type ReactNode,
  useCallback,
  useRef,
  useEffect,
  useState,
  lazy,
  Suspense,
  useMemo,
} from "react";
import { type Editor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import {
  User,
  Globe,
  StickyNote,
  Sparkles,
  History,
  Trash2,
  ChevronLeft,
} from "lucide-react";
import FocusHoverSidebar from "../sidebar/FocusHoverSidebar";
import Ribbon from "../editor/Ribbon";
import WindowBar from "./WindowBar";
import { cn } from "../../../../shared/types/utils";
import { useUIStore, type DocsRightTab } from "../../stores/uiStore";

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
}

// WindowBar 높이: 40px
const WINDOW_BAR_HEIGHT = 40;
const BINDER_ICON_BAR_WIDTH = 48; // w-12
const BINDER_MIN_WIDTH = 240;
const BINDER_MAX_WIDTH = 900;
const BINDER_DEFAULT_WIDTH = 320;

// 탭별 기본 너비
const DEFAULT_TAB_WIDTHS: Record<string, number> = {
  character: 320,
  world: 360,
  scrap: 300,
  analysis: 380,
  snapshot: 280,
  trash: 280,
};

const STORAGE_KEY = "luie_editor_binder_widths";

type BinderTab = Exclude<DocsRightTab, null | "editor" | "export">;

function loadTabWidths(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_TAB_WIDTHS, ...(JSON.parse(raw) as Record<string, number>) };
  } catch {
    // ignore
  }
  return { ...DEFAULT_TAB_WIDTHS };
}

function saveTabWidths(widths: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
  } catch {
    // ignore
  }
}

export default function EditorLayout({
  children,
  sidebar,
  activeChapterId,
  activeChapterTitle,
  currentProjectId,
  editor,
  onOpenSettings,
}: EditorLayoutProps) {
  const { t } = useTranslation();

  // UIStore의 docsRightTab을 공유해서 SmartLink 연동
  const { docsRightTab, setDocsRightTab } = useUIStore();

  // BinderTab만 허용 (editor/export 제외)
  const VALID_TABS: BinderTab[] = ["character", "world", "scrap", "analysis", "snapshot", "trash"];
  const activeRightTab: BinderTab | null =
    docsRightTab && VALID_TABS.includes(docsRightTab as BinderTab)
      ? (docsRightTab as BinderTab)
      : null;

  const setActiveRightTab = useCallback(
    (tab: BinderTab | null) => setDocsRightTab(tab),
    [setDocsRightTab]
  );

  const ribbonRef = useRef<HTMLDivElement>(null);
  const [ribbonHeight, setRibbonHeight] = useState(56);

  // 탭별 너비 기억
  const [tabWidths, setTabWidths] = useState<Record<string, number>>(loadTabWidths);
  const [isResizing, setIsResizing] = useState(false);

  // 현재 탭의 너비
  const currentWidth = useMemo(
    () => (activeRightTab ? (tabWidths[activeRightTab] ?? BINDER_DEFAULT_WIDTH) : BINDER_DEFAULT_WIDTH),
    [activeRightTab, tabWidths]
  );

  // Ribbon 실제 높이 측정
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

  // BinderBar 리사이즈 핸들러
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const next = Math.max(
        BINDER_MIN_WIDTH,
        Math.min(BINDER_MAX_WIDTH, window.innerWidth - e.clientX - BINDER_ICON_BAR_WIDTH)
      );
      const rounded = Math.round(next);
      if (activeRightTab) {
        setTabWidths((prev) => {
          const updated = { ...prev, [activeRightTab]: rounded };
          saveTabWidths(updated);
          return updated;
        });
      }
    };
    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, activeRightTab]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  // 사이드바 시작 위치 = WindowBar + Ribbon
  const sidebarTopOffset = WINDOW_BAR_HEIGHT + ribbonHeight;

  const handleRightTabClick = useCallback(
    (tab: BinderTab) => {
      setActiveRightTab(activeRightTab === tab ? null : tab);
    },
    [activeRightTab, setActiveRightTab]
  );

  // 공통 BinderBar 콘텐츠 렌더링 함수
  const renderBinderContent = () => (
    <div className="h-full flex flex-row bg-panel border-l border-border shadow-2xl">
      {/* 패널 콘텐츠 영역 */}
      <div
        className="flex flex-col overflow-hidden bg-panel shrink-0 relative transition-[width] duration-300 ease-in-out"
        style={{
          width: activeRightTab ? `${currentWidth}px` : "0px",
          // 리사이즈 중일 때는 transition 끔 (부드러운 드래그)
          transition: isResizing ? "none" : undefined,
        }}
      >
        {activeRightTab && (
          <div className="h-full flex flex-col w-full">
            {/* 리사이즈 핸들 (왼쪽 가장자리) */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-accent/40 active:bg-accent/60 transition-colors z-10 group"
              onMouseDown={startResize}
            >
              <div className="absolute inset-y-0 left-0 w-0.5 bg-border/50 group-hover:bg-accent/60 transition-colors" />
            </div>

            {/* 패널 헤더 */}
            <div className="h-9 px-3 flex items-center bg-surface border-b border-border text-xs font-semibold text-muted tracking-wide shrink-0 justify-between">
              <span className="uppercase pl-1">
                {activeRightTab === "character" && t("research.title.characters")}
                {activeRightTab === "world" && t("research.title.world")}
                {activeRightTab === "scrap" && t("research.title.scrap")}
                {activeRightTab === "analysis" && t("research.title.analysis")}
                {activeRightTab === "snapshot" && t("sidebar.section.snapshot")}
                {activeRightTab === "trash" && t("sidebar.section.trash")}
              </span>
              <button
                onClick={() => setActiveRightTab(null)}
                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted hover:text-fg transition-colors"
                title={t("sidebar.toggle.close")}
              >
                <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>

            {/* 패널 본문 */}
            <div className="flex-1 overflow-hidden">
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
        )}
      </div>

      {/* 오른쪽 세로 아이콘 바 */}
      <div className="w-12 bg-surface border-l border-border flex flex-col items-center py-3 gap-2 shrink-0 z-20">
        <BinderTabButton
          icon={<User className="w-5 h-5" />}
          isActive={activeRightTab === "character"}
          onClick={() => handleRightTabClick("character")}
          title={t("research.title.characters")}
        />
        <BinderTabButton
          icon={<Globe className="w-5 h-5" />}
          isActive={activeRightTab === "world"}
          onClick={() => handleRightTabClick("world")}
          title={t("research.title.world")}
        />
        <BinderTabButton
          icon={<StickyNote className="w-5 h-5" />}
          isActive={activeRightTab === "scrap"}
          onClick={() => handleRightTabClick("scrap")}
          title={t("research.title.scrap")}
        />
        <BinderTabButton
          icon={<Sparkles className="w-5 h-5" />}
          isActive={activeRightTab === "analysis"}
          onClick={() => handleRightTabClick("analysis")}
          title={t("research.title.analysis")}
        />
        <div className="w-6 h-px bg-border/50 my-1" />
        <BinderTabButton
          icon={<History className="w-5 h-5" />}
          isActive={activeRightTab === "snapshot"}
          onClick={() => handleRightTabClick("snapshot")}
          title={t("sidebar.section.snapshot")}
        />
        <BinderTabButton
          icon={<Trash2 className="w-5 h-5" />}
          isActive={activeRightTab === "trash"}
          onClick={() => handleRightTabClick("trash")}
          title={t("sidebar.section.trash")}
        />
      </div>
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
        {/* 왼쪽은 에디터 영역을 밀지 않고 덮음 (기존 유지) */}
        <FocusHoverSidebar side="left" topOffset={sidebarTopOffset}>
          <div className="h-full flex flex-col bg-panel border-r border-border min-w-[280px]">
            {sidebar}
          </div>
        </FocusHoverSidebar>

        {/* CENTER: 메인 에디터 영역 */}
        <div className="flex-1 h-full overflow-y-auto bg-[#f3f4f6] dark:bg-[#1a1a1a] flex flex-col items-center custom-scrollbar">
          {/* A4 페이지 */}
          <div className="w-[816px] min-h-[1056px] bg-white dark:bg-[#1e1e1e] shadow-2xl border border-black/5 dark:border-white/5 py-12 px-12 my-8 transition-all duration-200 ease-out">
            {/* 챕터 제목 */}
            {activeChapterTitle && (
              <h1 className="text-3xl font-bold mb-8 pb-4 border-b border-border/50 text-fg break-all">
                {activeChapterTitle}
              </h1>
            )}

            {/* 에디터 콘텐츠 */}
            <div className="min-h-[500px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[400px] break-words">
              {children}
            </div>
          </div>

          <div className="h-12 w-full shrink-0" />
        </div>

        {/* RIGHT: 바인더바 (Hybrid: Static or Hover) */}
        {activeRightTab ? (
          // 탭 활성화 시: Static Panel (에디터 영역을 밈)
          <div className="h-full shrink-0 z-20">
            {renderBinderContent()}
          </div>
        ) : (
          // 탭 비활성 시: Hover Sidebar (에디터 위에 뜸, 패널은 닫혀있고 아이콘바만 보임 -> Hover 시 전체 등장이지만 패널은 닫힌 상태)
          // 주의: FocusHoverSidebar는 children width만큼 열림. 패널이 닫혀있으면(0px) 아이콘바(48px)만 보임.
          <FocusHoverSidebar side="right" topOffset={sidebarTopOffset}>
            {renderBinderContent()}
          </FocusHoverSidebar>
        )}
      </div>
    </div>
  );
}

function BinderTabButton({
  icon,
  isActive,
  onClick,
  title,
}: {
  icon: ReactNode;
  isActive: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
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
}
