import { useCallback, useEffect, useState } from "react";
import { api } from "@shared/api";
import type { MigrationHealth } from "@shared/types";
import type { SettingsTabId } from "@renderer/features/settings/components/tabs/types";
import type { ToastType } from "@shared/ui/ToastContext";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";

type ShowToast = (message: string, type: ToastType, duration?: number) => void;

export function useSettingsModel(activeTab: SettingsTabId, showToast: ShowToast) {
  const [isBusy, setIsBusy] = useState(false);
  const [migrationHealth, setMigrationHealth] = useState<MigrationHealth | null>(null);
  const currentProject = useProjectStore((state) => state.currentProject);
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://localhost:11434");
  const [ollamaChatModel, setOllamaChatModel] = useState("");
  const [ollamaEmbeddingModel, setOllamaEmbeddingModel] = useState("");
  const [ollamaApiKey, setOllamaApiKey] = useState("");
  const [localLlmEnabled, setLocalLlmEnabled] = useState(false);
  const [localLlmModelPath, setLocalLlmModelPath] = useState<string | undefined>();
  const [localLlmBinaryPath, setLocalLlmBinaryPath] = useState<string | undefined>();
  const [downloadProgress, setDownloadProgress] = useState<{
    stage: "binary" | "model" | "complete" | "error";
    pct: number;
    error?: string;
  } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

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
      if (res.success && res.data?.llm?.ollama) {
        const { baseUrl, chatModel, embeddingModel, apiKey } = res.data.llm.ollama;
        if (baseUrl) setOllamaBaseUrl(baseUrl);
        setOllamaChatModel(chatModel ?? "");
        setOllamaEmbeddingModel(embeddingModel ?? "");
        setOllamaApiKey(apiKey ?? "");
      }
      const localLlm = res.data?.llm?.localLlm;
      if (localLlm) {
        setLocalLlmEnabled(localLlm.enabled);
        setLocalLlmModelPath(localLlm.modelPath);
        setLocalLlmBinaryPath(localLlm.binaryPath);
      }
      await refreshMigrationHealth();
    })();
  }, [activeTab, refreshMigrationHealth]);

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

  const handleSaveOllamaConfig = useCallback(async (input: {
    baseUrl: string;
    chatModel: string;
    embeddingModel?: string;
    apiKey?: string;
  }) => {
    setIsBusy(true);
    try {
      const response = await api.settings.setOllamaConfig(input);
      if (!response.success) {
        showToast(response.error?.message ?? "Ollama 설정 저장에 실패했습니다.", "error");
        return false;
      }
      showToast("Ollama 설정을 저장했습니다.", "success");
      return true;
    } finally {
      setIsBusy(false);
    }
  }, [showToast]);

  const handleListOllamaModels = useCallback(async (baseUrl: string): Promise<string[]> => {
    const response = await api.settings.listOllamaModels(baseUrl);
    if (response.success && response.data) return response.data;
    return [];
  }, []);

  const handleTestOllamaConnection = useCallback(async (baseUrl: string): Promise<boolean> => {
    const response = await api.settings.testOllamaConnection(baseUrl);
    return response.success && response.data?.ok === true;
  }, []);

  const handleRebuildMemory = useCallback(async (): Promise<void> => {
    if (!currentProject) {
      showToast("열린 프로젝트가 없습니다.", "error");
      return;
    }
    setIsBusy(true);
    try {
      const response = await api.memoryAdmin.rebuildChunks({ projectId: currentProject.id });
      if (!response.success) {
        showToast(response.error?.message ?? "메모리 재구성에 실패했습니다.", "error");
        return;
      }
      showToast(`메모리 재구성을 시작했습니다. (${response.data?.queued ?? 0}개 작업 등록)`, "success");
    } finally {
      setIsBusy(false);
    }
  }, [currentProject, showToast]);

  const handleDownloadLocalModel = useCallback(async (): Promise<void> => {
    setIsDownloading(true);
    setDownloadProgress(null);
    const response = await api.settings.startModelDownload({ type: "model" });
    if (!response.success) {
      setIsDownloading(false);
      showToast(response.error?.message ?? "로컬 AI 모델 다운로드를 시작하지 못했습니다.", "error");
    }
  }, [showToast]);

  const handleToggleLocalLlm = useCallback(async (enabled: boolean): Promise<void> => {
    setLocalLlmEnabled(enabled);
    const response = await api.settings.setLocalLlmSettings({
      enabled,
      modelPath: localLlmModelPath,
      binaryPath: localLlmBinaryPath,
    });
    if (!response.success) {
      setLocalLlmEnabled(!enabled);
      showToast(response.error?.message ?? "로컬 AI 설정 저장에 실패했습니다.", "error");
    }
  }, [localLlmBinaryPath, localLlmModelPath, showToast]);

  return {
    isBusy,
    migrationHealth,
    refreshMigrationHealth,
    ollamaBaseUrl,
    ollamaChatModel,
    ollamaEmbeddingModel,
    ollamaApiKey,
    localLlmEnabled,
    localLlmModelPath,
    isDownloading,
    downloadProgress,
    handleSaveOllamaConfig,
    handleListOllamaModels,
    handleTestOllamaConnection,
    handleRebuildMemory,
    handleDownloadLocalModel,
    handleToggleLocalLlm,
  };
}
