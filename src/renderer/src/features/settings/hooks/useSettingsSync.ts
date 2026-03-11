import { useCallback, useEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";
import type { ToastContextType } from "@shared/ui/ToastContext";
import type { SyncStatus } from "@shared/types";
import { api } from "@shared/api";
import {
  syncRunResultSchema,
  syncStatusSchema,
} from "@shared/schemas/index.js";

type ShowToast = ToastContextType["showToast"];

const DEFAULT_SYNC_STATUS: SyncStatus = {
  connected: false,
  autoSync: true,
  mode: "idle",
  health: "disconnected",
  inFlight: false,
  queued: false,
  conflicts: {
    chapters: 0,
    memos: 0,
    total: 0,
    items: [],
  },
};

export function useSettingsSync(t: TFunction, showToast: ShowToast) {
  const syncActionLockRef = useRef(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(DEFAULT_SYNC_STATUS);
  const [isSyncBusy, setIsSyncBusy] = useState(false);

  const refreshSyncStatus = useCallback(async () => {
    const response = await api.sync.getStatus();
    if (!response.success || !response.data) return null;

    const parsed = syncStatusSchema.safeParse(response.data);
    if (!parsed.success) return null;

    setSyncStatus(parsed.data);
    return parsed.data;
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const nextStatus = await refreshSyncStatus();
      if (cancelled || !nextStatus) return;
      setSyncStatus(nextStatus);
    })();

    const unsubscribe = api.sync.onStatusChanged((status) => {
      if (cancelled) return;
      const parsed = syncStatusSchema.safeParse(status);
      if (!parsed.success) return;
      setSyncStatus(parsed.data);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [refreshSyncStatus]);

  useEffect(() => {
    const unsubscribe = api.sync.onAuthResult((result) => {
      if (!result) return;

      if (result.status === "success") {
        showToast(
          t("settings.sync.toast.connected", "Google 계정 연결이 완료되었습니다."),
          "success",
        );
      } else if (result.status === "stale") {
        showToast(
          t(
            "settings.sync.toast.staleCallback",
            "이미 처리된 로그인 콜백입니다. 현재 연결 상태를 유지합니다.",
          ),
          "info",
        );
      } else {
        const message =
          result.reason === "STATE_MISMATCH"
            ? t(
                "settings.sync.toast.stateMismatch",
                "로그인 보안 검증(state)이 일치하지 않았습니다. 다시 로그인해 주세요.",
              )
            : result.reason === "EXPIRED"
              ? t(
                  "settings.sync.toast.callbackExpired",
                  "로그인 요청이 만료되었습니다. 다시 로그인해 주세요.",
                )
              : t("settings.sync.toast.connectFailed");
        showToast(message, "error");
      }

      void refreshSyncStatus();
    });

    return unsubscribe;
  }, [refreshSyncStatus, showToast, t]);

  const runSyncAction = useCallback(async (action: () => Promise<void>) => {
    if (syncActionLockRef.current) return;
    syncActionLockRef.current = true;
    setIsSyncBusy(true);
    try {
      await action();
    } finally {
      syncActionLockRef.current = false;
      setIsSyncBusy(false);
    }
  }, []);

  const handleConnectGoogle = useCallback(() => {
    void runSyncAction(async () => {
      const response = await api.sync.connectGoogle();
      if (!response.success || !response.data) {
        showToast(t("settings.sync.toast.connectFailed"), "error");
        return;
      }

      const parsed = syncStatusSchema.safeParse(response.data);
      if (!parsed.success) {
        showToast(t("settings.sync.toast.connectFailed"), "error");
        return;
      }

      setSyncStatus(parsed.data);
      showToast(t("settings.sync.toast.connectStarted"), "info");
    });
  }, [runSyncAction, showToast, t]);

  const handleReconnectGoogle = useCallback(() => {
    void runSyncAction(async () => {
      const disconnected = await api.sync.disconnect();
      if (disconnected.success && disconnected.data) {
        const parsedDisconnect = syncStatusSchema.safeParse(disconnected.data);
        if (parsedDisconnect.success) {
          setSyncStatus(parsedDisconnect.data);
        }
      }

      const response = await api.sync.connectGoogle();
      if (!response.success || !response.data) {
        showToast(t("settings.sync.toast.connectFailed"), "error");
        return;
      }

      const parsed = syncStatusSchema.safeParse(response.data);
      if (!parsed.success) {
        showToast(t("settings.sync.toast.connectFailed"), "error");
        return;
      }

      setSyncStatus(parsed.data);
      showToast(t("settings.sync.toast.connectStarted"), "info");
    });
  }, [runSyncAction, showToast, t]);

  const handleDisconnect = useCallback(() => {
    void runSyncAction(async () => {
      const response = await api.sync.disconnect();
      if (!response.success || !response.data) {
        showToast(t("settings.sync.toast.disconnectFailed"), "error");
        return;
      }

      const parsed = syncStatusSchema.safeParse(response.data);
      if (!parsed.success) {
        showToast(t("settings.sync.toast.disconnectFailed"), "error");
        return;
      }

      setSyncStatus(parsed.data);
      showToast(t("settings.sync.toast.disconnected"), "info");
    });
  }, [runSyncAction, showToast, t]);

  const handleSyncNow = useCallback(() => {
    void runSyncAction(async () => {
      const response = await api.sync.runNow();
      const parsedResult = syncRunResultSchema.safeParse(response.data);
      if (!response.success || !parsedResult.success) {
        showToast(t("settings.sync.toast.syncFailed"), "error");
        return;
      }

      await refreshSyncStatus();

      if (!parsedResult.data.success) {
        if (parsedResult.data.message === "SYNC_CONFLICT_DETECTED") {
          showToast(
            t(
              "settings.sync.toast.conflictDetected",
              "Sync conflicts detected. Please resolve them.",
            ),
            "info",
          );
          return;
        }

        showToast(t("settings.sync.toast.syncFailed"), "error");
        return;
      }

      showToast(t("settings.sync.toast.synced"), "success");
    });
  }, [refreshSyncStatus, runSyncAction, showToast, t]);

  const handleToggleAutoSync = useCallback(
    (enabled: boolean) => {
      void runSyncAction(async () => {
        const response = await api.sync.setAutoSync({ enabled });
        if (!response.success || !response.data) {
          showToast(t("settings.sync.toast.autoSyncFailed"), "error");
          return;
        }

        const parsed = syncStatusSchema.safeParse(response.data);
        if (!parsed.success) {
          showToast(t("settings.sync.toast.autoSyncFailed"), "error");
          return;
        }

        setSyncStatus(parsed.data);
      });
    },
    [runSyncAction, showToast, t],
  );

  const handleResolveConflict = useCallback(
    async (input: {
      type: "chapter" | "memo";
      id: string;
      resolution: "local" | "remote";
    }) => {
      await runSyncAction(async () => {
        const response = await api.sync.resolveConflict(input);
        if (!response.success) {
          showToast(t("settings.sync.toast.syncFailed"), "error");
          return;
        }

        const nextStatus = await refreshSyncStatus();
        if (nextStatus?.conflicts.total === 0) {
          showToast(
            t("settings.sync.conflicts.allResolved", "All conflicts resolved!"),
            "success",
          );
        }
      });
    },
    [refreshSyncStatus, runSyncAction, showToast, t],
  );

  return {
    handleConnectGoogle,
    handleDisconnect,
    handleReconnectGoogle,
    handleResolveConflict,
    handleSyncNow,
    handleToggleAutoSync,
    isSyncBusy,
    syncStatus,
  };
}
