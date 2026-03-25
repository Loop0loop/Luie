import { lazy, Suspense, useState, useEffect } from "react";
import { History } from "lucide-react";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { useTranslation } from "react-i18next";
import { Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import Editor from "@renderer/features/editor/components/Editor";
import {
  type ResponsivePanelSize,
  toPanelPercentSize,
  type DocsLayoutPanelTab,
} from "@shared/constants/layoutSizing";
import { getDocsRightPanelId } from "../../utils/docsLayoutModel";

const ResearchPanel = lazy(
  () => import("@renderer/features/research/components/ResearchPanel"),
);
const WorldPanel = lazy(
  () => import("@renderer/features/research/components/WorldPanel"),
);
const SnapshotList = lazy(() =>
  import("@renderer/features/snapshot/components/SnapshotList").then(
    (module) => ({
      default: module.SnapshotList,
    }),
  ),
);
const TrashList = lazy(() =>
  import("@renderer/features/trash/components/TrashList").then((module) => ({
    default: module.TrashList,
  })),
);
const ExportPreviewPanel = lazy(
  () => import("@renderer/features/export/components/ExportPreviewPanel"),
);

type GoogleDocsRightPanelProps = {
  activeChapterContent?: string;
  activeChapterId?: string;
  activeChapterTitle?: string;
  activePanelSurface: string | null;
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

function SnapshotPanel({ activeChapterId }: { activeChapterId?: string }) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/50 bg-sidebar px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
        {t("sidebar.section.snapshot")}
      </div>
      {activeChapterId ? (
        <Suspense
          fallback={
            <div className="px-4 py-4 text-center text-xs italic text-muted">
              {t("loading")}
            </div>
          }
        >
          <SnapshotList chapterId={activeChapterId} />
        </Suspense>
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
}) {
  const { currentProjectId, onRefreshTrash, trashRefreshKey } = props;
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border/50 bg-sidebar px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
        {t("sidebar.section.trash")}
        <button
          onClick={onRefreshTrash}
          className="ml-auto rounded p-1 hover:bg-surface-hover"
        >
          <History className="h-3 w-3 text-muted" />
        </button>
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
  activeTab: "analysis" | "character" | "event" | "faction" | "scrap";
  onClose: () => void;
}) {
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
  const [renderedTab, setRenderedTab] = useState(activeRightTab);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!activeRightTab || activeRightTab === renderedTab) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRenderedTab(activeRightTab);
    setIsClosing(false);
  }, [activeRightTab, renderedTab]);

  useEffect(() => {
    if (!activeRightTab && renderedTab) {
      if (enableAnimations) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsClosing(true);
        const timer = setTimeout(() => {
          setRenderedTab(null);
          setIsClosing(false);
        }, 200);
        return () => clearTimeout(timer);
      } else {
        setRenderedTab(null);
        return undefined;
      }
    }
    return undefined;
  }, [activeRightTab, enableAnimations, renderedTab]);

  if (!renderedTab || !rightPanelSize) {
    return null;
  }

  return (
    <>
      <PanelResizeHandle
        data-separator-feature={activePanelSurface}
        className={`relative z-20 w-1 shrink-0 cursor-col-resize bg-border/40 transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 ${
          enableAnimations && isClosing
            ? "opacity-0 transition-opacity duration-200"
            : ""
        }`}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </PanelResizeHandle>

      <Panel
        key={getDocsRightPanelId(renderedTab)}
        id={getDocsRightPanelId(renderedTab)}
        defaultSize={toPanelPercentSize(rightPanelRatio)}
        minSize={rightPanelSize.minSize}
        maxSize={rightPanelSize.maxSize}
        onMouseDownCapture={onFocus}
        className={`flex min-w-0 shrink-0 flex-col overflow-hidden border-l border-border bg-background ${
          enableAnimations
            ? isClosing
              ? "animate-out slide-out-to-right fade-out duration-200"
              : "animate-in slide-in-from-right fade-in duration-200"
            : ""
        }`}
      >
        <div className="flex h-full flex-col">
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
          {renderedTab === "analysis" && (
            <ResearchContent activeTab="analysis" onClose={closeRightPanel} />
          )}
          {renderedTab === "editor" && (
            <div className="h-full">
              <Editor
                key={`docs-side-editor-${activeChapterId ?? "none"}`}
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
            <SnapshotPanel activeChapterId={activeChapterId} />
          )}
          {renderedTab === "trash" && (
            <TrashPanel
              currentProjectId={currentProjectId}
              onRefreshTrash={onRefreshTrash}
              trashRefreshKey={trashRefreshKey}
            />
          )}
        </div>
      </Panel>
    </>
  );
}
