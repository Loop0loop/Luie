import { useCallback, useEffect, useState } from "react";
import { api } from "@shared/api";
import type { MigrationHealth } from "@shared/types";
import type { SettingsTabId } from "@renderer/features/settings/components/tabs/types";
import type { ToastType } from "@shared/ui/ToastContext";

type ShowToast = (message: string, type: ToastType, duration?: number) => void;

export function useSettingsModel(activeTab: SettingsTabId, showToast: ShowToast) {
  const [isBusy, setIsBusy] = useState(false);
  const [migrationHealth, setMigrationHealth] = useState<MigrationHealth | null>(null);
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://localhost:11434");
  const [ollamaChatModel, setOllamaChatModel] = useState("");

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
        const { baseUrl, chatModel } = res.data.llm.ollama;
        if (baseUrl) setOllamaBaseUrl(baseUrl);
        setOllamaChatModel(chatModel ?? "");
      }
      await refreshMigrationHealth();
    })();
  }, [activeTab, refreshMigrationHealth]);

  const handleSaveOllamaConfig = useCallback(async (input: {
    baseUrl: string;
    chatModel: string;
    embeddingModel?: string;
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

  return {
    isBusy,
    migrationHealth,
    refreshMigrationHealth,
    ollamaBaseUrl,
    ollamaChatModel,
    handleSaveOllamaConfig,
    handleListOllamaModels,
    handleTestOllamaConnection,
  };
}
