import type { AnalysisStreamChunk } from "@shared/types/analysis.js";
import type {
  AnalysisConflictItem,
  AnalysisEntityAliasReviewItem,
  AnalysisEntityReviewItem,
  AnalysisEpisodeReviewItem,
  AnalysisFactReviewItem,
  AnalysisStaleEvidenceReviewAction,
  AnalysisStaleEvidenceReviewItem,
  ConflictReviewFilter,
  MemoryScope,
  Message,
} from "../../components/analysisSection/shared/types";

export interface AnalysisActions {
  startAnalysis: (chapterId: string, projectId: string) => Promise<void>;
  stopAnalysis: () => Promise<void>;
  clearAnalysis: () => Promise<void>;
  addStreamItem: (chunk: AnalysisStreamChunk) => void;

  handleSend: (
    projectId: string,
    chapterId: string | undefined,
    memoryScope: MemoryScope,
  ) => Promise<void>;
  handleStop: () => Promise<void>;
  loadNarrativeSummaryStatus: (projectId: string) => Promise<void>;
  loadConflictQueue: (
    projectId: string,
    chapterId: string | undefined,
    memoryScope: MemoryScope,
    reviewFilter?: ConflictReviewFilter,
  ) => Promise<void>;
  handleResolveConflict: (
    projectId: string,
    item: AnalysisConflictItem,
    winnerFactId: string,
  ) => Promise<void>;
  handleDeferConflict: (
    projectId: string,
    item: AnalysisConflictItem,
  ) => Promise<void>;
  loadFactReviewQueue: (projectId: string) => Promise<void>;
  loadEpisodeReviewQueue: (projectId: string) => Promise<void>;
  loadEntityReviewQueue: (projectId: string) => Promise<void>;
  loadEntityAliasReviewQueue: (projectId: string) => Promise<void>;
  loadStaleEvidenceReviewQueue: (projectId: string) => Promise<void>;

  handleConfirmFact: (
    projectId: string,
    item: AnalysisFactReviewItem,
  ) => Promise<void>;
  handleRejectFact: (
    projectId: string,
    item: AnalysisFactReviewItem,
    reason: string,
  ) => Promise<void>;
  handleConfirmEpisode: (
    projectId: string,
    item: AnalysisEpisodeReviewItem,
  ) => Promise<void>;
  handleRejectEpisode: (
    projectId: string,
    item: AnalysisEpisodeReviewItem,
    reason: string,
  ) => Promise<void>;
  handleConfirmEntity: (
    projectId: string,
    item: AnalysisEntityReviewItem,
  ) => Promise<void>;
  handleRejectEntity: (
    projectId: string,
    item: AnalysisEntityReviewItem,
    reason: string,
  ) => Promise<void>;
  handleConfirmEntityAlias: (
    projectId: string,
    item: AnalysisEntityAliasReviewItem,
  ) => Promise<void>;
  handleRejectEntityAlias: (
    projectId: string,
    item: AnalysisEntityAliasReviewItem,
    reason: string,
  ) => Promise<void>;
  handleMergeEntityAlias: (
    projectId: string,
    item: AnalysisEntityAliasReviewItem,
    targetEntityId: string,
  ) => Promise<void>;
  handleSplitEntityAlias: (
    projectId: string,
    item: AnalysisEntityAliasReviewItem,
    canonicalName: string,
  ) => Promise<void>;
  handleReviewStaleEvidence: (
    projectId: string,
    item: AnalysisStaleEvidenceReviewItem,
    action: AnalysisStaleEvidenceReviewAction,
    reviewerNote?: string | null,
  ) => Promise<void>;
  handleRepairStaleEvidence: (projectId: string) => Promise<void>;
}

export type AnalysisActionState = {
  items: Array<NonNullable<AnalysisStreamChunk["item"]>>;
  messages: Message[];
  input: string;
  isStreaming: boolean;
  ragRunId: string | null;
  conflictQueueItems: AnalysisConflictItem[];
  loadConflictQueue: AnalysisActions["loadConflictQueue"];
  loadFactReviewQueue: AnalysisActions["loadFactReviewQueue"];
  loadEpisodeReviewQueue: AnalysisActions["loadEpisodeReviewQueue"];
  loadEntityReviewQueue: AnalysisActions["loadEntityReviewQueue"];
  loadEntityAliasReviewQueue: AnalysisActions["loadEntityAliasReviewQueue"];
  loadStaleEvidenceReviewQueue: AnalysisActions["loadStaleEvidenceReviewQueue"];
};

export type AnalysisSet = (
  partial:
    | Record<string, unknown>
    | ((state: AnalysisActionState) => Record<string, unknown>),
) => void;

export type AnalysisGet = () => AnalysisActionState;
