/**
 * Shared type definitions
 */

// Model Types (Renderer-safe)
export interface Project {
  id: string;
  title: string;
  description?: string | null;
  projectPath?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Chapter {
  id: string;
  projectId: string;
  title: string;
  content: string;
  synopsis?: string | null;
  order: number;
  wordCount?: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt?: string | Date | null;
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  firstAppearance?: string | null;
  attributes?: Record<string, unknown> | string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Term {
  id: string;
  projectId: string;
  term: string;
  definition?: string | null;
  category?: string | null;
  firstAppearance?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Snapshot {
  id: string;
  projectId: string;
  chapterId?: string | null;
  content: string;
  contentLength?: number;
  type?: "AUTO" | "MANUAL";
  description?: string | null;
  createdAt: string | Date;
}

// Export/Package Types
export type ChapterExportRecord = {
  id: string;
  title: string;
  order: number;
  updatedAt: Date;
  content: string;
};

export type CharacterExportRecord = {
  id: string;
  name: string;
  description?: string | null;
  firstAppearance?: string | null;
  attributes?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TermExportRecord = {
  id: string;
  term: string;
  definition?: string | null;
  category?: string | null;
  firstAppearance?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SnapshotExportRecord = {
  id: string;
  projectId: string;
  chapterId?: string | null;
  content: string;
  description?: string | null;
  createdAt: Date;
};

export type ProjectExportRecord = {
  id: string;
  title: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
  projectPath?: string | null;
  chapters: ChapterExportRecord[];
  characters: CharacterExportRecord[];
  terms: TermExportRecord[];
  snapshots: SnapshotExportRecord[];
};

// Project Types
export interface ProjectCreateInput {
  title: string;
  description?: string;
  projectPath?: string;
}

export interface ProjectUpdateInput {
  id: string;
  title?: string;
  description?: string;
  projectPath?: string;
}

// Chapter Types
export interface ChapterCreateInput {
  projectId: string;
  title: string;
  synopsis?: string;
  order?: number;
}

export interface ChapterUpdateInput {
  id: string;
  title?: string;
  content?: string;
  synopsis?: string;
}

// Character Types
export interface CharacterCreateInput {
  projectId: string;
  name: string;
  description?: string;
  firstAppearance?: string;
  attributes?: Record<string, unknown>;
}

export interface CharacterUpdateInput {
  id: string;
  name?: string;
  description?: string;
  firstAppearance?: string;
  attributes?: Record<string, unknown>;
}

export interface CharacterAppearanceInput {
  characterId: string;
  chapterId: string;
  position: number;
  context?: string;
}

// Term Types
export interface TermCreateInput {
  projectId: string;
  term: string;
  definition?: string;
  category?: string;
  firstAppearance?: string;
}

export interface TermUpdateInput {
  id: string;
  term?: string;
  definition?: string;
  category?: string;
  firstAppearance?: string;
}

export interface TermAppearanceInput {
  termId: string;
  chapterId: string;
  position: number;
  context?: string;
}

// Snapshot Types
export interface SnapshotCreateInput {
  projectId: string;
  chapterId?: string;
  content: string;
  description?: string;
  type?: "AUTO" | "MANUAL";
}

// Search Types
export interface SearchQuery {
  projectId: string;
  query: string;
  type?: "all" | "character" | "term";
}

export interface SearchResult {
  type: "character" | "term" | "chapter";
  id: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

// Settings Types
export type FontFamily = "serif" | "sans" | "mono";

export type FontPreset =
  | "default"
  | "lora"
  | "bitter"
  | "source-serif"
  | "montserrat"
  | "nunito-sans"
  | "victor-mono";

export type EditorTheme = "light" | "dark" | "sepia";

export interface WindowBounds {
  width: number;
  height: number;
  x: number;
  y: number;
}

export type WindowState = "maximized" | "normal";

export interface EditorSettings {
  fontFamily: FontFamily;
  fontPreset?: FontPreset;
  fontSize: number;
  lineHeight: number;
  maxWidth: number;
  theme: EditorTheme;
}

export interface AppSettings {
  editor: EditorSettings;
  language?: "ko" | "en" | "ja";
  shortcuts?: ShortcutMap;
  lastProjectPath?: string;
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  windowBounds?: WindowBounds;
  lastWindowState?: WindowState;
}

export type ShortcutAction =
  | "app.closeWindow"
  | "app.openSettings"
  | "app.quit"
  | "chapter.new"
  | "chapter.save"
  | "chapter.delete"
  | "chapter.open.1"
  | "chapter.open.2"
  | "chapter.open.3"
  | "chapter.open.4"
  | "chapter.open.5"
  | "chapter.open.6"
  | "chapter.open.7"
  | "chapter.open.8"
  | "chapter.open.9"
  | "chapter.open.0"
  | "view.toggleSidebar"
  | "view.sidebar.open"
  | "view.sidebar.close"
  | "view.toggleContextPanel"
  | "view.context.open"
  | "view.context.close"
  | "sidebar.section.manuscript.toggle"
  | "sidebar.section.snapshot.open"
  | "sidebar.section.trash.open"
  | "project.rename"
  | "research.open.character"
  | "research.open.world"
  | "research.open.scrap"
  | "research.open.analysis"
  | "research.open.character.left"
  | "research.open.world.left"
  | "research.open.scrap.left"
  | "research.open.analysis.left"
  | "character.openTemplate"
  | "world.tab.synopsis"
  | "world.tab.terms"
  | "world.tab.mindmap"
  | "world.tab.drawing"
  | "world.tab.plot"
  | "world.addTerm"
  | "scrap.addMemo"
  | "export.openPreview"
  | "export.openWindow"
  | "editor.openRight"
  | "editor.openLeft"
  | "split.swapSides"
  | "editor.fontSize.increase"
  | "editor.fontSize.decrease"
  | "window.toggleFullscreen";

export type ShortcutMap = Record<ShortcutAction, string>;

// Analysis Types
export type {
  AnalysisRequest,
  AnalysisItem,
  AnalysisContext,
  AnalysisStreamChunk,
  AnalysisResult,
  AnalysisError,
} from "./analysis";
