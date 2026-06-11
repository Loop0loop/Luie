import { NarrativeSummaryStatusPanel } from "./NarrativeSummaryStatusPanel";
import type { AnalysisNarrativeSummaryStatus } from "../../shared/types";

type SummaryDrawerProps = {
  open: boolean;
  loading: boolean;
  error: string | null;
  status: AnalysisNarrativeSummaryStatus | null;
  onClose: () => void;
};

/**
 * 서사 요약을 상단 고정 대신 슬라이드 인 드로어로 노출합니다.
 * 입력창의 서사 요약 토글로 열고 닫습니다.
 */
export function SummaryDrawer({
  open,
  loading,
  error,
  status,
  onClose,
}: SummaryDrawerProps) {
  if (!open) return null;

  return (
    <div className="absolute top-3 left-3 right-3 z-overlay animate-[fadeIn_0.2s_ease-out]">
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
