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
  activeChapterId?: string;
  children: ReactNode;
  editor?: TiptapEditor | null;
  onOpenExport?: () => void;
  onOpenWorldGraph?: () => void;
  onOpenCanvas?: () => void;
  onCloseCanvas?: () => void;
  isCanvasMode?: boolean;
  isMobileView?: boolean;
  onToggleMobileView?: () => void;
  pageMargins: DocsPageMargins;
  setPageMargins: (margins: DocsPageMargins) => void;
};

export function GoogleDocsEditorColumn({
  additionalPanelIds,
  additionalPanels,
  activeChapterId,
  children,
  editor,
  onOpenExport,
  onOpenWorldGraph,
  onOpenCanvas,
  onCloseCanvas,
  isCanvasMode = false,
  isMobileView = false,
  onToggleMobileView,
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
      className="relative z-0 flex min-w-0 flex-1 flex-col overflow-hidden bg-app transition-colors duration-200"
    >
      {(editor || isCanvasMode) && (
        <div className="relative z-40 flex w-full shrink-0">
          <EditorToolbar
            editor={editor ?? null}
            onOpenPreview={onOpenExport}
            onOpenExport={onOpenExport}
            canOpenExport={Boolean(activeChapterId)}
            isMobileView={isMobileView}
            onToggleMobileView={onToggleMobileView}
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
              <div className="flex flex-1 flex-col overflow-hidden">
                {children}
              </div>
            ) : (
              <main
                className="custom-scrollbar relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-app"
                data-editor-scroll-container="true"
              >
                <div className="sticky top-0 z-30 flex w-full shrink-0 justify-center bg-app/95 pb-2 pt-4 select-none backdrop-blur-sm">
                  <div>
                    <EditorRuler onMarginsChange={setPageMargins} />
                  </div>
                </div>

                {/* NOTE: shrink-0 필수 — flex 자식이라 수축하면 minHeight(1123px)이 상한처럼 동작해
                    긴 본문이 아웃라인 아래로 새어 나간다.
                    배경은 `bg-transparent`가 아니라 종이 역할 토큰을 쓴다. A4 면이 자기 배경을
                    갖지 않으면 뒤의 스크롤 표면이 그대로 비쳐, 종이와 작업대가 같은 면이 된다.
                    `--editor-bg`는 현재 `--bg-app` alias라 렌더 결과는 같고, 종이색이 표면에서
                    갈라질 때 이 지점이 함께 따라간다. */}
                <div
                  className={`relative mb-8 box-border block shrink-0 border border-border bg-editor-bg ${
                    isMobileView
                      ? "h-[95%] shrink-0 overflow-hidden border-0"
                      : ""
                  }`}
                  style={{
                    width: `${isMobileView ? 450 : EDITOR_A4_PAGE_WIDTH_PX}px`,
                    maxWidth: isMobileView ? "450px" : undefined,
                    minHeight: isMobileView
                      ? undefined
                      : `${EDITOR_A4_PAGE_HEIGHT_PX}px`,
                    paddingTop: isMobileView
                      ? 0
                      : `${EDITOR_PAGE_VERTICAL_PADDING_PX}px`,
                    paddingBottom: isMobileView
                      ? 0
                      : `${EDITOR_PAGE_VERTICAL_PADDING_PX}px`,
                    paddingLeft: isMobileView ? 0 : `${pageMargins.left}px`,
                    paddingRight: isMobileView ? 0 : `${pageMargins.right}px`,
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
