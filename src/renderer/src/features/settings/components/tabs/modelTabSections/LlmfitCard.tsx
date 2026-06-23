import { Cpu, Loader2 } from "lucide-react";
import type { LlmfitResult } from "@shared/types";

import type { ModelTabProps } from "./types";

interface LlmfitCardProps {
  t: ModelTabProps["t"];
  llmfitResult: LlmfitResult | null;
  llmfitLoading: boolean;
}

const fitBadgeClass = (
  level: "perfect" | "good" | "marginal" | "too_tight" | "unknown",
): string => {
  switch (level) {
    case "perfect":
      return "bg-success/15 text-success border border-success/30";
    case "good":
      return "bg-accent/15 text-accent border border-accent/30";
    case "marginal":
      return "bg-warning/15 text-warning border border-warning/30";
    case "too_tight":
      return "bg-danger/15 text-danger border border-danger/30";
    default:
      return "bg-surface text-muted border border-border";
  }
};

export function LlmfitCard({ t, llmfitResult, llmfitLoading }: LlmfitCardProps) {
  return (
    <div className="rounded-control bg-surface border border-border p-3 space-y-3">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-control border border-border bg-bg text-muted">
          <Cpu className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-fg-secondary">
            {t("settings.localLlm.llmfit.title")}
          </p>
          <p className="text-xs text-muted">{t("settings.localLlm.llmfit.description")}</p>
        </div>
      </div>

      {llmfitLoading ? (
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>{t("settings.localLlm.llmfit.loading")}</span>
        </div>
      ) : llmfitResult?.available ? (
        llmfitResult.recommendations.length > 0 ? (
          <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-control border border-border bg-panel">
            {llmfitResult.recommendations.map((rec) => (
              <div key={rec.name} className="space-y-1 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-fg">{rec.name}</span>
                  <span
                    className={`shrink-0 rounded-control px-2 py-0.5 text-[11px] ${fitBadgeClass(rec.fitLevel)}`}
                  >
                    {t(`settings.localLlm.llmfit.fit.${rec.fitLevel}`)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
                  {rec.paramsB !== null && <span>{rec.paramsB}B</span>}
                  {rec.estimatedTps !== null && (
                    <span>{t("settings.localLlm.llmfit.speed", { tps: rec.estimatedTps })}</span>
                  )}
                  {rec.memoryRequiredGb !== null && (
                    <span>{t("settings.localLlm.llmfit.memory", { gb: rec.memoryRequiredGb })}</span>
                  )}
                  {rec.bestQuant && <span>{rec.bestQuant}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted">{t("settings.localLlm.llmfit.noResults")}</p>
        )
      ) : (
        <p className="text-xs text-muted">{t("settings.localLlm.llmfit.unavailable")}</p>
      )}
    </div>
  );
}
