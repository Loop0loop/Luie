import React, { Fragment, Suspense } from "react";
import { Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import { useTranslation } from "react-i18next";
import { BookOpen, X } from "lucide-react";
import { Editor } from "@renderer/domains/editor";
import { useChapterStore } from "@renderer/domains/manuscript";
import type { ResizablePanelData } from "@renderer/features/workspace/stores/uiStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import type { Chapter } from "@shared/types";
import { toPercentSize } from "@renderer/shared/constants/sidebarSizing";
import { EDITOR_DND_MIN_PANEL_WIDTH_PX } from "@renderer/shared/constants/editorLayout";
import { SPLIT_PANEL_MIN_SIZE_PERCENT } from "@renderer/shared/constants/layoutSizing";

const ResearchPanel = React.lazy(() =>
  import("@renderer/domains/world").then((module) => ({
    default: module.ResearchPanel,
  })),
);
const SnapshotViewer = React.lazy(
  () => import("@renderer/features/snapshot/components/SnapshotViewer"),
);
const ExportPreviewPanel = React.lazy(() =>
  import("@renderer/domains/export").then((module) => ({
    default: module.ExportPreviewPanel,
  })),
);

interface WorkspacePanelsProps {
  panels: ResizablePanelData[];
  removePanel: (id: string) => void;
  chapters: Chapter[];
  currentProjectId?: string;
  activeChapterId?: string;
  activeChapterTitle: string;
  onSave: (title: string, content: string, chapterId?: string) => Promise<void>;
}

export function WorkspacePanels({
  panels,
  removePanel,
  chapters,
  currentProjectId,
  activeChapterId,
  activeChapterTitle,
  onSave,
}: WorkspacePanelsProps) {
  const { t } = useTranslation();
  const setFocusedClosableTarget = useUIStore(
    (state) => state.setFocusedClosableTarget,
  );
  // NOTE: 스냅샷 복원 시 같은 챕터의 본문이 바뀌므로 리비전을 key에 넣어 Editor를 리마운트한다.
  const contentRevision = useChapterStore(
    (state) => state.contentRevision,
  );

  return (
    <>
      {panels.map((panel) => {
        const isResearchPanel = panel.content.type === "research";
        const isEditorPanel = panel.content.type === "editor";
        const snapshot =
          panel.content.type === "snapshot"
            ? panel.content.snapshot
            : undefined;
        const snapshotChapter = snapshot
          ? chapters.find(
              (chapter) =>
                chapter.projectId === currentProjectId &&
                chapter.id === snapshot.chapterId,
            )
          : undefined;
        const editorChapter =
          panel.content.type === "editor"
            ? chapters.find((chapter) => chapter.id === panel.content.id)
            : undefined;

        return (
          <Fragment key={panel.id}>
            <PanelResizeHandle className="relative z-50 w-0 cursor-col-resize">
              <div className="absolute inset-y-0 -left-1 -right-1" />
            </PanelResizeHandle>
            <Panel
              id={panel.id}
              groupResizeBehavior="preserve-pixel-size"
              defaultSize={toPercentSize(panel.size)}
              minSize={
                isResearchPanel
                  ? "420px"
                  : isEditorPanel
                    ? `${EDITOR_DND_MIN_PANEL_WIDTH_PX}px`
                    : SPLIT_PANEL_MIN_SIZE_PERCENT
              }
              onMouseDownCapture={() => {
                setFocusedClosableTarget({ kind: "panel", id: panel.id });
              }}
              className={`min-w-0 relative flex flex-col ${
                isResearchPanel || panel.content.type === "snapshot" || isEditorPanel
                  ? "bg-research border-0 outline-none"
                  : "bg-panel"
              }`}
            >
              <div
                className={`flex h-12 shrink-0 items-center px-4 pr-12 ${
                  isResearchPanel || panel.content.type === "snapshot" || isEditorPanel
                    ? "bg-research border-0 outline-none"
                    : "border-b border-border bg-sidebar"
                }`}
              >
                {isResearchPanel ? (
                  <>
                    <BookOpen
                      className="icon-sm shrink-0 text-muted"
                      aria-hidden="true"
                    />
                    <h1 className="ml-2 text-sm font-semibold text-fg">
                      {t("sidebar.section.research", "자료")}
                    </h1>
                  </>
                ) : (
                  <span className="text-xs font-medium text-muted">
                    {panel.content.type}
                  </span>
                )}
                {!isResearchPanel && !isEditorPanel && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusedClosableTarget({ kind: "panel", id: panel.id });
                      removePanel(panel.id);
                    }}
                    className="ml-auto flex size-8 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    aria-label={t("sidebar.toggle.close")}
                    title={t("sidebar.toggle.close")}
                  >
                    <X className="icon-sm" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-hidden relative">
                <Suspense
                  fallback={<div style={{ padding: 20 }}>{t("loading")}</div>}
                >
                  {isResearchPanel ? (
                    <ResearchPanel
                      activeTab={panel.content.tab || "character"}
                      onClose={() => removePanel(panel.id)}
                    />
                  ) : snapshot ? (
                    <SnapshotViewer
                      snapshot={snapshot}
                      currentContent={snapshotChapter?.content ?? ""}
                      onApplySnapshotText={async (nextContent: string) => {
                        const targetChapterId =
                          snapshotChapter?.id ?? activeChapterId;
                        const targetTitle =
                          snapshotChapter?.title ?? activeChapterTitle;
                        if (!targetChapterId) return;
                        await onSave(targetTitle, nextContent, targetChapterId);
                      }}
                    />
                  ) : panel.content.type === "export" ? (
                    <ExportPreviewPanel title={activeChapterTitle} />
                  ) : (
                    <div
                      className="research-surface h-full overflow-hidden border-0 outline-none"
                    >
                      <Editor
                        key={`dnd-editor-${editorChapter?.id ?? panel.id}-${contentRevision}`}
                        initialTitle={editorChapter?.title ?? ""}
                        initialContent={editorChapter?.content ?? ""}
                        chapterId={editorChapter?.id}
                        readOnly={false}
                        hideToolbar={true}
                        hideFooter={true}
                        onSave={
                          editorChapter
                            ? (title, content) =>
                                onSave(title, content, editorChapter.id)
                            : undefined
                        }
                      />
                    </div>
                  )}
                </Suspense>
              </div>
            </Panel>
          </Fragment>
        );
      })}
    </>
  );
}
