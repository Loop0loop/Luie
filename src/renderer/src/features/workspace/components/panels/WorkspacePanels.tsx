import React, { Fragment, Suspense } from "react";
import { Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import { useTranslation } from "react-i18next";
import { BookOpen, X } from "lucide-react";
import { Editor } from "@renderer/domains/editor";
import type { ResizablePanelData } from "@renderer/features/workspace/stores/uiStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import type { Chapter } from "@shared/types";
import { toPercentSize } from "@renderer/shared/constants/sidebarSizing";
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

  return (
    <>
      {panels.map((panel) => (
        <Fragment key={panel.id}>
          <PanelResizeHandle className="relative z-50 w-0 cursor-col-resize">
            <div className="absolute inset-y-0 -left-1 -right-1" />
          </PanelResizeHandle>
          <Panel
            id={panel.id}
            groupResizeBehavior="preserve-pixel-size"
            defaultSize={toPercentSize(panel.size)}
            minSize={panel.content.type === "research" ? "420px" : SPLIT_PANEL_MIN_SIZE_PERCENT}
            onMouseDownCapture={() => {
              setFocusedClosableTarget({ kind: "panel", id: panel.id });
            }}
            className={`min-w-0 relative flex flex-col ${
              panel.content.type === "research" ? "bg-research" : "bg-panel"
            }`}
          >
            <div
              className={`flex h-12 shrink-0 items-center px-4 pr-12 ${
                panel.content.type === "research"
                  ? "bg-research"
                  : "border-b border-border bg-sidebar"
              }`}
            >
              {panel.content.type === "research" ? (
                <>
                  <BookOpen className="icon-sm shrink-0 text-muted" aria-hidden="true" />
                  <h1 className="ml-2 text-sm font-semibold text-fg">
                    {t("sidebar.section.research", "자료")}
                  </h1>
                </>
              ) : (
                <span className="text-xs font-medium text-muted">
                  {panel.content.type}
                </span>
              )}
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
            </div>

            <div className="flex-1 overflow-hidden relative">
              <Suspense
                fallback={<div style={{ padding: 20 }}>{t("loading")}</div>}
              >
                {panel.content.type === "research" ? (
                  <ResearchPanel
                    activeTab={panel.content.tab || "character"}
                    onClose={() => removePanel(panel.id)}
                  />
                ) : panel.content.type === "snapshot" &&
                  panel.content.snapshot ? (
                  (() => {
                    const snapshotChapter = chapters.find(
                      (c) =>
                        c.projectId === currentProjectId &&
                        c.id === panel.content.snapshot?.chapterId,
                    );
                    return (
                      <SnapshotViewer
                        snapshot={panel.content.snapshot}
                        currentContent={snapshotChapter?.content ?? ""}
                        onApplySnapshotText={async (nextContent: string) => {
                          const targetChapterId =
                            snapshotChapter?.id ?? activeChapterId;
                          const targetTitle =
                            snapshotChapter?.title ?? activeChapterTitle;
                          if (!targetChapterId) return;
                          await onSave(
                            targetTitle,
                            nextContent,
                            targetChapterId,
                          );
                        }}
                      />
                    );
                  })()
                ) : panel.content.type === "export" ? (
                  <ExportPreviewPanel title={activeChapterTitle} />
                ) : (
                  <div
                    style={{
                      height: "100%",
                      overflow: "hidden",
                      background: "var(--bg-primary)",
                    }}
                  >
                    <Editor
                      initialTitle={
                        chapters.find((c) => c.id === panel.content.id)?.title
                      }
                      initialContent=""
                      readOnly={true}
                    />
                  </div>
                )}
              </Suspense>
            </div>
          </Panel>
        </Fragment>
      ))}
    </>
  );
}
