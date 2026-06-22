import type { EntityRelation, WorldEntity } from "./world";

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
  deletedAt?: Date | null;
};

export type TermExportRecord = {
  id: string;
  term: string;
  definition?: string | null;
  category?: string | null;
  firstAppearance?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
};

export type EventExportRecord = {
  id: string;
  name: string;
  description?: string | null;
  firstAppearance?: string | null;
  attributes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
};

export type FactionExportRecord = {
  id: string;
  name: string;
  description?: string | null;
  firstAppearance?: string | null;
  attributes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
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
  events: EventExportRecord[];
  factions: FactionExportRecord[];
  snapshots: SnapshotExportRecord[];
  worldEntities: WorldEntity[];
  entityRelations: EntityRelation[];
};
