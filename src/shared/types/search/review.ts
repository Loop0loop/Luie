export interface MemoryConflictFactSummary {
  id: string;
  subjectEntityId: string;
  subjectEntityName: string | null;
  predicate: string;
  objectEntityId: string | null;
  objectEntityName: string | null;
  objectValue: string | null;
  valueType: string;
  validFromChapterOrder: number;
  validToChapterOrder: number | null;
  observedAtChapterOrder: number;
  confidence: number;
  status: string;
  evidenceCount: number;
}

export interface MemoryConflictQueueInput {
  projectId: string;
  chapterId?: string;
  includePriorMemory?: boolean;
  entityId?: string;
  entityName?: string;
  entityType?: string;
  limit?: number;
}

export interface MemoryConflictQueueItem {
  conflictId: string;
  reason: string;
  invalidatedFact: MemoryConflictFactSummary;
  invalidatingFact: MemoryConflictFactSummary;
}

export interface MemoryConflictQueueResult {
  items: MemoryConflictQueueItem[];
}

export interface MemoryEpisodeReviewItem {
  id: string;
  projectId: string;
  sourceType: string;
  sourceId: string;
  chapterId: string | null;
  sceneId: string | null;
  episodeType: string;
  title: string;
  summary: string;
  status: string;
  confidence: number;
  evidenceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEpisodeReviewQueueInput {
  projectId: string;
  limit?: number;
}

export interface MemoryEpisodeReviewQueueResult {
  items: MemoryEpisodeReviewItem[];
}

export interface MemoryEpisodeRejectInput {
  projectId: string;
  episodeId: string;
  reason: string;
}

export interface MemoryEpisodeRejectResult {
  updated: boolean;
}

export interface MemoryTemporalFactReviewItem {
  id: string;
  projectId: string;
  subjectEntityId: string;
  subjectEntityName: string | null;
  predicate: string;
  objectEntityId: string | null;
  objectEntityName: string | null;
  objectValue: string | null;
  valueType: string;
  validFromChapterOrder: number;
  validToChapterOrder: number | null;
  observedAtChapterOrder: number;
  confidence: number;
  status: string;
  evidenceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryTemporalFactReviewQueueInput {
  projectId: string;
  limit?: number;
}

export interface MemoryTemporalFactReviewQueueResult {
  items: MemoryTemporalFactReviewItem[];
}

export interface MemoryTemporalFactConfirmInput {
  projectId: string;
  factId: string;
}

export interface MemoryTemporalFactRejectInput {
  projectId: string;
  factId: string;
  reason: string;
}

export interface MemoryTemporalFactConflictResolveInput {
  projectId: string;
  conflictId: string;
  winnerFactId: string;
  reason?: string;
}

export interface MemoryTemporalFactReviewMutationResult {
  updated: boolean;
  status?: "confirmed" | "rejected";
  canonicalExportable?: boolean;
}

export interface MemoryEntityAliasReviewItem {
  id: string;
  projectId: string;
  entityId: string;
  entityType: string;
  canonicalName: string;
  entityStatus: string;
  alias: string;
  normalizedAlias: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEntityAliasReviewQueueInput {
  projectId: string;
  limit?: number;
}

export interface MemoryEntityAliasReviewQueueResult {
  items: MemoryEntityAliasReviewItem[];
}

export interface MemoryEntityReviewItem {
  id: string;
  projectId: string;
  entityType: string;
  canonicalName: string;
  status: string;
  confidence: number;
  createdBy: string;
  mentionCount: number;
  firstMentionChapterOrder: number | null;
  lastMentionChapterOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEntityReviewQueueInput {
  projectId: string;
  limit?: number;
}

export interface MemoryEntityReviewQueueResult {
  items: MemoryEntityReviewItem[];
}

export interface MemoryEntityConfirmInput {
  projectId: string;
  entityId: string;
}

export interface MemoryEntityRejectInput {
  projectId: string;
  entityId: string;
}

export interface MemoryEntityReviewMutationResult {
  updated: boolean;
  status?: "confirmed" | "rejected";
  canonicalExportable?: boolean;
}

export interface MemoryEntityAliasConfirmInput {
  projectId: string;
  aliasId: string;
}

export interface MemoryEntityAliasRejectInput {
  projectId: string;
  aliasId: string;
}

export interface MemoryEntityAliasReviewMutationResult {
  updated: boolean;
}

export interface MemoryEntityMergeInput {
  projectId: string;
  targetEntityId: string;
  sourceEntityId: string;
}

export interface MemoryEntityMergeResult {
  updated: boolean;
}

export interface MemoryEntityAliasSplitInput {
  projectId: string;
  aliasId: string;
  canonicalName: string;
}

export interface MemoryEntityAliasSplitResult {
  updated: boolean;
  entityId: string | null;
}
