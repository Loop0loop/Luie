import type { TFunction } from "i18next";
import type {
  EmbeddingModelStatusView,
  HfModelFile,
  HfModelSearchResult,
  LlmfitResult,
  MemoryBuildJobProgress,
} from "@shared/types";

export type SemanticSearchState = "ready" | "preparing" | "disabled";

export type LlmProvider = "auto" | "sidecar" | "ollama" | "openai" | "gemini";

export interface OllamaConfig {
  baseUrl: string;
  chatModel: string;
  apiKey: string;
}

export type DownloadProgress =
  | { stage: "binary" | "model" | "complete" | "error"; pct: number; error?: string }
  | null;

export type EmbeddingProgress =
  | { stage: "downloading" | "complete" | "error"; pct: number; error?: string }
  | null;

export interface ModelTabProps {
  t: TFunction;
  isBusy: boolean;
  onRebuildMemory: () => Promise<void>;
  onPauseMemoryBuildJobs: () => Promise<void>;
  onResumeMemoryBuildJobs: () => Promise<void>;
  onCancelMemoryBuildJobs: () => Promise<void>;
  memoryBuildProgress: MemoryBuildJobProgress | null;
  localLlmEnabled: boolean;
  localLlmModelPath?: string;
  localLlmBinaryPath?: string;
  openaiApiKey: string;
  geminiApiKey: string;
  ollamaConfig: OllamaConfig;
  preferredProvider: LlmProvider;
  onSaveLlmKeys: (openaiApiKey: string, geminiApiKey: string) => Promise<boolean>;
  onSaveOllamaConfig: (config: OllamaConfig) => Promise<boolean>;
  onSetLlmPreference: (provider: LlmProvider) => Promise<void>;
  isDownloading: boolean;
  downloadProgress: DownloadProgress;
  onDownloadLocalModel: (opts?: { repo: string; filename: string }) => Promise<void>;
  onSearchHfModels: (query: string) => Promise<HfModelSearchResult[]>;
  onGetHfModelFiles: (repoId: string) => Promise<HfModelFile[]>;
  onToggleLocalLlm: (enabled: boolean) => Promise<void>;
  llmfitResult: LlmfitResult | null;
  llmfitLoading: boolean;
  embeddingStatus: EmbeddingModelStatusView | null;
  embeddingProgress: EmbeddingProgress;
  embeddingDownloading: boolean;
  onDownloadEmbeddingModel: () => Promise<void>;
  semanticSearchState: SemanticSearchState;
}
