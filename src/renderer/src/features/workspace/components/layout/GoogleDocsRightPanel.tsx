import { lazy, Suspense } from "react";
import { History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import Editor from "@renderer/features/editor/components/Editor";
import {
  toPanelPercentSize,
  toPanelPixelSize,
  type DocsLayoutPanelTab,
} from "@shared/constants/layoutSizing";

const ResearchPanel = lazy(
  () => import("@renderer/features/research/components/ResearchPanel"),
);
const WorldPanel = lazy(
  () => import("@renderer/features/research/components/WorldPanel"),
);
const SnapshotList = lazy(() =>
  import("@renderer/features/snapshot/components/SnapshotList").then((module) => ({
    default: module.SnapshotList,
  })),
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
  rightPanelMaxPx: number;
  rightPanelMinPx: number;
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
          <TrashList projectId={currentProjectId} refreshKey={trashRefreshKey} />
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
  rightPanelMaxPx,
  rightPanelMinPx,
  rightPanelRatio,
  trashRefreshKey,
}: GoogleDocsRightPanelProps) {
  if (!activeRightTab) {
    return null;
  }

  return (
    <>
      <PanelResizeHandle
        data-separator-feature={activePanelSurface}
        className="relative z-20 w-1 shrink-0 cursor-col-resize bg-border/40 transition-colors hover:bg-accent/60 focus-visible:bg-accent/60"
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </PanelResizeHandle>

      <Panel
        key={`right-context-panel-${activeRightTab}`}
        id={`right-context-panel-${activeRightTab}`}
        defaultSize={toPanelPercentSize(rightPanelRatio)}
        minSize={toPanelPixelSize(rightPanelMinPx)}
        maxSize={toPanelPixelSize(rightPanelMaxPx)}
        onMouseDownCapture={onFocus}
        className="flex min-w-0 shrink-0 flex-col overflow-hidden border-l border-border bg-background"
      >
        <div className="flex h-full flex-col">
          {activeRightTab === "character" && (
            <ResearchContent activeTab="character" onClose={closeRightPanel} />
          )}
          {activeRightTab === "world" && (
            <Suspense fallback={<LoadingFallback />}>
              <div className="h-full">
                <WorldPanel onClose={closeRightPanel} />
              </div>
            </Suspense>
          )}
          {activeRightTab === "event" && (
            <ResearchContent activeTab="event" onClose={closeRightPanel} />
          )}
          {activeRightTab === "faction" && (
            <ResearchContent activeTab="faction" onClose={closeRightPanel} />
          )}
          {activeRightTab === "scrap" && (
            <ResearchContent activeTab="scrap" onClose={closeRightPanel} />
          )}
          {activeRightTab === "analysis" && (
            <ResearchContent activeTab="analysis" onClose={closeRightPanel} />
          )}
          {activeRightTab === "editor" && (
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
          {activeRightTab === "export" && (
            <Suspense fallback={<LoadingFallback />}>
              <div className="h-full">
                <ExportPreviewPanel title={activeChapterTitle} />
              </div>
            </Suspense>
          )}
          {activeRightTab === "snapshot" && (
            <SnapshotPanel activeChapterId={activeChapterId} />
          )}
          {activeRightTab === "trash" && (
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
