import { type Editor } from "@tiptap/react";

import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import EditorToolbar from "@renderer/features/editor/components/EditorToolbar";

interface RibbonProps {
  editor: Editor | null;
  onOpenSettings?: () => void;
  activeChapterId?: string;
  onOpenExportPreview?: () => void;
  onOpenWorldGraph?: () => void;
  onOpenCanvas?: () => void;
  onCloseCanvas?: () => void;
  isCanvasMode?: boolean;
  /** portal 컨트롤 진입/이탈 — 레이아웃의 hover 유지 로직 연결용 */
  onControlsEnter?: () => void;
  onControlsLeave?: () => void;
  toolbarVisible?: boolean;
}

export default function Ribbon({
  editor,
  activeChapterId,
  onOpenExportPreview,
  onOpenWorldGraph,
  onOpenCanvas,
  onCloseCanvas,
  isCanvasMode = false,
  onControlsEnter,
  onControlsLeave,
  toolbarVisible,
}: RibbonProps) {
  const maxWidth = useEditorStore((state) => state.maxWidth);
  const updateSettings = useEditorStore((state) => state.updateSettings);
  const isMobileView = Boolean(maxWidth && maxWidth <= 500);

  return (
    <div className="w-full bg-panel text-fg z-40 select-none">
      <EditorToolbar
        editor={editor}
        isMobileView={isMobileView}
        onToggleMobileView={() => {
          void updateSettings({ maxWidth: isMobileView ? 800 : 450 });
        }}
        onOpenPreview={onOpenExportPreview}
        onOpenExport={onOpenExportPreview}
        canOpenExport={Boolean(activeChapterId)}
        onOpenWorldGraph={onOpenWorldGraph}
        onOpenCanvas={onOpenCanvas}
        onCloseCanvas={onCloseCanvas}
        isCanvasMode={isCanvasMode}
        onControlsEnter={onControlsEnter}
        onControlsLeave={onControlsLeave}
        toolbarVisible={toolbarVisible}
      />
    </div>
  );
}
