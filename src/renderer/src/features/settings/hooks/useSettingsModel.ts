import { useCallback, useEffect, useState } from "react";
import { api } from "@shared/api";
import type { HfModelFile, HfModelSearchResult, MigrationHealth } from "@shared/types";
import type { SettingsTabId } from "@renderer/features/settings/components/tabs/types";
import type { ToastType } from "@shared/ui/ToastContext";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";

type ShowToast = (message: string, type: ToastType, duration?: number) => void;

export function useSettingsModel(activeTab: SettingsTabId, showToast: ShowToast) {
  const [isBusy, setIsBusy] = useState(false);
  const [migrationHealth, setMigrationHealth] = useState<MigrationHealth | null>(null);
  const currentProject = useProjectStore((state) => state.currentProject);
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

  const handleDownloadLocalModel = useCallback(async (opts?: {
    repo: string;
    filename: string;
  }): Promise<void> => {
    setIsDownloading(true);
    setDownloadProgress(null);
    const response = await api.settings.startModelDownload({
      type: "model",
      ...(opts ? { repo: opts.repo, filename: opts.filename } : {}),
    });
    if (!response.success) {
      setIsDownloading(false);
      showToast(response.error?.message ?? "로컬 AI 모델 다운로드를 시작하지 못했습니다.", "error");
    }
  }, [showToast]);

  const handleSearchHfModels = useCallback(async (query: string): Promise<HfModelSearchResult[]> => {
    const response = await api.settings.searchHfModels(query);
    if (response.success && response.data) return response.data;
    showToast(response.error?.message ?? "HuggingFace 모델 검색에 실패했습니다.", "error");
    return [];
  }, [showToast]);

  const handleGetHfModelFiles = useCallback(async (repoId: string): Promise<HfModelFile[]> => {
    const response = await api.settings.getHfModelFiles(repoId);
    if (response.success && response.data) return response.data;
    showToast(response.error?.message ?? "GGUF 파일 목록을 불러오지 못했습니다.", "error");
    return [];
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
      return;
    }
    const preferenceResponse = await api.settings.setLlmPreference({
      provider: enabled ? "sidecar" : "auto",
    });
    if (!preferenceResponse.success) {
      showToast(preferenceResponse.error?.message ?? "LLM 경로 전환에 실패했습니다.", "error");
    }
  }, [localLlmBinaryPath, localLlmModelPath, showToast]);

  return {
    isBusy,
    migrationHealth,
    refreshMigrationHealth,
    localLlmEnabled,
    localLlmModelPath,
    isDownloading,
    downloadProgress,
    handleRebuildMemory,
    handleDownloadLocalModel,
    handleSearchHfModels,
    handleGetHfModelFiles,
    handleToggleLocalLlm,
  };
}
