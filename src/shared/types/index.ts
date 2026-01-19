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
  description?: string | null;
  createdAt: string | Date;
}

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
export interface EditorSettings {
  fontFamily: "serif" | "sans" | "mono";
  fontSize: number;
  lineHeight: number;
  maxWidth: number;
  theme: "light" | "dark" | "sepia";
}

export interface AppSettings {
  editor: EditorSettings;
  lastProjectPath?: string;
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  windowBounds?: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
  lastWindowState?: "maximized" | "normal";
}
