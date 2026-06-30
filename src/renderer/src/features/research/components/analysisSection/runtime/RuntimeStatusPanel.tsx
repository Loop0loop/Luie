import type { LlmRuntimeInfo, UtilitySidecarStatus } from "@shared/types";
import { runtimeLabel, sidecarStatusSummary, sidecarStatusTone } from "./runtimeHelpers";

type RuntimeStatusPanelProps = {
  runtimeInfo: LlmRuntimeInfo | null;
  sidecarStatus: UtilitySidecarStatus | null;
};

export function RuntimeStatusPanel({
  runtimeInfo,
  sidecarStatus,
}: RuntimeStatusPanelProps) {
  if (!runtimeInfo) return null;
  const skipped = runtimeInfo.skipped ?? [];

  return (
    <div className="mb-1 rounded-panel border border-white/10 dark:border-white/5 bg-surface/20 dark:bg-surface/15 backdrop-blur-xl px-2.5 py-1.5 text-[10px] text-muted/80 shadow-md select-none transition-all duration-200">
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        <div className="min-w-0">
          <span className="text-muted/60 font-medium">Req:</span>{" "}
          <span className="font-semibold text-fg/80">{runtimeLabel(runtimeInfo.requestedProvider ?? runtimeInfo.provider)}</span>
        </div>
        <div className="min-w-0">
          <span className="text-muted/60 font-medium">Res:</span>{" "}
          <span className="font-semibold text-fg/80">{runtimeLabel(runtimeInfo.resolvedProvider ?? runtimeInfo.provider)}</span>
        </div>
        {runtimeInfo.backend && (
          <div className="min-w-0">
            <span className="text-muted/60 font-medium">Backend:</span>{" "}
            <span className="text-fg/80">{runtimeInfo.backend}</span>
          </div>
        )}
        {runtimeInfo.model && (
          <div className="min-w-0 truncate">
            <span className="text-muted/60 font-medium">Model:</span>{" "}
            <span className="text-fg/80" title={runtimeInfo.model}>{runtimeInfo.model}</span>
          </div>
        )}
        {runtimeInfo.fallbackUsed && (
          <div className="col-span-2 text-warning font-semibold flex items-center gap-1 mt-0.5">
            <span className="w-1 h-1 rounded-full bg-warning animate-ping" />
            Fallback route is active
          </div>
        )}
      </div>
      {skipped.length > 0 && (
        <div className="mt-0.5 truncate border-t border-white/5 pt-0.5">
          <span className="text-muted/60 font-medium">Skipped:</span>{" "}
          <span className="text-muted/70">{skipped.map((skip) => `${runtimeLabel(skip.provider)} ${skip.code}`).join(", ")}</span>
        </div>
      )}
      {sidecarStatus && (
        <div className={`mt-0.5 truncate border-t border-white/5 pt-0.5 flex items-center gap-1 ${sidecarStatusTone(sidecarStatus.status)}`}>
          <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
          {sidecarStatusSummary(sidecarStatus)}
        </div>
      )}
    </div>
  );
}

