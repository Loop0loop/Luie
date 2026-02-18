import { type ReactNode, useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
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

const ResearchPanel = lazy(() => import("../research/ResearchPanel"));
const WorldPanel = lazy(() => import("../research/WorldPanel"));
const SnapshotList = lazy(() => import("../snapshot/SnapshotList").then(m => ({ default: m.SnapshotList })));
const TrashList = lazy(() => import("../trash/TrashList").then(m => ({ default: m.TrashList })));

type RightTab = "character" | "world" | "scrap" | "analysis" | "snapshot" | "trash" | null;

interface EditorLayoutProps {
  children?: ReactNode;
  sidebar?: ReactNode;
  activeChapterTitle?: string;
  activeChapterContent?: string;
  currentProjectId?: string;
  editor: Editor | null;
  onOpenSettings?: () => void;
  onRenameChapter?: (id: string, newTitle: string) => Promise<void>;
  onSaveChapter?: (title: string, content: string) => Promise<void>;
}

// WindowBar 높이: 40px (top-10)
const WINDOW_BAR_HEIGHT = 40;

export default function EditorLayout({
    children,
    sidebar,
    activeChapterTitle,
    currentProjectId,
    editor
}: EditorLayoutProps) {
  const { t } = useTranslation();
  const [activeRightTab, setActiveRightTab] = useState<RightTab>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);
  const [ribbonHeight, setRibbonHeight] = useState(56); // Ribbon 기본 높이 추정값

  // Ribbon 실제 높이 측정
  useEffect(() => {
    if (!ribbonRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setRibbonHeight(entry.contentRect.height);
      }
    });
    observer.observe(ribbonRef.current);
    return () => observer.disconnect();
  }, []);

  // 사이드바 시작 위치 = WindowBar + Ribbon
  const sidebarTopOffset = WINDOW_BAR_HEIGHT + ribbonHeight;

  const handleRightTabClick = useCallback((tab: Exclude<RightTab, null>) => {
    setActiveRightTab(prev => prev === tab ? null : tab);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-app text-fg overflow-hidden relative">
      
      {/* 1. App Window Bar */}
      <WindowBar title={activeChapterTitle || t("editor.layoutTitle")} />

      {/* 2. Toolbar (Google Docs style) */}
      <div ref={ribbonRef}>
        <Ribbon editor={editor} />
      </div>

      {/* 3. Main Area (에디터 + 숨겨진 사이드바들) */}
      <div className="flex-1 overflow-hidden relative">
      
          {/* LEFT: 원고 사이드바 (hover 시 표시) */}
          <FocusHoverSidebar side="left" topOffset={sidebarTopOffset}>
            <div className="h-full flex flex-col bg-panel border-r border-border min-w-[280px]">
               {sidebar}
            </div>
          </FocusHoverSidebar>

          {/* RIGHT: 바인더바 (Character/World/Scrap/Analysis/Snapshot/Trash) */}
          <FocusHoverSidebar side="right" topOffset={sidebarTopOffset}>
             <div className="h-full flex flex-row bg-panel border-l border-border min-w-[320px]">
                
                {/* 패널 콘텐츠 영역 */}
                <div className="flex-1 flex flex-col overflow-hidden bg-panel">
                    {activeRightTab ? (
                        <div className="h-full flex flex-col">
                            {/* 패널 헤더 */}
                            <div className="h-9 px-3 flex items-center bg-surface border-b border-border text-xs font-semibold text-muted tracking-wide shrink-0 justify-between">
                                <span className="uppercase">
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
                                <Suspense fallback={<div className="p-4 text-sm text-muted">{t("common.loading")}</div>}>
                                    {activeRightTab === "character" && (
                                        <ResearchPanel activeTab="character" onClose={() => setActiveRightTab(null)} />
                                    )}
                                    {activeRightTab === "world" && (
                                        <WorldPanel onClose={() => setActiveRightTab(null)} />
                                    )}
                                    {activeRightTab === "scrap" && (
                                        <ResearchPanel activeTab="scrap" onClose={() => setActiveRightTab(null)} />
                                    )}
                                    {activeRightTab === "analysis" && (
                                        <ResearchPanel activeTab="analysis" onClose={() => setActiveRightTab(null)} />
                                    )}
                                    {activeRightTab === "snapshot" && (
                                        activeChapterTitle ? (
                                            <SnapshotList chapterId={activeChapterTitle} />
                                        ) : (
                                            <div className="p-4 text-xs text-muted italic text-center">
                                                {t("snapshot.list.selectChapter")}
                                            </div>
                                        )
                                    )}
                                    {activeRightTab === "trash" && (
                                        currentProjectId ? (
                                            <TrashList projectId={currentProjectId} refreshKey={0} />
                                        ) : (
                                            <div className="p-4 text-xs text-muted italic text-center">
                                                {t("sidebar.trashEmpty")}
                                            </div>
                                        )
                                    )}
                                </Suspense>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-4 text-sm text-muted opacity-40 select-none">
                            {t("editor.selectTabPrompt")}
                        </div>
                    )}
                </div>

                {/* 오른쪽 세로 아이콘 바 (Google Docs 스타일) */}
                <div className="w-12 bg-surface border-l border-border flex flex-col items-center py-3 gap-2 shrink-0">
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
                    {/* 구분선 */}
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
          </FocusHoverSidebar>

          {/* 메인 에디터 영역 */}
          <div className="h-full w-full overflow-y-auto bg-[#f3f4f6] dark:bg-[#1a1a1a] flex flex-col items-center custom-scrollbar">
             
             {/* 페이지 */}
             <div className="w-[816px] min-h-[1056px] bg-white dark:bg-[#1e1e1e] shadow-2xl border border-black/5 dark:border-white/5 py-12 px-12 my-8 transition-all duration-200 ease-out">
                {/* 챕터 제목 */}
                {activeChapterTitle && (
                    <h1 className="text-3xl font-bold mb-8 pb-4 border-b border-border/50 text-fg">
                        {activeChapterTitle}
                    </h1>
                )}
                
                {/* 에디터 콘텐츠 */}
                <div className="min-h-[500px]">
                    {children}
                </div>
             </div>

             {/* 하단 여백 */}
             <div className="h-12 w-full shrink-0" />
          </div>
      </div>
    </div>
  );
}

function BinderTabButton({ icon, isActive, onClick, title }: { icon: ReactNode; isActive: boolean; onClick: () => void; title: string }) {
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
