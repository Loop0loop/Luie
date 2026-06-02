export type FullSnapshotData = {
  meta: {
    version: string;
    timestamp: string;
    snapshotId: string;
    projectId: string;
  };
  data: {
    project: {
      id: string;
      title: string;
      description?: string | null;
      projectPath?: string | null;
      createdAt: string;
      updatedAt: string;
    };
    settings?: unknown;
    chapters: Array<{
      id: string;
      title: string;
      content: string;
      synopsis?: string | null;
      order: number;
      wordCount?: number | null;
      createdAt: string;
      updatedAt: string;
    }>;
    characters: Array<{
      id: string;
      name: string;
      description?: string | null;
      firstAppearance?: string | null;
      attributes?: unknown;
      createdAt: string;
      updatedAt: string;
    }>;
    terms: Array<{
      id: string;
      term: string;
      definition?: string | null;
      category?: string | null;
      firstAppearance?: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    focus?: {
      chapterId?: string | null;
      content?: string | null;
    };
  };
};

export type ProjectSnapshotRecord = {
  id: string;
  title: string;
  description?: string | null;
  projectPath?: string | null;
  createdAt: Date;
  updatedAt: Date;
  settings?: unknown;
  chapters: Array<{
    id: string;
    title: string;
    content: string;
    synopsis?: string | null;
    order: number;
    wordCount?: number | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  characters: Array<{
    id: string;
    name: string;
    description?: string | null;
    firstAppearance?: string | null;
    attributes?: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>;
  terms: Array<{
    id: string;
    term: string;
    definition?: string | null;
    category?: string | null;
    firstAppearance?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
};
