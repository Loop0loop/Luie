import { useEffect, useRef, useState } from "react";
import type { LlmRuntimeInfo, UtilitySidecarStatus } from "@shared/types";
import { RuntimeStatusPanel } from "./RuntimeStatusPanel";
import { sidecarStatusTone } from "./runtimeHelpers";

type RuntimeStatusDotProps = {
  runtimeInfo: LlmRuntimeInfo | null;
  sidecarStatus: UtilitySidecarStatus | null;
};

const resolveDotTone = (
  runtimeInfo: LlmRuntimeInfo | null,
  sidecarStatus: UtilitySidecarStatus | null,
): string => {
  if (runtimeInfo?.fallbackUsed) return "text-warning";
  if (sidecarStatus) return sidecarStatusTone(sidecarStatus.status);
  return "text-emerald-500/80";
};

/**
 * 런타임/디버그 정보를 평소엔 작은 상태 점으로만 노출하고,
 * 클릭 시 RuntimeStatusPanel 팝오버로 상세를 보여줍니다.
 */
export function RuntimeStatusDot({
  runtimeInfo,
  sidecarStatus,
}: RuntimeStatusDotProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!runtimeInfo) return null;

  const tone = resolveDotTone(runtimeInfo, sidecarStatus);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-neutral-800/60 transition-colors"
        title="런타임 상태"
        aria-label="런타임 상태"
      >
        <span
          className={`w-1.5 h-1.5 rounded-full bg-current ${tone} ${
            runtimeInfo.fallbackUsed ? "animate-pulse" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute bottom-9 right-0 w-64 z-dropdown animate-[fadeIn_0.15s_ease-out]">
          <RuntimeStatusPanel
            runtimeInfo={runtimeInfo}
            sidecarStatus={sidecarStatus}
          />
        </div>
      )}
    </div>
  );
}
