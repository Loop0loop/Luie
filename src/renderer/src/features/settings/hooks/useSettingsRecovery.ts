import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TFunction } from "i18next";
import type {
  DbRecoveryResult,
  DbRecoveryStatus,
} from "@shared/types/index.js";
import type { ToastContextType } from "@shared/ui/ToastContext";
import { api } from "@shared/api";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import {
  dbRecoveryResultSchema,
  dbRecoveryStatusSchema,
} from "@shared/schemas/index.js";

type ShowToast = ToastContextType["showToast"];

interface RecoveryScopeSummary {
  currentProjectTitle: string | null;
  localProjectCount: number;
  previewTitles: string[];
  remainingProjectCount: number;
}

const formatRecoveryMessage = (t: TFunction, message: string) => {
  if (message === "Backup created. Run recovery to apply WAL.") {
    return t("settings.recovery.messages.backupCreated");
  }

  if (message === "Recovery completed successfully.") {
    return t("settings.recovery.messages.recoveryCompleted");
  }

  if (message === "WAL file not found. Recovery is not available.") {
    return t("settings.recovery.messages.walMissing");
  }

  if (message.startsWith("DB_RECOVERY_WAL_BUSY")) {
    return t("settings.recovery.messages.walBusy");
  }

  if (message.startsWith("DB_RECOVERY_INTEGRITY_FAILED")) {
    const detail = message.split(":").slice(1).join(":").trim() || "-";
    return t("settings.recovery.messages.integrityFailed", { detail });
  }

  return message;
};

const buildFallbackResult = (
  dryRun: boolean,
  message: string,
): DbRecoveryResult => ({
  success: false,
  dryRun,
  message,
});

export function useSettingsRecovery(t: TFunction, showToast: ShowToast) {
  const currentProject = useProjectStore((state) => state.currentProject);
  const projects = useProjectStore((state) => state.projects);
  const mountedRef = useRef(true);
  const recoveryRunLockRef = useRef(false);
  const recoveryStatusRequestIdRef = useRef(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isRecoveryStatusLoading, setIsRecoveryStatusLoading] = useState(true);
  const [recoveryStatus, setRecoveryStatus] = useState<DbRecoveryStatus | null>(
    null,
  );
  const [recoveryStatusError, setRecoveryStatusError] = useState<string | null>(
    null,
  );
  const [recoveryResult, setRecoveryResult] = useState<DbRecoveryResult | null>(
    null,
  );
  const recoveryScope = useMemo<RecoveryScopeSummary>(() => {
    const orderedProjects = [
      ...(currentProject ? [currentProject] : []),
      ...projects.filter((project) => project.id !== currentProject?.id),
    ];
    const previewTitles = orderedProjects
      .map((project) => project.title?.trim())
      .filter((title): title is string => Boolean(title))
      .slice(0, 4);
    const localProjectCount = Math.max(projects.length, currentProject ? 1 : 0);

    return {
      currentProjectTitle: currentProject?.title ?? null,
      localProjectCount,
      previewTitles,
      remainingProjectCount: Math.max(
        localProjectCount - previewTitles.length,
        0,
      ),
    };
  }, [currentProject, projects]);

  const refreshRecoveryStatus = useCallback(async () => {
    const requestId = recoveryStatusRequestIdRef.current + 1;
    recoveryStatusRequestIdRef.current = requestId;

    if (mountedRef.current) {
      setIsRecoveryStatusLoading(true);
      setRecoveryStatusError(null);
    }

    try {
      const response = await api.recovery.getStatus();
      const parsed = dbRecoveryStatusSchema.safeParse(response.data);

      if (
        !mountedRef.current ||
        recoveryStatusRequestIdRef.current !== requestId
      ) {
        return;
      }

      if (response.success && parsed.success) {
        setRecoveryStatus(parsed.data);
        return;
      }

      setRecoveryStatusError(t("settings.recovery.messages.statusLoadFailed"));
    } catch {
      if (
        !mountedRef.current ||
        recoveryStatusRequestIdRef.current !== requestId
      ) {
        return;
      }
      setRecoveryStatusError(t("settings.recovery.messages.statusLoadFailed"));
    } finally {
      if (
        mountedRef.current &&
        recoveryStatusRequestIdRef.current === requestId
      ) {
        setIsRecoveryStatusLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    void refreshRecoveryStatus();
  }, [refreshRecoveryStatus]);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const runRecovery = useCallback(
    async (dryRun: boolean) => {
      if (recoveryRunLockRef.current) return;

      recoveryRunLockRef.current = true;
      if (mountedRef.current) {
        setIsRecovering(true);
        setRecoveryResult(null);
      }

      try {
        const response = await api.recovery.runDb({ dryRun });
        const parsed = dbRecoveryResultSchema.safeParse(response.data);

        if (!mountedRef.current) {
          return;
        }

        if (response.success && parsed.success) {
          const normalizedMessage = formatRecoveryMessage(
            t,
            parsed.data.message,
          );
          const nextResult = {
            ...parsed.data,
            message: normalizedMessage,
          };
          setRecoveryResult(nextResult);

          if (nextResult.success) {
            showToast(normalizedMessage, dryRun ? "info" : "success");
          } else {
            showToast(
              normalizedMessage || t("settings.recovery.failed"),
              "error",
            );
          }
          return;
        }

        const failedMessage = t("settings.recovery.failed");
        setRecoveryResult(buildFallbackResult(dryRun, failedMessage));
        showToast(failedMessage, "error");
      } catch {
        if (!mountedRef.current) {
          return;
        }

        const errorMessage = t("settings.recovery.error");
        setRecoveryResult(buildFallbackResult(dryRun, errorMessage));
        showToast(errorMessage, "error");
      } finally {
        recoveryRunLockRef.current = false;
        if (mountedRef.current) {
          await refreshRecoveryStatus();
          setIsRecovering(false);
        }
      }
    },
    [refreshRecoveryStatus, showToast, t],
  );

  const handleRunRecovery = useCallback(
    (dryRun: boolean) => {
      void runRecovery(dryRun);
    },
    [runRecovery],
  );

  const handleRefreshRecoveryStatus = useCallback(() => {
    void refreshRecoveryStatus();
  }, [refreshRecoveryStatus]);

  return {
    handleRefreshRecoveryStatus,
    handleRunRecovery,
    isRecovering,
    isRecoveryStatusLoading,
    recoveryResult,
    recoveryScope,
    recoveryStatus,
    recoveryStatusError,
    refreshRecoveryStatus,
    runRecovery,
  };
}
