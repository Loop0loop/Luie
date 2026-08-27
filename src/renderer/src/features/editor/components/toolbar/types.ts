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
  hideCanvasToggle?: boolean;
  className?: string;
  /**
   * NOTE: 툴바 컨트롤은 document.body portal로 그려져 DOM 부모의 mouseleave가
   * 버튼 진입 시 함께 발생한다. 레이아웃의 hover 유지 로직(onLeave 지연 취소)을
   * portal 안쪽 컨텐츠에도 연결할 수 있게 콜백을 노출한다.
   */
  onControlsEnter?: () => void;
  onControlsLeave?: () => void;
  /**
   * NOTE: portal 컨트롤은 DOM 부모의 opacity/transform 트랜지션을 받지 못한다.
   * 레이아웃의 표시 상태를 받아 같은 CSS 토글을 적용한다(미전달 시 항상 표시).
   */
  toolbarVisible?: boolean;
}

export type ParagraphStyle = "paragraph" | "heading1" | "heading2" | "heading3";
