import { useTranslation } from "react-i18next";
import { DownloadCloud, RefreshCw, X, AlertCircle } from "lucide-react";
import { useUpdaterStore } from "@renderer/features/workspace/stores/useUpdaterStore";
import { api } from "@shared/api";

export default function UpdaterNotification() {
    const { t } = useTranslation();
    const { status, progress, message, dismiss } = useUpdaterStore();

    if (status === "idle") return null;

    return (
        <div className="absolute right-4 bottom-4 w-80 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        {status === "downloading" ? (
                            <RefreshCw className="w-5 h-5 text-accent animate-spin" />
                        ) : status === "downloaded" ? (
                            <DownloadCloud className="w-5 h-5 text-emerald-500" />
                        ) : status === "error" ? (
                            <AlertCircle className="w-5 h-5 text-danger-fg" />
                        ) : (
                            <DownloadCloud className="w-5 h-5 text-muted" />
                        )}
                        <h4 className="text-sm font-semibold text-fg m-0">
                            {status === "downloading" && t("updater.status.downloading", "Downloading Update")}
                            {status === "downloaded" && t("updater.status.ready", "Update Ready to Install")}
                            {status === "error" && t("updater.status.error", "Update Failed")}
                            {status === "available" && t("updater.status.available", "Update Available")}
                            {status === "checking" && t("updater.status.checking", "Checking for Updates...")}
                        </h4>
                    </div>
                    <button
                        onClick={dismiss}
                        className="p-1 rounded-md text-muted hover:text-fg hover:bg-surface-hover transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {status === "downloading" && (
                    <div className="w-full flex flex-col gap-1.5 mt-2">
                        <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                            <div
                                className="h-full bg-accent transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="text-[10px] text-right text-muted font-mono">
                            {progress.toFixed(1)}%
                        </div>
                    </div>
                )}

                {(message || status === "error") && (
                    <p className="text-xs text-muted mb-0">
                        {message ?? t("updater.defaultErrorMessage", "Could not download the update. Please try again later.")}
                    </p>
                )}

                {status === "downloaded" && (
                    <div className="flex justify-end gap-2 mt-2">
                        <button
                            onClick={dismiss}
                            className="px-3 py-1.5 text-xs font-medium rounded text-muted hover:text-fg hover:bg-surface-hover transition-colors"
                        >
                            {t("updater.action.later", "Later")}
                        </button>
                        <button
                            onClick={() => {
                                // If there's an IPC listener for quitting and installing:
                                // window.api.app.quitAndInstallUpdate();
                                api.app.quit();
                            }}
                            className="px-3 py-1.5 text-xs font-medium rounded bg-accent text-white hover:bg-accent/90 shadow-sm transition-colors"
                        >
                            {t("updater.action.restart", "Restart & Install")}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
