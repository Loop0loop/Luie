import type { ReactNode } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { Group as PanelGroup, Panel } from "react-resizable-panels";
import { EditorDropZones } from "@shared/ui/EditorDropZones";
import EditorToolbar from "@renderer/features/editor/components/EditorToolbar";
import { EditorRuler } from "@renderer/features/editor/components/EditorRuler";
import StatusFooter from "@shared/ui/StatusFooter";
import {
  EDITOR_A4_PAGE_HEIGHT_PX,
  EDITOR_A4_PAGE_WIDTH_PX,
  EDITOR_PAGE_VERTICAL_PADDING_PX,
} from "@shared/constants/configs";
import { toPercentSize } from "@shared/constants/sidebarSizing";
import type { DocsPageMargins } from "./googleDocsLayout.types";

type GoogleDocsEditorColumnProps = {
  additionalPanelIds: string[];
  additionalPanels?: ReactNode;
  children: ReactNode;
  editor?: TiptapEditor | null;
  onOpenExport?: () => void;
  onOpenWorldGraph?: () => void;
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
  pageMargins,
  setPageMargins,
}: GoogleDocsEditorColumnProps) {
  return (
    <Panel
      id="center-content"
      minSize={toPercentSize(10)}
      className="relative z-0 flex min-w-0 flex-1 flex-col bg-secondary/30 transition-colors duration-200"
    >
      {editor && (
        <div className="relative z-40 flex w-full shrink-0 justify-center border-b border-border bg-background py-1">
          <EditorToolbar editor={editor} onOpenWorldGraph={onOpenWorldGraph} />
        </div>
      )}

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <PanelGroup
          orientation="horizontal"
          className="relative flex h-full w-full flex-1 overflow-hidden"
          id="docs-editor-split-group"
        >
          <Panel
            id="editor-main-panel"
            minSize={toPercentSize(10)}
            className="relative flex min-w-0 flex-col bg-transparent"
          >
            <EditorDropZones />
            <main className="custom-scrollbar relative flex flex-1 flex-col items-center overflow-y-auto bg-sidebar">
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
