import { create } from "zustand";
import type { AnalysisItem } from "@shared/types/analysis.js";
import type {
  Message,
  ConflictReviewFilter,
  AnalysisConflictItem,
  AnalysisEntityAliasReviewItem,
  AnalysisEntityReviewItem,
  AnalysisEpisodeReviewItem,
  AnalysisFactReviewItem,
  AnalysisNarrativeSummaryStatus,
  AnalysisStaleEvidenceReviewItem,
} from "../../components/analysisSection/shared/types";
import {
  type AnalysisActions,
  createAnalysisActions,
  cleanUpRagStreamListeners,
} from "./analysisStore.actions";

interface AnalysisStoreState {
  // 기존 분석 상태
  items: AnalysisItem[];
  isAnalyzing: boolean;
  error: string | null;
  viewMode: 'fixView' | 'floatingView';
  isOpen: boolean;
  isMinimized: boolean;
  floatingPosition: { x: number; y: number };
  floatingSize: { width: number; height: number };

  // RAG 채팅 상태
  messages: Message[];
  input: string;
  ragRunId: string | null;
  isStreaming: boolean;

  // 리뷰 큐 상태
  showNarrativeSummaryStatus: boolean;
  narrativeSummaryStatus: AnalysisNarrativeSummaryStatus | null;
  narrativeSummaryStatusLoading: boolean;
  narrativeSummaryStatusError: string | null;

  showConflictQueue: boolean;
  conflictQueueReviewFilter: ConflictReviewFilter;
  conflictQueueItems: AnalysisConflictItem[];
  conflictQueueLoading: boolean;
  conflictQueueError: string | null;
  resolvingConflictId: string | null;

  showFactReviewQueue: boolean;
  factReviewItems: AnalysisFactReviewItem[];
  factReviewLoading: boolean;
  factReviewError: string | null;
  mutatingFactId: string | null;

  showEpisodeReviewQueue: boolean;
  episodeReviewItems: AnalysisEpisodeReviewItem[];
  episodeReviewLoading: boolean;
  episodeReviewError: string | null;
  mutatingEpisodeId: string | null;

  showEntityReviewQueue: boolean;
  entityReviewItems: AnalysisEntityReviewItem[];
  entityReviewLoading: boolean;
  entityReviewError: string | null;
  mutatingEntityId: string | null;

  showEntityAliasReviewQueue: boolean;
  entityAliasReviewItems: AnalysisEntityAliasReviewItem[];
  entityAliasReviewLoading: boolean;
  entityAliasReviewError: string | null;
  mutatingAliasId: string | null;

  showStaleEvidenceReviewQueue: boolean;
  staleEvidenceReviewItems: AnalysisStaleEvidenceReviewItem[];
  staleEvidenceReviewLoading: boolean;
  staleEvidenceReviewError: string | null;
  mutatingStaleEvidenceId: string | null;
  repairingStaleEvidenceLinks: boolean;
}

interface AnalysisStoreSyncActions {
  setError: (error: string | null) => void;
  setViewMode: (mode: 'fixView' | 'floatingView') => void;
  setOpen: (open: boolean) => void;
  setMinimized: (minimized: boolean) => void;
  setFloatingPosition: (pos: { x: number; y: number }) => void;
  setFloatingSize: (size: { width: number; height: number }) => void;
  setInput: (input: string) => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;

  setShowNarrativeSummaryStatus: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowConflictQueue: (show: boolean | ((prev: boolean) => boolean)) => void;
  setConflictQueueReviewFilter: (filter: ConflictReviewFilter) => void;
  setShowFactReviewQueue: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowEpisodeReviewQueue: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowEntityReviewQueue: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowEntityAliasReviewQueue: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowStaleEvidenceReviewQueue: (show: boolean | ((prev: boolean) => boolean)) => void;

  reset: () => void;
}

export type AnalysisStore = AnalysisStoreState & AnalysisStoreSyncActions & AnalysisActions;

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  // 기존 분석 상태 초기값
  items: [],
  isAnalyzing: false,
  error: null,
  viewMode: 'fixView',
  isOpen: false,
  isMinimized: false,
  floatingPosition: { x: 0, y: 0 },
  floatingSize: { width: 380, height: 520 },

  // RAG 채팅 상태 초기값
  messages: [],
  input: "",
  ragRunId: null,
  isStreaming: false,

  // 리뷰 큐 상태 초기값
  showNarrativeSummaryStatus: false,
  narrativeSummaryStatus: null,
  narrativeSummaryStatusLoading: false,
  narrativeSummaryStatusError: null,

  showConflictQueue: false,
  conflictQueueReviewFilter: "active",
  conflictQueueItems: [],
  conflictQueueLoading: false,
  conflictQueueError: null,
  resolvingConflictId: null,

  showFactReviewQueue: false,
  factReviewItems: [],
  factReviewLoading: false,
  factReviewError: null,
  mutatingFactId: null,

  showEpisodeReviewQueue: false,
  episodeReviewItems: [],
  episodeReviewLoading: false,
  episodeReviewError: null,
  mutatingEpisodeId: null,

  showEntityReviewQueue: false,
  entityReviewItems: [],
  entityReviewLoading: false,
  entityReviewError: null,
  mutatingEntityId: null,

  showEntityAliasReviewQueue: false,
  entityAliasReviewItems: [],
  entityAliasReviewLoading: false,
  entityAliasReviewError: null,
  mutatingAliasId: null,

  showStaleEvidenceReviewQueue: false,
  staleEvidenceReviewItems: [],
  staleEvidenceReviewLoading: false,
  staleEvidenceReviewError: null,
  mutatingStaleEvidenceId: null,
  repairingStaleEvidenceLinks: false,

  // 동기 Actions
  setError: (error) => {
    set({ error, isAnalyzing: false });
  },

  setViewMode: (mode) => {
    set({
      viewMode: mode,
      isOpen: mode === 'floatingView' ? true : false,
      isMinimized: false
    });
  },

  setOpen: (open) => {
    set({ isOpen: open });
  },

  setMinimized: (minimized) => {
    set({ isMinimized: minimized });
  },

  setFloatingPosition: (pos) => {
    set({ floatingPosition: pos });
  },

  setFloatingSize: (size) => {
    set({ floatingSize: size });
  },

  setInput: (input) => {
    set({ input });
  },

  setMessages: (messages) => {
    if (typeof messages === "function") {
      set((state) => ({ messages: messages(state.messages) }));
    } else {
      set({ messages });
    }
  },

  setShowNarrativeSummaryStatus: (show) => {
    set((state) => ({
      showNarrativeSummaryStatus: typeof show === "function" ? show(state.showNarrativeSummaryStatus) : show,
    }));
  },

  setShowConflictQueue: (show) => {
    set((state) => ({
      showConflictQueue: typeof show === "function" ? show(state.showConflictQueue) : show,
    }));
  },

  setConflictQueueReviewFilter: (filter) => {
    set({ conflictQueueReviewFilter: filter });
  },

  setShowFactReviewQueue: (show) => {
    set((state) => ({
      showFactReviewQueue: typeof show === "function" ? show(state.showFactReviewQueue) : show,
    }));
  },

  setShowEpisodeReviewQueue: (show) => {
    set((state) => ({
      showEpisodeReviewQueue: typeof show === "function" ? show(state.showEpisodeReviewQueue) : show,
    }));
  },

  setShowEntityReviewQueue: (show) => {
    set((state) => ({
      showEntityReviewQueue: typeof show === "function" ? show(state.showEntityReviewQueue) : show,
    }));
  },

  setShowEntityAliasReviewQueue: (show) => {
    set((state) => ({
      showEntityAliasReviewQueue: typeof show === "function" ? show(state.showEntityAliasReviewQueue) : show,
    }));
  },

  setShowStaleEvidenceReviewQueue: (show) => {
    set((state) => ({
      showStaleEvidenceReviewQueue:
        typeof show === "function" ? show(state.showStaleEvidenceReviewQueue) : show,
    }));
  },

  // 비동기 Actions 팩토리 결합
  ...createAnalysisActions(set, get),

  // 리셋
  reset: () => {
    cleanUpRagStreamListeners();
    set({
      items: [],
      isAnalyzing: false,
      error: null,
      isOpen: false,
      isMinimized: false,
      messages: [],
      input: "",
      ragRunId: null,
      isStreaming: false,
      showNarrativeSummaryStatus: false,
      narrativeSummaryStatus: null,
      narrativeSummaryStatusLoading: false,
      narrativeSummaryStatusError: null,
      showConflictQueue: false,
      conflictQueueItems: [],
      conflictQueueLoading: false,
      conflictQueueError: null,
      resolvingConflictId: null,
      showFactReviewQueue: false,
      factReviewItems: [],
      factReviewLoading: false,
      factReviewError: null,
      mutatingFactId: null,
      showEpisodeReviewQueue: false,
      episodeReviewItems: [],
      episodeReviewLoading: false,
      episodeReviewError: null,
      mutatingEpisodeId: null,
      showEntityReviewQueue: false,
      entityReviewItems: [],
      entityReviewLoading: false,
      entityReviewError: null,
      mutatingEntityId: null,
      showEntityAliasReviewQueue: false,
      entityAliasReviewItems: [],
      entityAliasReviewLoading: false,
      entityAliasReviewError: null,
      mutatingAliasId: null,
      showStaleEvidenceReviewQueue: false,
      staleEvidenceReviewItems: [],
      staleEvidenceReviewLoading: false,
      staleEvidenceReviewError: null,
      mutatingStaleEvidenceId: null,
      repairingStaleEvidenceLinks: false,
    });
  },
}));
