import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@shared/api";
import type {
  EmbeddingModelStatusView,
  HfModelFile,
  HfModelSearchResult,
  LlmfitResult,
  MemoryEmbeddingStatus,
  MigrationHealth,
} from "@shared/types";

type SemanticSearchState = "ready" | "preparing" | "disabled";
import type { SettingsTabId } from "@renderer/features/settings/components/tabs/types";
import type { ToastType } from "@shared/ui/ToastContext";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";

type ShowToast = (message: string, type: ToastType, duration?: number) => void;

export function useSettingsModel(activeTab: SettingsTabId, showToast: ShowToast) {
  const { t } = useTranslation();
  const [isBusy, setIsBusy] = useState(false);
  const [migrationHealth, setMigrationHealth] = useState<MigrationHealth | null>(null);
  const currentProject = useProjectStore((state) => state.currentProject);
  const [localLlmEnabled, setLocalLlmEnabled] = useState(false);
  const [localLlmModelPath, setLocalLlmModelPath] = useState<string | undefined>();
  const [localLlmBinaryPath, setLocalLlmBinaryPath] = useState<string | undefined>();
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [downloadProgress, setDownloadProgress] = useState<{
    stage: "binary" | "model" | "complete" | "error";
    pct: number;
    error?: string;
  } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [llmfitResult, setLlmfitResult] = useState<LlmfitResult | null>(null);
  const [llmfitLoading, setLlmfitLoading] = useState(false);
  const [embeddingStatus, setEmbeddingStatus] = useState<EmbeddingModelStatusView | null>(null);
  const [embeddingProgress, setEmbeddingProgress] = useState<{
    stage: "downloading" | "complete" | "error";
    pct: number;
    error?: string;
  } | null>(null);
  const [embeddingDownloading, setEmbeddingDownloading] = useState(false);
  const [memoryEmbeddingStatus, setMemoryEmbeddingStatus] =
    useState<MemoryEmbeddingStatus | null>(null);

  const refreshMigrationHealth = useCallback(async () => {
    const response = await api.maintenance.getMigrationHealth();
    if (response.success && response.data) {
      setMigrationHealth(response.data);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "model") return;
    void (async () => {
      const res = await api.settings.getAll();
      const llm = res.data?.llm;
      if (llm) {
        if (llm.localLlm) {
          setLocalLlmEnabled(llm.localLlm.enabled);
          setLocalLlmModelPath(llm.localLlm.modelPath);
          setLocalLlmBinaryPath(llm.localLlm.binaryPath);
        }
        if (typeof llm.openaiApiKey === "string") {
          setOpenaiApiKey(llm.openaiApiKey);
        }
        if (typeof llm.geminiApiKey === "string") {
          setGeminiApiKey(llm.geminiApiKey);
        }
      }
      await refreshMigrationHealth();

      const embeddingRes = await api.settings.getEmbeddingModelStatus();
      if (embeddingRes.success && embeddingRes.data) {
        setEmbeddingStatus(embeddingRes.data);
      }
      if (currentProject) {
        const memoryRes = await api.memoryAdmin.getEmbeddingStatus(currentProject.id);
        if (memoryRes.success && memoryRes.data) {
          setMemoryEmbeddingStatus(memoryRes.data);
        }
      }

      // 하드웨어 추천(llmfit)은 외부 바이너리 호출이라 느릴 수 있어 비차단으로 로드.
      setLlmfitLoading(true);
      const llmfitRes = await api.settings.getLlmfitRecommendations({ limit: 10 });
      if (llmfitRes.success && llmfitRes.data) {
        setLlmfitResult(llmfitRes.data);
      }
      setLlmfitLoading(false);
    })();
  }, [activeTab, currentProject, refreshMigrationHealth]);

  useEffect(() => {
    const unsubscribe = api.settings.onEmbeddingModelDownloadProgress((progress) => {
      setEmbeddingProgress(progress);
      if (progress.stage === "complete") {
        setEmbeddingDownloading(false);
        void api.settings.getEmbeddingModelStatus().then((response) => {
          if (response.success && response.data) {
            setEmbeddingStatus(response.data);
          }
        });
      }
      if (progress.stage === "error") setEmbeddingDownloading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = api.settings.onModelDownloadProgress((progress) => {
      setDownloadProgress(progress);
      if (progress.stage === "complete") {
        setIsDownloading(false);
        void api.settings.getLocalLlmSettings().then((response) => {
          if (response.success && response.data) {
            setLocalLlmEnabled(response.data.enabled ?? false);
            setLocalLlmModelPath(response.data.modelPath);
            setLocalLlmBinaryPath(response.data.binaryPath);
          }
        });
      }
      if (progress.stage === "error") setIsDownloading(false);
    });
    return unsubscribe;
  }, []);

  const handleRebuildMemory = useCallback(async (): Promise<void> => {
    if (!currentProject) {
      showToast(t("settings.localLlm.rebuildMemory.noProject"), "error");
      return;
    }
    setIsBusy(true);
    try {
      const response = await api.memoryAdmin.rebuildChunks({ projectId: currentProject.id });
      if (!response.success) {
        showToast(response.error?.message ?? t("settings.localLlm.rebuildMemory.failed"), "error");
        return;
      }
      showToast(
        t("settings.localLlm.rebuildMemory.started", { count: response.data?.queued ?? 0 }),
        "success",
      );
    } finally {
      setIsBusy(false);
    }
  }, [currentProject, showToast, t]);

  const handleDownloadLocalModel = useCallback(async (opts?: {
    repo: string;
    filename: string;
  }): Promise<void> => {
    setIsDownloading(true);
    setDownloadProgress(null);
    try {
      const response = await api.settings.startModelDownload({
        type: "model",
        ...(opts ? { repo: opts.repo, filename: opts.filename } : {}),
      });
      if (response.success) return;
      setIsDownloading(false);
      showToast(response.error?.message ?? t("settings.localLlm.modelLibrary.downloadStartFailed"), "error");
    } catch (error) {
      setIsDownloading(false);
      const message = error instanceof Error ? error.message : t("settings.localLlm.modelLibrary.downloadStartFailed");
      showToast(message, "error");
    }
  }, [showToast, t]);

  const handleSearchHfModels = useCallback(async (query: string): Promise<HfModelSearchResult[]> => {
    const response = await api.settings.searchHfModels(query);
    if (response.success && response.data) return response.data;
    throw new Error(response.error?.message ?? t("settings.localLlm.modelLibrary.searchError"));
  }, [t]);

  const handleGetHfModelFiles = useCallback(async (repoId: string): Promise<HfModelFile[]> => {
    const response = await api.settings.getHfModelFiles(repoId);
    if (response.success && response.data) return response.data;
    throw new Error(response.error?.message ?? t("settings.localLlm.modelLibrary.fileFetchError"));
  }, [t]);

  const handleToggleLocalLlm = useCallback(async (enabled: boolean): Promise<void> => {
    setLocalLlmEnabled(enabled);
    const response = await api.settings.setLocalLlmSettings({
      enabled,
      modelPath: localLlmModelPath,
      binaryPath: localLlmBinaryPath,
    });
    if (!response.success) {
      setLocalLlmEnabled(!enabled);
      showToast(response.error?.message ?? t("settings.localLlm.toggleSaveFailed"), "error");
      return;
    }
    const preferenceResponse = await api.settings.setLlmPreference({
      provider: enabled ? "sidecar" : "auto",
    });
    if (!preferenceResponse.success) {
      showToast(preferenceResponse.error?.message ?? t("settings.localLlm.preferenceSwitchFailed"), "error");
    }
  }, [localLlmBinaryPath, localLlmModelPath, showToast, t]);

  const handleDownloadEmbeddingModel = useCallback(async (): Promise<void> => {
    setEmbeddingDownloading(true);
    setEmbeddingProgress(null);
    try {
      const response = await api.settings.downloadEmbeddingModel();
      if (response.success) return;
      setEmbeddingDownloading(false);
      showToast(response.error?.message ?? t("settings.localLlm.embedding.downloadFailed"), "error");
    } catch (error) {
      setEmbeddingDownloading(false);
      const message = error instanceof Error ? error.message : t("settings.localLlm.embedding.downloadFailed");
      showToast(message, "error");
    }
  }, [showToast, t]);

  const handleSaveLlmKeys = useCallback(async (openAiKey: string, geminiKey: string): Promise<boolean> => {
    setIsBusy(true);
    try {
      const response = await api.settings.setLlmKeys({
        openaiApiKey: openAiKey,
        geminiApiKey: geminiKey,
      });
      if (response.success) {
        setOpenaiApiKey(openAiKey);
        setGeminiApiKey(geminiKey);
        showToast(t("settings.localLlm.apiKeys.saved"), "success");
        return true;
      }
      showToast(response.error?.message ?? t("settings.localLlm.apiKeys.saveFailed"), "error");
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : t("settings.localLlm.apiKeys.saveFailed");
      showToast(message, "error");
      return false;
    } finally {
      setIsBusy(false);
    }
  }, [showToast, t]);

  // 의미 검색 게이트: 임베딩 모델 미설치=비활성, 임베딩 잡 진행 중=준비중, 그 외=준비됨.
  const pendingEmbeddings =
    (memoryEmbeddingStatus?.pendingCount ?? 0) + (memoryEmbeddingStatus?.runningCount ?? 0);
  const semanticSearchState: SemanticSearchState = !embeddingStatus?.installed
    ? "disabled"
    : pendingEmbeddings > 0
      ? "preparing"
      : "ready";

  return {
    isBusy,
    migrationHealth,
    refreshMigrationHealth,
    localLlmEnabled,
    localLlmModelPath,
    localLlmBinaryPath,
    openaiApiKey,
    geminiApiKey,
    isDownloading,
    downloadProgress,
    handleRebuildMemory,
    handleDownloadLocalModel,
    handleSearchHfModels,
    handleGetHfModelFiles,
    handleToggleLocalLlm,
    handleSaveLlmKeys,
    llmfitResult,
    llmfitLoading,
    embeddingStatus,
    embeddingProgress,
    embeddingDownloading,
    handleDownloadEmbeddingModel,
    semanticSearchState,
  };
}
