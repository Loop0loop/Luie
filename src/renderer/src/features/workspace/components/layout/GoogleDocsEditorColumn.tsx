import { useCallback, type ReactNode } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { Group as PanelGroup, Panel, type Layout } from "react-resizable-panels";
import { EditorDropZones } from "@shared/ui/EditorDropZones";
import { EditorRuler, EditorToolbar } from "@renderer/domains/editor";
import StatusFooter from "@shared/ui/StatusFooter";
import {
  EDITOR_A4_PAGE_HEIGHT_PX,
  EDITOR_A4_PAGE_WIDTH_PX,
  EDITOR_PAGE_VERTICAL_PADDING_PX,
} from "@renderer/shared/constants/editorLayout";
import { toPercentSize } from "@renderer/shared/constants/sidebarSizing";
import { getPanelLayoutValue } from "@renderer/features/workspace/hooks/useLayoutPersist";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import type { DocsPageMargins } from "./googleDocsLayout.types";

type GoogleDocsEditorColumnProps = {
  additionalPanelIds: string[];
  additionalPanels?: ReactNode;
  children: ReactNode;
  editor?: TiptapEditor | null;
  onOpenExport?: () => void;
  onOpenWorldGraph?: () => void;
  onOpenCanvas?: () => void;
  onCloseCanvas?: () => void;
  isCanvasMode?: boolean;
  pageMargins: DocsPageMargins;
  setPageMargins: (margins: DocsPageMargins) => void;
};

export function GoogleDocsEditorColumn({
  additionalPanelIds,
  additionalPanels,
  children,
  editor,
  onOpenExport,
  onOpenWorldGraph,
  onOpenCanvas,
  onCloseCanvas,
  isCanvasMode = false,
  pageMargins,
  setPageMargins,
}: GoogleDocsEditorColumnProps) {
  const updatePanelSize = useUIStore((state) => state.updatePanelSize);
  const handleDocsEditorLayoutChanged = useCallback(
    (layout: Layout) => {
      additionalPanelIds.forEach((panelId, panelIndex) => {
        const rawSize = getPanelLayoutValue(layout, panelId, panelIndex + 1);
        if (typeof rawSize !== "number" || !Number.isFinite(rawSize)) return;
        updatePanelSize(panelId, rawSize);
      });
    },
    [additionalPanelIds, updatePanelSize],
  );

  return (
    <Panel
      id="center-content"
      minSize={toPercentSize(10)}
      className="relative z-0 flex min-w-0 flex-1 flex-col bg-secondary/30 transition-colors duration-200"
    >
      {(editor || isCanvasMode) && (
        <div className="relative z-40 flex w-full shrink-0">
          <EditorToolbar
            editor={editor ?? null}
            onOpenPreview={onOpenExport}
            onOpenExport={onOpenExport}
            canOpenExport={Boolean(onOpenExport)}
            onOpenWorldGraph={onOpenWorldGraph}
            onOpenCanvas={onOpenCanvas}
            onCloseCanvas={onCloseCanvas}
            isCanvasMode={isCanvasMode}
          />
        </div>
      )}

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <PanelGroup
          orientation="horizontal"
          className="relative flex h-full w-full flex-1 overflow-hidden"
          id="docs-editor-split-group"
          onLayoutChanged={handleDocsEditorLayoutChanged}
        >
          <Panel
            id="editor-main-panel"
            minSize={toPercentSize(10)}
            className="relative flex min-w-0 flex-col bg-transparent"
          >
            <EditorDropZones />
            {isCanvasMode ? (
              /* Canvas mode: full-height, no A4 page wrapper */
              <div className="flex flex-1 flex-col overflow-hidden">
                {children}
              </div>
            ) : (
              <main
                className="custom-scrollbar relative flex flex-1 flex-col items-center overflow-y-scroll bg-sidebar"
                data-editor-scroll-container="true"
              >
                <div className="sticky top-0 z-30 flex w-full shrink-0 justify-center bg-sidebar/95 pb-2 pt-4 select-none backdrop-blur-sm">
                  <div className="border border-border bg-background shadow-sm">
                    <EditorRuler onMarginsChange={setPageMargins} />
                  </div>
                </div>

                <div
                  className="relative mb-8 box-border flex min-h-0 flex-col border border-border bg-background shadow-sm transition-shadow duration-150 ease-in-out"
                  style={{
                    width: `${EDITOR_A4_PAGE_WIDTH_PX}px`,
                    minHeight: `${EDITOR_A4_PAGE_HEIGHT_PX}px`,
                    paddingTop: `${EDITOR_PAGE_VERTICAL_PADDING_PX}px`,
                    paddingBottom: `${EDITOR_PAGE_VERTICAL_PADDING_PX}px`,
                    paddingLeft: `${pageMargins.left}px`,
                    paddingRight: `${pageMargins.right}px`,
                    color: "var(--editor-text, var(--text-primary))",
                  }}
                >
                  {children}
                </div>
              </main>
            )}
            <StatusFooter onOpenExport={onOpenExport} />
          </Panel>

          {additionalPanels}
          {additionalPanelIds.length === 0 && (
            <Panel
              id="docs-editor-placeholder"
              defaultSize={0}
              minSize={0}
              maxSize={0}
              className="pointer-events-none overflow-hidden opacity-0"
            />
          )}
        </PanelGroup>
      </div>
    </Panel>
  );
}
