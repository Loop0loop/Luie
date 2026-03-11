import { useCallback, useRef, useState } from "react";
import type { TFunction } from "i18next";
import type { ToastContextType } from "@shared/ui/ToastContext";
import { api } from "@shared/api";
import { dbRecoveryResultSchema } from "@shared/schemas/index.js";

type ShowToast = ToastContextType["showToast"];

export function useSettingsRecovery(t: TFunction, showToast: ShowToast) {
  const recoveryRunLockRef = useRef(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  const runRecovery = useCallback(
    async (dryRun: boolean) => {
      if (recoveryRunLockRef.current) return;

      recoveryRunLockRef.current = true;
      setIsRecovering(true);
      setRecoveryMessage(null);
      try {
        const response = await api.recovery.runDb({ dryRun });
        const parsed = dbRecoveryResultSchema.safeParse(response.data);
        if (response.success && parsed.success) {
          setRecoveryMessage(parsed.data.message ?? t("settings.recovery.success"));
          if (!parsed.data.success) {
            showToast(parsed.data.message || t("settings.recovery.failed"), "error");
          }
        } else {
          setRecoveryMessage(t("settings.recovery.failed"));
          showToast(t("settings.recovery.failed"), "error");
        }
      } catch {
        setRecoveryMessage(t("settings.recovery.error"));
        showToast(t("settings.recovery.error"), "error");
      } finally {
        recoveryRunLockRef.current = false;
        setIsRecovering(false);
      }
    },
    [showToast, t],
  );

  const handleRunRecovery = useCallback(
    (dryRun: boolean) => {
      void runRecovery(dryRun);
    },
    [runRecovery],
  );

  return {
    handleRunRecovery,
    isRecovering,
    recoveryMessage,
    runRecovery,
  };
}
