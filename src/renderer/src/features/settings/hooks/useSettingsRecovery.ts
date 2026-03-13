import { useCallback, useEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";
import type {
  DbRecoveryResult,
  DbRecoveryStatus,
} from "@shared/types/index.js";
import type { ToastContextType } from "@shared/ui/ToastContext";
import { api } from "@shared/api";
import {
  dbRecoveryResultSchema,
  dbRecoveryStatusSchema,
} from "@shared/schemas/index.js";

type ShowToast = ToastContextType["showToast"];

const formatRecoveryMessage = (t: TFunction, message: string) => {
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
    recoveryStatus,
    recoveryStatusError,
    refreshRecoveryStatus,
    runRecovery,
  };
}
