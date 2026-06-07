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
    <div className="mb-2 rounded-md border border-border bg-surface/60 px-2.5 py-2 text-[11px] text-muted">
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <div className="min-w-0">
          <span className="text-fg-secondary">Requested:</span>{" "}
          <span>{runtimeLabel(runtimeInfo.requestedProvider ?? runtimeInfo.provider)}</span>
        </div>
        <div className="min-w-0">
          <span className="text-fg-secondary">Resolved:</span>{" "}
          <span>{runtimeLabel(runtimeInfo.resolvedProvider ?? runtimeInfo.provider)}</span>
        </div>
        {runtimeInfo.backend && (
          <div className="min-w-0">
            <span className="text-fg-secondary">Backend:</span>{" "}
            <span>{runtimeInfo.backend}</span>
          </div>
        )}
        {runtimeInfo.model && (
          <div className="min-w-0 truncate">
            <span className="text-fg-secondary">Model:</span>{" "}
            <span>{runtimeInfo.model}</span>
          </div>
        )}
        {runtimeInfo.fallbackUsed && (
          <div className="col-span-2 text-warning">
            Fallback route is active
          </div>
        )}
      </div>
      {skipped.length > 0 && (
        <div className="mt-1 truncate">
          <span className="text-fg-secondary">Skipped:</span>{" "}
          {skipped.map((skip) => `${runtimeLabel(skip.provider)} ${skip.code}`).join(", ")}
        </div>
      )}
      {sidecarStatus && (
        <div className={`mt-1 truncate ${sidecarStatusTone(sidecarStatus.status)}`}>
          {sidecarStatusSummary(sidecarStatus)}
        </div>
      )}
    </div>
  );
}

