import type { ReactNode } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";

export interface GoogleDocsLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  activeChapterId?: string;
  activeChapterTitle?: string;
  currentProjectId?: string;
  editor?: TiptapEditor | null;
  onOpenSettings: () => void;
  onRenameChapter?: (id: string, title: string) => void;
  onSaveChapter?: (title: string, content: string) => void | Promise<void>;
  additionalPanels?: ReactNode;
  additionalPanelIds?: string[];
  isMobileView?: boolean;
  onToggleMobileView?: () => void;
  onOpenExport?: () => void;
  onOpenWorldGraph?: () => void;
}

export type DocsPageMargins = {
  left: number;
  right: number;
  firstLineIndent: number;
};
