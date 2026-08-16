import { NarrativeSummaryStatusPanel } from "./NarrativeSummaryStatusPanel";
import type { AnalysisNarrativeSummaryStatus } from "../../shared/types";

type SummaryDrawerProps = {
  open: boolean;
  loading: boolean;
  error: string | null;
  status: AnalysisNarrativeSummaryStatus | null;
  onClose: () => void;
};

export function SummaryDrawer({
  open,
  loading,
  error,
  status,
  onClose,
}: SummaryDrawerProps) {
  if (!open) return null;

  return (
    <div className="absolute top-3 left-3 right-3 z-20 animate-[fadeIn_0.2s_ease-out]">
      <NarrativeSummaryStatusPanel
        visible
        loading={loading}
        error={error}
        status={status}
        onToggle={onClose}
      />
    </div>
  );
}
