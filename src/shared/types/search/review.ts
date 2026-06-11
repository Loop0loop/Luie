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
  provenanceKind: string;
  canonStatus: string;
  evidenceCount: number;
  evidenceQuotes: string[];
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
  reviewStatus: "pending" | "reviewing";
  reviewerNote: string | null;
  reviewedAt: string | null;
  invalidatedFact: MemoryConflictFactSummary;
  invalidatingFact: MemoryConflictFactSummary;
}

export interface MemoryConflictQueueResult {
  items: MemoryConflictQueueItem[];
}

export interface MemoryReviewBacklogInput {
  projectId: string;
  limit?: number;
  evidenceLimit?: number;
}

export interface MemoryReviewStaleEvidenceItem {
  kind: "entity_mention" | "episode_evidence";
  id: string;
  reviewStatus: "pending";
  ownerId: string;
  ownerTitle: string;
  chunkId: string | null;
  chapterId: string | null;
  chapterOrder: number | null;
  quote: string;
  reason: "chunk_missing" | "quote_missing_from_chunk";
}

export interface MemoryReviewBacklogResult {
  staleEvidence: MemoryReviewStaleEvidenceItem[];
  counts: {
    staleEvidence: number;
  };
}

export interface MemoryEvidenceRepairInput {
  projectId: string;
}

export interface MemoryEvidenceRepairResult {
  episodeEvidenceScanned: number;
  episodeEvidenceRepaired: number;
  episodeEvidenceUnresolved: number;
  entityMentionScanned: number;
  entityMentionRepaired: number;
  entityMentionUnresolved: number;
  evalEvidenceScanned: number;
  evalEvidenceRepaired: number;
  evalEvidenceUnresolved: number;
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
  provenanceKind: string;
  canonStatus: string;
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

export interface MemoryEpisodeConfirmInput {
  projectId: string;
  episodeId: string;
}

export interface MemoryEpisodeRejectInput {
  projectId: string;
  episodeId: string;
  reason: string;
}

export interface MemoryEpisodeRejectResult {
  updated: boolean;
}

export interface MemoryEpisodeReviewMutationResult {
  updated: boolean;
  status?: "confirmed" | "rejected";
  canonicalExportable?: boolean;
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
  provenanceKind: string;
  canonStatus: string;
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

export interface MemoryTemporalFactConflictReviewInput {
  projectId: string;
  conflictId: string;
  action: "defer" | "review" | "resolve";
  reviewerNote?: string | null;
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
  provenanceKind: string;
  canonStatus: string;
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
  reason: string;
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
  reason: string;
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

export type MemoryStaleEvidenceReviewKind =
  | "entity_mention"
  | "episode_evidence";

export type MemoryStaleEvidenceReviewAction =
  | "defer"
  | "reject"
  | "resolve";

export interface MemoryStaleEvidenceReviewActionInput {
  projectId: string;
  kind: MemoryStaleEvidenceReviewKind;
  id: string;
  action: MemoryStaleEvidenceReviewAction;
  reviewerNote?: string | null;
}

export interface MemoryStaleEvidenceReviewActionResult {
  updated: boolean;
  status?: "deferred" | "rejected" | "resolved";
}
