import { Button } from "@renderer/components/ui/button";

import type { ModelTabProps } from "./types";
import {
  buildMemoryBuildProgressView,
  getMemoryBuildJobTypeLabel,
  getMemoryBuildStatusLabel,
} from "./memoryBuildProgress";

interface RebuildMemoryCardProps {
  t: ModelTabProps["t"];
  isBusy: boolean;
  onRebuildMemory: ModelTabProps["onRebuildMemory"];
  onPauseMemoryBuildJobs: ModelTabProps["onPauseMemoryBuildJobs"];
  onResumeMemoryBuildJobs: ModelTabProps["onResumeMemoryBuildJobs"];
  onCancelMemoryBuildJobs: ModelTabProps["onCancelMemoryBuildJobs"];
  memoryBuildProgress: ModelTabProps["memoryBuildProgress"];
}

export function RebuildMemoryCard({
  t,
  isBusy,
  onRebuildMemory,
  onPauseMemoryBuildJobs,
  onResumeMemoryBuildJobs,
  onCancelMemoryBuildJobs,
  memoryBuildProgress,
}: RebuildMemoryCardProps) {
  const progress = buildMemoryBuildProgressView(memoryBuildProgress);
  const statusItems = [
    ["pending", progress.pendingCount],
    ["running", progress.runningCount],
    ["paused", progress.pausedCount],
    ["failed", progress.failedCount],
    ["cancel_requested", progress.cancellationRequestedCount],
    ["canceled", progress.canceledCount],
  ].filter(([, count]) => Number(count) > 0);

  return (
    <div className="rounded-control bg-surface border border-border p-3 space-y-2">
      <p className="text-xs font-medium text-fg-secondary">{t("settings.localLlm.rebuildMemory.title")}</p>
      <p className="text-xs text-muted">{t("settings.localLlm.rebuildMemory.description")}</p>
      {progress.total > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>
              {t("settings.localLlm.rebuildMemory.progress", {
                done: progress.doneCount,
                total: progress.total,
                percent: progress.percent,
              })}
            </span>
            <span>{progress.activeCount > 0 ? t("settings.localLlm.rebuildMemory.active") : t("settings.localLlm.rebuildMemory.idle")}</span>
          </div>
          <div className="h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          {statusItems.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {statusItems.map(([status, count]) => (
                <span
                  key={status}
                  className="rounded-control border border-border px-1.5 py-0.5 text-[11px] text-muted"
                >
                  {t(`settings.localLlm.rebuildMemory.status.${status}`, {
                    defaultValue: getMemoryBuildStatusLabel(String(status)),
                  })} {count}
                </span>
              ))}
            </div>
          )}
          {progress.attentionItems.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {progress.attentionItems.map((item) => (
                <span
                  key={item.key}
                  className="rounded-control border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[11px] text-warning"
                >
                  {t(`settings.localLlm.rebuildMemory.attention.${item.key}`, {
                    defaultValue: item.label,
                  })} {item.count}
                </span>
              ))}
            </div>
          )}
          {progress.latestError && (
            <p className="truncate text-[11px] text-muted">
              {t("settings.localLlm.rebuildMemory.latestError", {
                error: progress.latestError,
              })}
            </p>
          )}
          {progress.jobTypeItems.length > 0 && (
            <div className="space-y-1">
              {progress.jobTypeItems.map((item) => (
                <div
                  key={item.jobType}
                  className="flex items-center justify-between gap-2 text-[11px] text-muted"
                >
                  <span className="truncate">
                    {t(`settings.localLlm.rebuildMemory.jobType.${item.jobType}`, {
                      defaultValue: getMemoryBuildJobTypeLabel(item.jobType),
                    })}
                  </span>
                  <span className="shrink-0">
                    {t("settings.localLlm.rebuildMemory.jobTypeProgress", {
                      active: item.activeCount,
                      done: item.doneCount,
                      total: item.total,
                      percent: item.percent,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={() => void onRebuildMemory()}
        disabled={isBusy}
        className="w-full"
      >
        {t("settings.localLlm.rebuildMemory.start")}
      </Button>
      {progress.total > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void onPauseMemoryBuildJobs()}
            disabled={isBusy || progress.activeCount === 0}
          >
            {t("settings.localLlm.rebuildMemory.pause")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void onResumeMemoryBuildJobs()}
            disabled={isBusy || progress.pausedCount === 0}
          >
            {t("settings.localLlm.rebuildMemory.resume")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void onCancelMemoryBuildJobs()}
            disabled={isBusy || progress.activeCount === 0}
          >
            {t("settings.localLlm.rebuildMemory.cancel")}
          </Button>
        </div>
      )}
    </div>
  );
}
