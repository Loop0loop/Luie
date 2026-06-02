import type { Editor } from "@tiptap/react";

import type { ParagraphStyle } from "./types";

export const getParagraphStyle = (editor: Editor): ParagraphStyle => {
  if (editor.isActive("heading", { level: 1 })) return "heading1";
  if (editor.isActive("heading", { level: 2 })) return "heading2";
  if (editor.isActive("heading", { level: 3 })) return "heading3";
  return "paragraph";
};

export const createToolbarGhostEditor = (): Editor => {
  const chain: Record<string, (() => typeof chain) | (() => boolean)> = {
    focus: () => chain,
    undo: () => chain,
    redo: () => chain,
    setParagraph: () => chain,
    toggleHeading: () => chain,
    toggleBold: () => chain,
    toggleItalic: () => chain,
    toggleUnderline: () => chain,
    toggleStrike: () => chain,
    setColor: () => chain,
    setHighlight: () => chain,
    setHorizontalRule: () => chain,
    setTextAlign: () => chain,
    unsetAllMarks: () => chain,
    clearNodes: () => chain,
    selectAll: () => chain,
    run: () => true,
  };

  return {
    isActive: () => false,
    can: () => ({
      undo: () => false,
      redo: () => false,
    }),
    getAttributes: () => ({}),
    chain: () => chain,
  } as unknown as Editor;
};
