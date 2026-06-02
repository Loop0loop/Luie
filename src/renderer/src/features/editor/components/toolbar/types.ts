import type { Editor } from "@tiptap/react";

export interface EditorToolbarProps {
  editor: Editor | null;
  canvasToggleOnly?: boolean;
  isMobileView?: boolean;
  onToggleMobileView?: () => void;
  onOpenWorldGraph?: () => void;
  onOpenCanvas?: () => void;
  onCloseCanvas?: () => void;
  isCanvasMode?: boolean;
  onOpenPreview?: () => void;
  onOpenExport?: () => void;
  canOpenExport?: boolean;
}

export type ParagraphStyle = "paragraph" | "heading1" | "heading2" | "heading3";
