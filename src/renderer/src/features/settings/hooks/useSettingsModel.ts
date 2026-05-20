import { useCallback, useEffect, useState } from "react";
import { api } from "@shared/api";
import type {
  LlmModelDownloadStatus,
  LlmModelSettingsView,
  MigrationHealth,
  HfModelSearchResult,
  HfModelFile,
} from "@shared/types";
import type { SettingsTabId } from "@renderer/features/settings/components/tabs/types";
import type { ToastType } from "@shared/ui/ToastContext";

type ShowToast = (message: string, type: ToastType, duration?: number) => void;

const EMPTY_MODEL_VIEW: LlmModelSettingsView = {
  modelsDir: "",
  defaultModelPath: null,
  defaultModelId: null,
  defaultEmbeddingModelPath: null,
  defaultEmbeddingModelId: null,
  models: [],
  hasHuggingFaceToken: false,
};

export function useSettingsModel(activeTab: SettingsTabId, showToast: ShowToast) {
  const [modelView, setModelView] = useState<LlmModelSettingsView>(EMPTY_MODEL_VIEW);
  const [isModelBusy, setIsModelBusy] = useState(false);
  const [manualModelPath, setManualModelPath] = useState("");
  const [hfToken, setHfToken] = useState("");
  const [downloadStatus, setDownloadStatus] = useState<LlmModelDownloadStatus>({
    active: false,
    modelId: "qwen3-4b-q4_k_m",
    fileName: "Qwen3-4B-Q4_K_M.gguf",
    downloadedBytes: 0,
    totalBytes: null,
    percent: null,
  });
  const [migrationHealth, setMigrationHealth] = useState<MigrationHealth | null>(null);
  const [hfSearchResults, setHfSearchResults] = useState<HfModelSearchResult[]>([]);
  const [hfModelFiles, setHfModelFiles] = useState<HfModelFile[]>([]);
  const [isHfSearching, setIsHfSearching] = useState(false);

  const refreshModelView = useCallback(async () => {
    const response = await api.settings.getLlmModels();
    if (!response.success || !response.data) {
      showToast(response.error?.message ?? "모델 설정을 불러오지 못했습니다.", "error");
      return;
    }
    setModelView(response.data);
    setManualModelPath(response.data.defaultModelPath ?? "");
  }, [showToast]);

  useEffect(() => {
    if (activeTab !== "model") return;
    void refreshModelView();
  }, [activeTab, refreshModelView]);

  const refreshMigrationHealth = useCallback(async () => {
    const response = await api.maintenance.getMigrationHealth();
    if (!response.success || !response.data) {
      return;
    }
    setMigrationHealth(response.data);
  }, []);

  useEffect(() => {
    if (activeTab !== "model") return;
    void refreshMigrationHealth();
  }, [activeTab, refreshMigrationHealth]);

  useEffect(() => {
    if (activeTab !== "model") return;
    let cancelled = false;
    const tick = async () => {
      const response = await api.settings.getLlmDownloadStatus();
      if (cancelled || !response.success || !response.data) return;
      setDownloadStatus(response.data);
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 700);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeTab]);

  const handleDownloadDefaultModel = useCallback(async () => {
    setIsModelBusy(true);
    try {
      const response = await api.settings.downloadDefaultLlmModel();
      if (!response.success || !response.data) {
        showToast(response.error?.message ?? "기본 모델 다운로드에 실패했습니다.", "error");
        return;
      }
      showToast(
        response.data.downloaded
          ? "기본 모델 다운로드가 완료되었습니다."
          : "이미 다운로드된 기본 모델을 사용합니다.",
        "success",
      );
      await refreshModelView();
    } finally {
      setIsModelBusy(false);
    }
  }, [refreshModelView, showToast]);

  const handleSetManualModelPath = useCallback(async () => {
    const modelPath = manualModelPath.trim();
    if (!modelPath) {
      showToast("모델 경로를 입력하세요.", "info");
      return;
    }
    setIsModelBusy(true);
    try {
      const response = await api.settings.setLlmDefaultModel({ modelPath });
      if (!response.success || !response.data) {
        showToast(response.error?.message ?? "기본 모델 경로 설정에 실패했습니다.", "error");
        return;
      }
      setModelView(response.data);
      showToast("기본 모델 경로를 저장했습니다.", "success");
    } finally {
      setIsModelBusy(false);
    }
  }, [manualModelPath, showToast]);

  const handleSetLocalModel = useCallback(async (modelPath: string, modelId: string) => {
    setIsModelBusy(true);
    try {
      const response = await api.settings.setLlmDefaultModel({ modelPath, modelId });
      if (!response.success || !response.data) {
        showToast(response.error?.message ?? "모델 선택에 실패했습니다.", "error");
        return;
      }
      setModelView(response.data);
      setManualModelPath(response.data.defaultModelPath ?? "");
      showToast("기본 모델을 변경했습니다.", "success");
    } finally {
      setIsModelBusy(false);
    }
  }, [showToast]);

  const handleHfSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setHfSearchResults([]); return; }
    setIsHfSearching(true);
    try {
      const response = await api.settings.searchHfModels({ query });
      if (response.success && response.data) setHfSearchResults(response.data);
      else showToast(response.error?.message ?? "검색 실패", "error");
    } finally {
      setIsHfSearching(false);
    }
  }, [showToast]);

  const handleGetHfModelFiles = useCallback(async (repoId: string) => {
    setHfModelFiles([]);
    const response = await api.settings.getHfModelFiles({ repoId });
    if (response.success && response.data) setHfModelFiles(response.data);
    else showToast(response.error?.message ?? "파일 목록 로드 실패", "error");
  }, [showToast]);

  const handleDownloadHfModel = useCallback(async (repoId: string, filename: string, modelId: string) => {
    setIsModelBusy(true);
    try {
      const response = await api.settings.downloadHfModel({ repoId, filename, modelId });
      if (!response.success) {
        showToast(response.error?.message ?? "다운로드 시작 실패", "error");
        return;
      }
      showToast(`${filename} 다운로드 시작`, "success");
    } finally {
      setIsModelBusy(false);
    }
  }, [showToast]);

  const handleSaveRuntimeSettings = useCallback(async (input: {
    contextSize?: number;
    gpuLayers?: number;
    ragTemperature?: number;
    ragMaxTokens?: number;
  }) => {
    setIsModelBusy(true);
    try {
      const response = await api.settings.setLlmRuntimeSettings(input);
      if (!response.success) {
        showToast(response.error?.message ?? "런타임 설정 저장에 실패했습니다.", "error");
        return;
      }
      showToast("런타임 설정을 저장했습니다.", "success");
      await refreshModelView();
    } finally {
      setIsModelBusy(false);
    }
  }, [refreshModelView, showToast]);

  const handleSaveHfToken = useCallback(async () => {
    const token = hfToken.trim();
    if (!token) {
      showToast("토큰을 입력하세요.", "info");
      return;
    }
    setIsModelBusy(true);
    try {
      const response = await api.settings.setHuggingFaceToken({ token });
      if (!response.success) {
        showToast(response.error?.message ?? "토큰 저장에 실패했습니다.", "error");
        return;
      }
      showToast("Hugging Face 토큰을 저장했습니다.", "success");
      setHfToken("");
      await refreshModelView();
    } finally {
      setIsModelBusy(false);
    }
  }, [hfToken, refreshModelView, showToast]);

  return {
    modelView,
    isModelBusy,
    manualModelPath,
    setManualModelPath,
    refreshModelView,
    handleDownloadDefaultModel,
    handleSetManualModelPath,
    handleSetLocalModel,
    hfToken,
    setHfToken,
    handleSaveHfToken,
    handleSaveRuntimeSettings,
    hfSearchResults,
    hfModelFiles,
    isHfSearching,
    handleHfSearch,
    handleGetHfModelFiles,
    handleDownloadHfModel,
    downloadStatus,
    migrationHealth,
    refreshMigrationHealth,
  };
}
