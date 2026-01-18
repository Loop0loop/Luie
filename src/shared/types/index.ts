/**
 * Shared type definitions
 */

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

export interface TermUpdateInput {
  id: string;
  term?: string;
  definition?: string;
  category?: string;
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
