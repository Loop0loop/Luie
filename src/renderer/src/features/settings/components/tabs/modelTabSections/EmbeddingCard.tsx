import { CheckCircle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@renderer/components/ui/button";

import type { EmbeddingProgress, ModelTabProps, SemanticSearchState } from "./types";

interface EmbeddingCardProps {
  t: ModelTabProps["t"];
  isBusy: boolean;
  embeddingStatus: ModelTabProps["embeddingStatus"];
  embeddingProgress: EmbeddingProgress;
  embeddingDownloading: boolean;
  onDownloadEmbeddingModel: ModelTabProps["onDownloadEmbeddingModel"];
  semanticSearchState: SemanticSearchState;
}

const getSemanticDotClass = (semanticSearchState: SemanticSearchState) =>
  semanticSearchState === "ready"
    ? "bg-success"
    : semanticSearchState === "preparing"
      ? "bg-warning animate-pulse"
      : "bg-border";

export function EmbeddingCard({
  t,
  isBusy,
  embeddingStatus,
  embeddingProgress,
  embeddingDownloading,
  onDownloadEmbeddingModel,
  semanticSearchState,
}: EmbeddingCardProps) {
  return (
    <div className="rounded-control bg-surface border border-border p-3 space-y-3">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-control border border-border bg-bg text-muted">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-fg-secondary">
            {t("settings.localLlm.embedding.title")}
          </p>
          <p className="text-xs text-muted">
            {t("settings.localLlm.embedding.description")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs">
        <span className={`h-2 w-2 rounded-full ${getSemanticDotClass(semanticSearchState)}`} />
        <span className="text-fg-secondary">
          {t(`settings.localLlm.embedding.semantic.${semanticSearchState}`)}
        </span>
      </div>

      {embeddingStatus?.installed ? (
        <div className="flex items-center gap-1.5 text-xs text-success">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>
            {t("settings.localLlm.embedding.installed", { name: embeddingStatus.displayName })}
          </span>
        </div>
      ) : (
        <p className="text-xs text-muted">{t("settings.localLlm.embedding.notInstalled")}</p>
      )}

      {embeddingDownloading && embeddingProgress?.stage === "downloading" && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{t("settings.localLlm.embedding.downloading")}</span>
            <span>{embeddingProgress.pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${embeddingProgress.pct}%` }}
            />
          </div>
        </div>
      )}

      {embeddingProgress?.error && (
        <p className="text-xs text-danger">{embeddingProgress.error}</p>
      )}

      {!embeddingStatus?.installed && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => void onDownloadEmbeddingModel()}
          disabled={embeddingDownloading || isBusy}
          className="w-full"
        >
          {embeddingDownloading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="ml-1.5">{t("settings.localLlm.embedding.downloading")}</span>
            </>
          ) : (
            t("settings.localLlm.embedding.download")
          )}
        </Button>
      )}
    </div>
  );
}
