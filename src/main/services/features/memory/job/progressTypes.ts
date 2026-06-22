export type MemoryBuildJobProgress = {
  projectId: string;
  total: number;
  activeCount: number;
  doneCount: number;
  byStatus: Record<string, number>;
  attention: {
    retryableFailedCount: number;
    retryBackoffCount: number;
    exhaustedFailedCount: number;
    staleCancellationRequestedCount: number;
    recoveredStaleRunningCount: number;
    nextRetryAt: string | null;
    latestError: string | null;
  };
  byJobType: Record<
    string,
    {
      total: number;
      activeCount: number;
      doneCount: number;
      byStatus: Record<string, number>;
    }
  >;
  byTargetType: Record<
    string,
    {
      total: number;
      activeCount: number;
      doneCount: number;
      byStatus: Record<string, number>;
    }
  >;
  byTarget: Record<
    string,
    {
      targetType: string;
      targetId: string;
      label: string | null;
      total: number;
      activeCount: number;
      doneCount: number;
      byStatus: Record<string, number>;
    }
  >;
};
