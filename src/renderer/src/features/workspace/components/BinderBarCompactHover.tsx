import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  lazy,
  Suspense,
} from "react";
import { useTranslation } from "react-i18next";
import FocusHoverSidebar from "@renderer/features/manuscript/components/FocusHoverSidebar";
import {
  buildBinderTabItems,
  type BinderTab,
} from "@renderer/features/manuscript/components/binderSidebar.shared";
import { BinderSidebarPanelBody } from "@renderer/features/manuscript/components/BinderSidebarPanelBody";
import { X } from "lucide-react";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { api } from "@shared/api";
import { cn } from "@shared/types/utils";
import type { Snapshot } from "@shared/types";
import {
  getEditorLayoutPanelSurface,
  getLayoutSurfaceDefaultRatio,
  normalizeLayoutSurfaceRatioInput,
} from "@shared/constants/layoutSizing";

const SnapshotViewer = lazy(
  () => import("@renderer/features/snapshot/components/SnapshotViewer"),
);

type BinderBarCompactHoverProps = {
  activeChapterId?: string;
  currentProjectId?: string;
  sidebarTopOffset: number;
  suppressHoverOpen?: boolean;
  onServingStateChange?: (serving: boolean) => void;
  containerWidthPx: number;
};

const RAIL_WIDTH_PX = 44;
const COMPACT_MIN_PX = 260;
const COMPACT_MAX_PX = 720;

export function BinderBarCompactHover({
  activeChapterId,
  currentProjectId,
  sidebarTopOffset,
  suppressHoverOpen = false,
  onServingStateChange,
  containerWidthPx,
}: BinderBarCompactHoverProps) {
  const { t } = useTranslation();
  const enableAnimations = useEditorStore((state) => state.enableAnimations);
  const [activeCompactTab, setActiveCompactTab] = useState<BinderTab | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);

  const activeChapterContent = useChapterStore(
    (state) => activeChapterId ? state.items.find((c) => c.id === activeChapterId)?.content : undefined,
  );
  const onServingStateChangeRef = useRef(onServingStateChange);
  useEffect(() => {
    onServingStateChangeRef.current = onServingStateChange;
  });
  const dragStateRef = useRef<{
    surface: ReturnType<typeof getEditorLayoutPanelSurface>;
    startX: number;
    startRatio: number;
  } | null>(null);

  const setLayoutSurfaceRatio = useUIStore((state) => state.setLayoutSurfaceRatio);

  // Subscribe to only the active tab's ratio — not the entire map
  const activeTabRatio = useUIStore((state) => {
    if (!activeCompactTab) return 0;
    const surface = getEditorLayoutPanelSurface(activeCompactTab);
    return state.layoutSurfaceRatios[surface] ?? getLayoutSurfaceDefaultRatio(surface);
  });

  const tabItems = useMemo(() => buildBinderTabItems(t), [t]);

  useEffect(() => {
    onServingStateChangeRef.current?.(activeCompactTab !== null);
    void api.logger.debug("compact-binder.serving-state", {
      activeCompactTab,
      serving: activeCompactTab !== null,
    });
  }, [activeCompactTab]);

  const activeContentWidth = useMemo(() => {
    if (activeCompactTab === null) return RAIL_WIDTH_PX;
    const referenceWidth =
      Number.isFinite(containerWidthPx) && containerWidthPx > 0
        ? containerWidthPx
        : window.innerWidth;
    const widthByRatio = Math.round((referenceWidth * activeTabRatio) / 100);
    return Math.max(COMPACT_MIN_PX, Math.min(COMPACT_MAX_PX, widthByRatio));
  }, [activeCompactTab, containerWidthPx, activeTabRatio]);

  const handleResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!activeCompactTab) return;
      const surface = getEditorLayoutPanelSurface(activeCompactTab);
      dragStateRef.current = {
        surface,
        startX: event.clientX,
        startRatio: activeTabRatio,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [activeCompactTab, activeTabRatio],
  );

  const handleResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;
      const referenceWidth =
        Number.isFinite(containerWidthPx) && containerWidthPx > 0
          ? containerWidthPx
          : window.innerWidth;
      if (!(referenceWidth > 0)) return;
      const delta = dragState.startX - event.clientX;
      const startWidth = (referenceWidth * dragState.startRatio) / 100;
      const nextWidth = Math.max(COMPACT_MIN_PX, Math.min(COMPACT_MAX_PX, startWidth + delta));
      const nextRatioRaw = (nextWidth / referenceWidth) * 100;
      const nextRatio = normalizeLayoutSurfaceRatioInput(dragState.surface, nextRatioRaw);
      if (nextRatio === null) return;
      setLayoutSurfaceRatio(dragState.surface, nextRatio);
    },
    [containerWidthPx, setLayoutSurfaceRatio],
  );

  const endResize = useCallback(() => {
    dragStateRef.current = null;
  }, []);

  // Cmd+W (Mac) / Ctrl+W (Windows·Linux): close snapshot viewer first, then binder tab
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!((e.metaKey || e.ctrlKey) && e.key === "w")) return;
      if (selectedSnapshot !== null) {
        e.preventDefault();
        setSelectedSnapshot(null);
        return;
      }
      if (activeCompactTab !== null) {
        e.preventDefault();
        setActiveCompactTab(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCompactTab, selectedSnapshot]);

  return (
    <FocusHoverSidebar
      side="right"
      topOffset={sidebarTopOffset}
      activationWidthPx={RAIL_WIDTH_PX}
      closeDelayMs={180}
      suppressHoverOpen={suppressHoverOpen}
      forceOpen={(isPinned && activeCompactTab !== null) || selectedSnapshot !== null}
    >
      <div className="h-full flex flex-row">
        {/* Snapshot Viewer — rendered to the LEFT of the binder panel */}
        {selectedSnapshot !== null && (
          <div className="h-full w-[480px] shrink-0 border-l border-border/40 bg-panel overflow-hidden relative">
            <button
              type="button"
              onClick={() => setSelectedSnapshot(null)}
              className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded text-muted hover:text-fg hover:bg-surface-hover transition-colors"
              aria-label={t("snapshot.close")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <Suspense fallback={<div className="p-4 text-sm text-muted">{t("loading")}</div>}>
              <SnapshotViewer
                snapshot={selectedSnapshot}
                currentContent={activeChapterContent}
              />
            </Suspense>
          </div>
        )}

        {/* Binder panel — no backdrop-blur/shadow (FocusHoverSidebar owns the shadow) */}
        <div
          className="h-full border-l border-border/40 bg-panel overflow-hidden transition-[width] duration-150 ease-out"
          style={{
            width: activeCompactTab !== null ? activeContentWidth : RAIL_WIDTH_PX,
          }}
        >
          <div className="h-full flex flex-col">
            {activeCompactTab === null ? (
              <div className="flex-1 overflow-y-auto py-2 flex flex-col items-center gap-1.5">
                {tabItems.map((item) => (
                  <div key={item.tab} className="w-full px-1 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        void api.logger.info("compact-binder.open-tab", {
                          tab: item.tab,
                          source: "icon-button",
                        });
                        setActiveCompactTab(item.tab);
                      }}
                      title={item.title}
                      className="w-10 h-10 flex items-center justify-center rounded-full transition-[background-color,color,transform] duration-150 active:scale-95 text-muted hover:text-fg hover:bg-surface-hover"
                    >
                      {item.icon}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={cn(
                  "relative flex-1 min-h-0 overflow-hidden",
                  enableAnimations && "animate-in fade-in duration-150",
                )}
              >
                <div
                  role="separator"
                  aria-orientation="vertical"
                  className="absolute left-0 top-0 bottom-0 z-20 w-2 cursor-col-resize bg-transparent hover:bg-accent/20"
                  onPointerDown={handleResizePointerDown}
                  onPointerMove={handleResizePointerMove}
                  onPointerUp={endResize}
                  onPointerCancel={endResize}
                />
                <div className="h-10 px-3 border-b border-border/50 flex items-center justify-between text-xs font-medium text-fg/80">
                  <span className="truncate">
                    {tabItems.find((item) => item.tab === activeCompactTab)?.title ?? ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveCompactTab(null)}
                    className="ml-2 shrink-0 w-5 h-5 flex items-center justify-center rounded text-muted hover:text-fg hover:bg-surface-hover transition-colors"
                    aria-label={t("snapshot.close")}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="h-[calc(100%-2.5rem)] overflow-hidden">
                  <BinderSidebarPanelBody
                    activeChapterId={activeChapterId}
                    activeTab={activeCompactTab}
                    currentProjectId={currentProjectId}
                    onBackToSnapshotList={() => setActiveCompactTab("snapshot")}
                    onClose={() => setActiveCompactTab(null)}
                    onOpenSnapshot={setSelectedSnapshot}
                    isPinned={isPinned}
                    onTogglePinned={() => setIsPinned((prev) => !prev)}
                    t={t}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </FocusHoverSidebar>
  );
}
