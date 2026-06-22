import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DownloadCloud, RefreshCw, X, AlertCircle } from "lucide-react";
import type { AppUpdateState } from "@shared/types";
import { api } from "@shared/api";

const CHECK_DELAY_MS = 3500;

const INITIAL_STATE: AppUpdateState = {
  status: "idle",
  currentVersion: "",
  rollbackAvailable: false,
};

const statusToTitle = (status: AppUpdateState["status"], t: (key: string, fallback: string) => string) => {
  if (status === "downloading") return t("updater.status.downloading", "업데이트 다운로드 중");
  if (status === "downloaded") return t("updater.status.ready", "업데이트 설치 준비됨");
  if (status === "error") return t("updater.status.error", "업데이트 실패");
  if (status === "available") return t("updater.status.available", "새 버전이 있습니다");
  if (status === "checking") return t("updater.status.checking", "업데이트 확인 중...");
  if (status === "applying") return t("updater.status.applying", "업데이트 적용 중...");
  return "";
};

export default function UpdaterNotification() {
  const { t } = useTranslation();
  const [state, setState] = useState<AppUpdateState>(INITIAL_STATE);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let disposed = false;

    void api.app.getUpdateState().then((response) => {
      if (disposed || !response.success || !response.data) return;
      setState(response.data);
    });

    const unsubscribe = api.app.onUpdateState((next) => {
      if (disposed) return;
      setState(next);
      if (next.status !== "idle") {
        setDismissed(false);
      }
    });

    const timer = window.setTimeout(() => {
      void api.app.checkUpdate();
    }, CHECK_DELAY_MS);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const visible = useMemo(() => {
    if (dismissed) return false;
    return state.status !== "idle";
  }, [dismissed, state.status]);

  const title = useMemo(() => statusToTitle(state.status, t), [state.status, t]);

  const detail = useMemo(() => {
    if (state.status === "available" && state.latestVersion) {
      return t("updater.message.available", {
        defaultValue: `현재 ${state.currentVersion} → 최신 ${state.latestVersion}`,
      });
    }
    if (state.message) return state.message;
    return null;
  }, [state.currentVersion, state.latestVersion, state.message, state.status, t]);

  const handleDownload = async () => {
    setBusy(true);
    try {
      const response = await api.app.downloadUpdate();
      if (!response.success) {
        setState((prev) => ({
          ...prev,
          status: "error",
          message: response.error?.message ?? response.data?.message ?? "UPDATE_DOWNLOAD_FAILED",
        }));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async () => {
    setBusy(true);
    try {
      const response = await api.app.applyUpdate();
      if (!response.success) {
        setState((prev) => ({
          ...prev,
          status: "error",
          message: response.error?.message ?? response.data?.message ?? "UPDATE_APPLY_FAILED",
        }));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRetryCheck = async () => {
    setBusy(true);
    try {
      await api.app.checkUpdate();
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed right-4 bottom-4 w-[360px] max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-[140] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {state.status === "downloading" || state.status === "checking" || state.status === "applying" ? (
              <RefreshCw className="w-5 h-5 text-accent animate-spin" />
            ) : state.status === "downloaded" ? (
              <DownloadCloud className="w-5 h-5 text-emerald-500" />
            ) : state.status === "error" ? (
              <AlertCircle className="w-5 h-5 text-danger-fg" />
            ) : (
              <DownloadCloud className="w-5 h-5 text-muted" />
            )}
            <h4 className="text-sm font-semibold text-fg m-0">{title}</h4>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-md text-muted hover:text-fg hover:bg-surface-hover transition-colors"
            disabled={busy}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {detail && <p className="text-xs text-muted mb-0 break-words">{detail}</p>}

        {state.status === "available" && (
          <div className="flex justify-end">
            <button
              onClick={() => void handleDownload()}
              disabled={busy}
              className="px-3 py-1.5 text-xs font-medium rounded bg-accent text-white hover:bg-accent/90 shadow-sm transition-colors disabled:opacity-60"
            >
              {t("updater.action.download", "업데이트 다운로드")}
            </button>
          </div>
        )}

        {state.status === "downloaded" && (
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDismissed(true)}
              disabled={busy}
              className="px-3 py-1.5 text-xs font-medium rounded text-muted hover:text-fg hover:bg-surface-hover transition-colors disabled:opacity-60"
            >
              {t("updater.action.later", "나중에")}
            </button>
            <button
              onClick={() => void handleApply()}
              disabled={busy}
              className="px-3 py-1.5 text-xs font-medium rounded bg-accent text-white hover:bg-accent/90 shadow-sm transition-colors disabled:opacity-60"
            >
              {t("updater.action.restart", "지금 업데이트")}
            </button>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex justify-end">
            <button
              onClick={() => void handleRetryCheck()}
              disabled={busy}
              className="px-3 py-1.5 text-xs font-medium rounded bg-accent text-white hover:bg-accent/90 shadow-sm transition-colors disabled:opacity-60"
            >
              {t("updater.action.retry", "다시 확인")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
