import { i18n } from "@renderer/i18n";
import { useCallback, useEffect, useState } from "react";
import { api } from "@shared/api";
import { useDialog } from "@shared/ui/useDialog";
import { useToast } from "@shared/ui/ToastContext";
import type {
  AnalysisRuntimeInfo,
  AnalysisSidecarStatus,
  RuntimePreference,
  SearchOptimizationMode,
} from "../shared/types";

export function useAnalysisRuntime() {
  const [runtimeInfo, setRuntimeInfo] = useState<AnalysisRuntimeInfo>(null);
  const [runtimePreference, setRuntimePreference] =
    useState<RuntimePreference>("auto");
  const [searchOptimizationMode, setSearchOptimizationMode] =
    useState<SearchOptimizationMode>("standard");
  const [sidecarStatus, setSidecarStatus] =
    useState<AnalysisSidecarStatus>(null);
  const { showToast } = useToast();
  const dialog = useDialog();

  useEffect(() => {
    void (async () => {
      const all = await api.settings.getAll();
      if (all.success) {
        const provider = all.data?.llm?.preferredProvider;
        if (provider) {
          setRuntimePreference(provider);
        }
        const mode = all.data?.llm?.searchOptimizationMode;
        if (mode) {
          setSearchOptimizationMode(mode);
        }
      }

      const runtime = await api.settings.getLlmRuntime();
      if (runtime.success && runtime.data) {
        setRuntimeInfo(runtime.data);
      }

      const sidecar = await api.settings.getSidecarStatus();
      if (sidecar.success && sidecar.data) {
        setSidecarStatus(sidecar.data);
      }
    })();
  }, []);

  useEffect(() => {
    return api.settings.onSidecarStatusChanged((event) => {
      if (event.purpose !== "chat") return;
      setSidecarStatus(event.status);
    });
  }, []);

  const applyRuntimePreference = useCallback(
    async (next: RuntimePreference) => {
      const response = await api.settings.setLlmPreference({ provider: next });
      if (!response.success) {
        showToast(
          response.error?.message ?? i18n.t("analysis.runtime.preferenceError"),
          "error",
        );
        return;
      }

      const runtime = await api.settings.getLlmRuntime();
      if (!runtime.success || !runtime.data) {
        return;
      }

      setRuntimeInfo(runtime.data);
      const sidecar = await api.settings.getSidecarStatus();
      if (sidecar.success && sidecar.data) {
        setSidecarStatus(sidecar.data);
      }

      if (runtime.data.resolvedProvider === "unavailable") {
        const reason =
          runtime.data.skipped?.[0]?.message ??
          i18n.t("analysis.runtime.runtimeUnavailable");
        const confirmed = await dialog.confirm({
          title: i18n.t("analysis.runtime.unavailableTitle"),
          message: i18n.t("analysis.runtime.unavailableMessage", { reason }),
        });
        if (confirmed) {
          window.dispatchEvent(
            new CustomEvent("luie:open-settings", {
              detail: { tab: "model" },
            }),
          );
        }
        return;
      }

      setRuntimePreference(next);
      showToast(
        i18n.t("analysis.runtime.preferenceChanged", {
          next,
          resolved: runtime.data.resolvedProvider ?? runtime.data.provider,
        }),
        "info",
      );
    },
    [dialog, showToast],
  );

  const applySearchOptimizationMode = useCallback(
    async (next: SearchOptimizationMode) => {
      const response = await api.settings.setSearchOptimizationMode({
        mode: next,
      });
      if (!response.success) {
        showToast(
          response.error?.message ?? i18n.t("analysis.runtime.searchModeError"),
          "error",
        );
        return;
      }

      const applied = response.data?.mode ?? next;
      setSearchOptimizationMode(applied);
      showToast(
        i18n.t("analysis.runtime.searchModeSuccess", { mode: applied }),
        "info",
      );
    },
    [showToast],
  );

  return {
    runtimeInfo,
    runtimePreference,
    searchOptimizationMode,
    sidecarStatus,
    applyRuntimePreference,
    applySearchOptimizationMode,
  };
}
