import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@renderer/components/ui/button";

import { getInstalledModelName } from "./format";
import type { DownloadProgress, ModelTabProps } from "./types";

interface LocalLlmCardProps {
  t: ModelTabProps["t"];
  isBusy: boolean;
  localLlmEnabled: boolean;
  localLlmModelPath?: string;
  isDownloading: boolean;
  downloadProgress: DownloadProgress;
  onDownloadLocalModel: ModelTabProps["onDownloadLocalModel"];
  onToggleLocalLlm: ModelTabProps["onToggleLocalLlm"];
}

export function LocalLlmCard({
  t,
  isBusy,
  localLlmEnabled,
  localLlmModelPath,
  isDownloading,
  downloadProgress,
  onDownloadLocalModel,
  onToggleLocalLlm,
}: LocalLlmCardProps) {
  return (
    <div className="rounded-control bg-surface border border-border p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-fg-secondary">{t("settings.localLlm.enabled")}</p>
          <p className="text-xs text-muted">{t("settings.localLlm.toggleHelp")}</p>
        </div>
        <button
          type="button"
          aria-label={t("settings.localLlm.enabled")}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
            localLlmEnabled ? "bg-accent" : "bg-border"
          } ${!localLlmModelPath ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
          onClick={() => void onToggleLocalLlm(!localLlmEnabled)}
          disabled={!localLlmModelPath}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              localLlmEnabled ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {localLlmModelPath ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-success">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{t("settings.localLlm.modelReady")}</span>
          </div>
          <p className="text-xs text-muted">
            {t("settings.localLlm.currentModel")}: {getInstalledModelName(localLlmModelPath)}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted">{t("settings.localLlm.noModel")}</p>
      )}

      {isDownloading && downloadProgress && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              {downloadProgress.stage === "binary"
                ? t("settings.localLlm.downloadingBinary")
                : t("settings.localLlm.downloadingModel")}
            </span>
            <span>{downloadProgress.pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${downloadProgress.pct}%` }}
            />
          </div>
        </div>
      )}

      {downloadProgress?.error && (
        <p className="text-xs text-danger">{downloadProgress.error}</p>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => void onDownloadLocalModel()}
        disabled={isDownloading || isBusy}
        className="w-full"
      >
        {isDownloading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="ml-1.5">{t("settings.localLlm.downloading")}</span>
          </>
        ) : (
          t("settings.localLlm.download")
        )}
      </Button>
    </div>
  );
}
