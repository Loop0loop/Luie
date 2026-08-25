import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ChevronLeft, History, X } from "lucide-react";
import type { Snapshot } from "@shared/types";
import { Editor, useEditorStore } from "@renderer/domains/editor";
import { useChapterStore } from "@renderer/domains/manuscript";
import { AIPanel } from "@renderer/features/ai";
import { useTranslation } from "react-i18next";
import {
  Panel,
  Separator as PanelResizeHandle,
  type PanelImperativeHandle,
} from "react-resizable-panels";
import {
  getLayoutSurfaceDefaultRatio,
  type ResponsivePanelSize,
  toPanelPercentSize,
  type DocsLayoutPanelTab,
  type LayoutSurfaceId,
} from "@renderer/shared/constants/layoutSizing";
import { beginLayoutRestoring } from "@renderer/features/workspace/hooks/useProjectLayoutPersistence";
import { useResizablePanelPresence } from "@renderer/features/workspace/hooks/useResizablePanelPresence";

const ResearchPanel = lazy(() =>
  import("@renderer/domains/world").then((module) => ({
    default: module.ResearchPanel,
  })),
);
const WorldPanel = lazy(() =>
  import("@renderer/domains/world").then((module) => ({
    default: module.WorldPanel,
  })),
);
const SnapshotList = lazy(() =>
  import("@renderer/features/snapshot/components/SnapshotList").then(
    (module) => ({
      default: module.SnapshotList,
    }),
  ),
);
const SnapshotViewer = lazy(() =>
  import("@renderer/features/snapshot/components/SnapshotViewer").then(
    (module) => ({
      default: module.default,
    }),
  ),
);
const TrashList = lazy(() =>
  import("@renderer/features/trash/components/TrashList").then((module) => ({
    default: module.TrashList,
  })),
);
const ExportPreviewPanel = lazy(() =>
  import("@renderer/domains/export").then((module) => ({
    default: module.ExportPreviewPanel,
  })),
);

type GoogleDocsRightPanelProps = {
  activeChapterContent?: string;
  activeChapterId?: string;
  activeChapterTitle?: string;
  activePanelSurface: LayoutSurfaceId | null;
  activeRightTab: DocsLayoutPanelTab | null;
  closeRightPanel: () => void;
  currentProjectId?: string;
  onFocus: () => void;
  onRefreshTrash: () => void;
  onSaveChapter?: (title: string, content: string) => void | Promise<void>;
  rightPanelSize: ResponsivePanelSize | null;
  rightPanelRatio: number;
  trashRefreshKey: number;
};

function LoadingFallback() {
  const { t } = useTranslation();
  return <div className="p-4 text-sm text-muted">{t("loading")}</div>;
}

function SnapshotPanel({
  activeChapterId,
  activeChapterContent,
  activeChapterTitle,
  onSaveChapter,
  onClose,
}: {
  activeChapterId?: string;
  activeChapterContent?: string;
  activeChapterTitle?: string;
  onSaveChapter?: (title: string, content: string) => void | Promise<void>;
  onClose?: () => void;
}) {
  const { t } = useTranslation();
  // NOTE: 목록 → diff 전환을 우측 패널 덮어쓰기로 처리한다. 분할 패널로 띄우면
  // 공간이 부족해 diff 가독성이 떨어진다(GoogleDocs 레이아웃 한정 UX).
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(
    null,
  );

  return (
    <div className="relative flex h-full flex-col pt-2">
      {selectedSnapshot && (
        <button
          type="button"
          onClick={() => setSelectedSnapshot(null)}
          className="absolute left-2 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-panel text-muted shadow-sm transition-colors hover:bg-surface-hover hover:text-fg"
          title={t("back", "뒤로가기")}
          aria-label={t("back", "뒤로가기")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      <div className="flex h-11 shrink-0 items-center justify-between px-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">
          {t("sidebar.section.snapshot")}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-hover hover:text-fg"
            title={t("sidebar.toggle.close")}
            aria-label={t("sidebar.toggle.close")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {activeChapterId ? (
        selectedSnapshot ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <Suspense fallback={<LoadingFallback />}>
              <SnapshotViewer
                key={selectedSnapshot.id}
                snapshot={selectedSnapshot}
                currentContent={activeChapterContent ?? ""}
                onApplySnapshotText={async (nextContent) => {
                  if (!onSaveChapter) return;
                  await onSaveChapter(activeChapterTitle ?? "", nextContent);
                }}
              />
            </Suspense>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="px-4 py-4 text-center text-xs italic text-muted">
                {t("loading")}
              </div>
            }
          >
            <SnapshotList
              chapterId={activeChapterId}
              onOpenSnapshot={setSelectedSnapshot}
            />
          </Suspense>
        )
      ) : (
        <div className="px-4 py-4 text-center text-xs italic text-muted">
          {t("snapshot.list.selectChapter")}
        </div>
      )}
    </div>
  );
}

function TrashPanel(props: {
  currentProjectId?: string;
  onRefreshTrash: () => void;
  trashRefreshKey: number;
  onClose?: () => void;
}) {
  const { currentProjectId, onRefreshTrash, trashRefreshKey, onClose } = props;
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col pt-2">
      <div className="flex h-11 shrink-0 items-center gap-2 px-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">
          {t("sidebar.section.trash")}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onRefreshTrash}
            className="flex size-7 items-center justify-center rounded p-1 text-muted transition-colors hover:bg-surface-hover hover:text-fg"
            title="새로고침"
            aria-label="새로고침"
          >
            <History className="h-3.5 w-3.5" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-hover hover:text-fg"
              title={t("sidebar.toggle.close")}
              aria-label={t("sidebar.toggle.close")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {currentProjectId ? (
        <Suspense
          fallback={
            <div className="px-4 py-4 text-center text-xs italic text-muted">
              {t("loading")}
            </div>
          }
        >
          <TrashList
            projectId={currentProjectId}
            refreshKey={trashRefreshKey}
          />
        </Suspense>
      ) : (
        <div className="px-4 py-4 text-center text-xs italic text-muted">
          {t("sidebar.trashEmpty")}
        </div>
      )}
    </div>
  );
}

function ResearchContent(props: {
  activeTab:
    | "analysis"
    | "character"
    | "event"
    | "faction"
    | "scrap"
    | "plotboard"
    | "untitled";
  onClose: () => void;
}) {
  if (props.activeTab === "analysis") {
    return <AIPanel onClose={props.onClose} />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <div className="h-full">
        <ResearchPanel activeTab={props.activeTab} onClose={props.onClose} />
      </div>
    </Suspense>
  );
}

export function GoogleDocsRightPanel({
  activeChapterContent,
  activeChapterId,
  activeChapterTitle,
  activePanelSurface,
  activeRightTab,
  closeRightPanel,
  currentProjectId,
  onFocus,
  onRefreshTrash,
  onSaveChapter,
  rightPanelSize,
  rightPanelRatio,
  trashRefreshKey,
}: GoogleDocsRightPanelProps) {
  const enableAnimations = useEditorStore((state) => state.enableAnimations);
  // NOTE: 스냅샷 복원 시 같은 챕터의 본문이 바뀌므로 리비전을 key에 넣어 Editor를 리마운트한다.
  const contentRevision = useChapterStore((state) => state.contentRevision);
  const [renderedTab, setRenderedTab] = useState(activeRightTab);
  const isResearchTab = [
    "character",
    "event",
    "faction",
    "scrap",
    "plotboard",
    "untitled",
  ].includes(renderedTab ?? "");
  const restoreFrameRef = useRef<number | null>(null);
  const panelRef = useRef<PanelImperativeHandle | null>(null);
  const safeRatio =
    typeof rightPanelRatio === "number" &&
    Number.isFinite(rightPanelRatio) &&
    rightPanelRatio >= 5
      ? rightPanelRatio
      : (activePanelSurface ? getLayoutSurfaceDefaultRatio(activePanelSurface) : 36);

  const {
    isClosing,
    isOpening,
    shouldRender: shouldRenderPanel,
  } = useResizablePanelPresence({
    enableAnimations,
    isOpen: Boolean(activeRightTab),
    openSize: toPanelPercentSize(safeRatio),
    panelRef,
  });

  useLayoutEffect(() => {
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
  }, [activeRightTab, safeRatio]);

  useEffect(() => {
    if (!activeRightTab || activeRightTab === renderedTab) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 닫기 transition 동안 이전 tab을 유지한 뒤 교체한다.
    setRenderedTab(activeRightTab);
  }, [activeRightTab, renderedTab]);

  useEffect(() => {
    if (shouldRenderPanel || !renderedTab) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 닫기 transition이 끝난 뒤 rendered tab을 비운다.
    setRenderedTab(null);
  }, [renderedTab, shouldRenderPanel]);

  if (!shouldRenderPanel || !renderedTab || !rightPanelSize) {
    return null;
  }

  return (
    <>
      <PanelResizeHandle
        data-separator-feature={activePanelSurface}
        className={`relative z-20 w-1 shrink-0 cursor-col-resize bg-transparent ${
          enableAnimations && isClosing
            ? "opacity-0 transition-opacity duration-200"
            : ""
        }`}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </PanelResizeHandle>

      <Panel
        key={renderedTab}
        id={`right-context-panel-${renderedTab}`}
        panelRef={panelRef}
        collapsible
        collapsedSize={0}
        data-panel-animated={isOpening || isClosing ? "true" : undefined}
        groupResizeBehavior="preserve-pixel-size"
        defaultSize={toPanelPercentSize(safeRatio)}
        minSize={rightPanelSize.minSize}
        maxSize={rightPanelSize.maxSize}
        onMouseDownCapture={onFocus}
        className={`flex min-w-0 shrink-0 flex-col overflow-hidden ${
          renderedTab === "analysis"
            ? "rounded-r-[24px] bg-[var(--ai-panel-bg,#323232)]"
            : isResearchTab
              ? "research-surface bg-[#212123]"
              : "bg-[#212123]"
        } ${
          enableAnimations
            ? isClosing
              ? "animate-out slide-out-to-right fade-out duration-200"
              : "animate-in slide-in-from-right fade-in duration-200"
            : ""
        }`}
      >
        {shouldRenderPanel && renderedTab && (
          <div
            className={`flex h-full flex-col ${
              isResearchTab || renderedTab === "world" ? "pt-[40px]" : ""
            }`}
          >
            {renderedTab === "character" && (
              <ResearchContent activeTab="character" onClose={closeRightPanel} />
            )}
            {renderedTab === "world" && (
              <Suspense fallback={<LoadingFallback />}>
                <div className="h-full">
                  <WorldPanel onClose={closeRightPanel} />
                </div>
              </Suspense>
            )}
            {renderedTab === "event" && (
              <ResearchContent activeTab="event" onClose={closeRightPanel} />
            )}
            {renderedTab === "faction" && (
              <ResearchContent activeTab="faction" onClose={closeRightPanel} />
            )}
            {renderedTab === "scrap" && (
              <ResearchContent activeTab="scrap" onClose={closeRightPanel} />
            )}
            {renderedTab === "plotboard" && (
              <ResearchContent activeTab="plotboard" onClose={closeRightPanel} />
            )}
            {renderedTab === "untitled" && (
              <ResearchContent activeTab="untitled" onClose={closeRightPanel} />
            )}
            {renderedTab === "analysis" && (
              <ResearchContent activeTab="analysis" onClose={closeRightPanel} />
            )}
            {renderedTab === "editor" && (
              <div className="h-full">
                <Editor
                  key={`docs-side-editor-${activeChapterId ?? "none"}-${contentRevision}`}
                  chapterId={activeChapterId ?? undefined}
                  initialTitle={activeChapterTitle ?? ""}
                  initialContent={activeChapterContent ?? ""}
                  onSave={onSaveChapter}
                  hideFooter
                  hideToolbar
                  hideTitle
                  scrollable
                />
              </div>
            )}
            {renderedTab === "export" && (
              <Suspense fallback={<LoadingFallback />}>
                <div className="h-full">
                  <ExportPreviewPanel title={activeChapterTitle} />
                </div>
              </Suspense>
            )}
            {renderedTab === "snapshot" && (
              <SnapshotPanel
                key={activeChapterId ?? "none"}
                activeChapterId={activeChapterId}
                activeChapterContent={activeChapterContent}
                activeChapterTitle={activeChapterTitle}
                onSaveChapter={onSaveChapter}
                onClose={closeRightPanel}
              />
            )}
            {renderedTab === "trash" && (
              <TrashPanel
                currentProjectId={currentProjectId}
                onRefreshTrash={onRefreshTrash}
                trashRefreshKey={trashRefreshKey}
                onClose={closeRightPanel}
              />
            )}
          </div>
        )}
      </Panel>
    </>
  );
}
