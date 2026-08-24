import React, { Fragment, Suspense, useEffect, useRef, useState } from "react";
import {
  Panel,
  Separator as PanelResizeHandle,
  type PanelImperativeHandle,
} from "react-resizable-panels";
import { useTranslation } from "react-i18next";
import { BookOpen, X } from "lucide-react";
import { Editor, useEditorStore } from "@renderer/domains/editor";
import { useChapterStore } from "@renderer/domains/manuscript";
import type { ResizablePanelData } from "@renderer/features/workspace/stores/uiStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import type { Chapter } from "@shared/types";
import { toPercentSize } from "@renderer/shared/constants/sidebarSizing";
import { EDITOR_DND_MIN_PANEL_WIDTH_PX } from "@renderer/shared/constants/editorLayout";
import { SPLIT_PANEL_MIN_SIZE_PERCENT } from "@renderer/shared/constants/layoutSizing";
import { useResizablePanelPresence } from "@renderer/features/workspace/hooks/useResizablePanelPresence";

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

type AnimatedWorkspacePanelProps = {
  children: (onClose: () => void) => React.ReactNode;
  panel: ResizablePanelData;
  removePanel: (id: string) => void;
};

function AnimatedWorkspacePanel({
  children,
  panel,
  removePanel,
}: AnimatedWorkspacePanelProps) {
  const { t } = useTranslation();
  const setFocusedClosableTarget = useUIStore(
    (state) => state.setFocusedClosableTarget,
  );
  const panelRef = useRef<PanelImperativeHandle | null>(null);
  const hasOpenedRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const enableAnimations = useEditorStore((state) => state.enableAnimations);
  const { isClosing, isOpening, shouldRender } = useResizablePanelPresence({
    enableAnimations,
    isOpen,
    openSize: toPercentSize(panel.size),
    panelRef,
  });
  const isResearchPanel = panel.content.type === "research";
  const isEditorPanel = panel.content.type === "editor";

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setIsOpen(true));
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (isOpen) {
      hasOpenedRef.current = true;
      return;
    }
    if (hasOpenedRef.current && !shouldRender) {
      removePanel(panel.id);
    }
  }, [isOpen, panel.id, removePanel, shouldRender]);

  if (!shouldRender) return null;

  const closePanel = () => setIsOpen(false);

  return (
    <Fragment>
      <PanelResizeHandle className="relative z-50 w-0 cursor-col-resize">
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </PanelResizeHandle>
      <Panel
        id={panel.id}
        panelRef={panelRef}
        collapsible
        collapsedSize={0}
        data-panel-animated={isOpening || isClosing ? "true" : undefined}
        groupResizeBehavior="preserve-pixel-size"
        defaultSize={0}
        minSize={
          isResearchPanel
            ? "470px"
            : isEditorPanel
              ? `${EDITOR_DND_MIN_PANEL_WIDTH_PX}px`
              : SPLIT_PANEL_MIN_SIZE_PERCENT
        }
        onMouseDownCapture={() => {
          setFocusedClosableTarget({ kind: "panel", id: panel.id });
        }}
        className={`relative flex min-w-0 flex-col ${
          isResearchPanel || panel.content.type === "snapshot" || isEditorPanel
            ? "bg-research border-0 outline-none"
            : "bg-panel"
        } ${
          enableAnimations
            ? isClosing
              ? "animate-out slide-out-to-right fade-out duration-200"
              : "animate-in slide-in-from-right fade-in duration-200"
            : ""
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
          {!isResearchPanel && !isEditorPanel && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                closePanel();
              }}
              className="ml-auto flex size-8 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={t("sidebar.toggle.close")}
              title={t("sidebar.toggle.close")}
            >
              <X className="icon-sm" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="relative flex-1 overflow-hidden">{children(closePanel)}</div>
      </Panel>
    </Fragment>
  );
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
  // NOTE: 스냅샷 복원 시 같은 챕터의 본문이 바뀌므로 리비전을 key에 넣어 Editor를 리마운트한다.
  const contentRevision = useChapterStore(
    (state) => state.contentRevision,
  );

  return (
    <>
      {panels.map((panel) => {
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
          <AnimatedWorkspacePanel
            key={panel.id}
            panel={panel}
            removePanel={removePanel}
          >
            {(onClose) => (
              <Suspense fallback={<div className="p-5">{t("loading")}</div>}>
                {panel.content.type === "research" ? (
                  <ResearchPanel
                    activeTab={panel.content.tab || "character"}
                    onClose={onClose}
                  />
                ) : snapshot ? (
                  <SnapshotViewer
                    snapshot={snapshot}
                    currentContent={snapshotChapter?.content ?? ""}
                    onApplySnapshotText={async (nextContent: string) => {
                      const targetChapterId = snapshotChapter?.id ?? activeChapterId;
                      const targetTitle = snapshotChapter?.title ?? activeChapterTitle;
                      if (!targetChapterId) return;
                      await onSave(targetTitle, nextContent, targetChapterId);
                    }}
                  />
                ) : panel.content.type === "export" ? (
                  <ExportPreviewPanel title={activeChapterTitle} />
                ) : (
                  <div className="research-surface h-full overflow-hidden border-0 outline-none">
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
                          ? (title, content) => onSave(title, content, editorChapter.id)
                          : undefined
                      }
                    />
                  </div>
                )}
              </Suspense>
            )}
          </AnimatedWorkspacePanel>
        );
      })}
    </>
  );
}
