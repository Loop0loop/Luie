import type {
  MemoryEvalCaseDefinition,
  MemoryEvalP0Failure,
  MemoryEvalScoreResult,
  MemoryWriterTaskBenchmarkSummary,
  MemoryWriterTaskBenchmarkTaskId,
  MemoryWriterTaskBenchmarkTaskSummary,
} from "../../../../../shared/types/index.js";

export type MemoryWriterTaskBenchmarkTask = {
  id: MemoryWriterTaskBenchmarkTaskId;
  labelKo: string;
  goal: string;
};

export type MemoryWriterTaskBenchmarkCaseResult = {
  evalCase: MemoryEvalCaseDefinition;
  scoreResult: MemoryEvalScoreResult;
  responseTimeMs?: number;
};

export type MemoryWriterTaskBenchmarkThresholds = {
  minSuccessRate: number;
  minEvidenceSatisfactionRate: number;
  maxFalseConfidenceRate: number;
  maxAverageResponseTimeMs: number;
};

export type MemoryWriterTaskBenchmarkThresholdFailure =
  | "successRate"
  | "evidenceSatisfactionRate"
  | "falseConfidenceRate"
  | "averageResponseTimeMs";

export type MemoryWriterTaskBenchmarkThresholdAssessment = {
  status: "passed" | "failed" | "insufficient_beta_data";
  betaRunCount: number;
  minimumBetaRunCount: number;
  failures: MemoryWriterTaskBenchmarkThresholdFailure[];
};

export type MemoryWriterTaskBenchmarkThresholdCalibration =
  | {
      status: "calibrated";
      betaRunCount: number;
      minimumBetaRunCount: number;
      thresholds: MemoryWriterTaskBenchmarkThresholds;
    }
  | {
      status: "insufficient_beta_data";
      betaRunCount: number;
      minimumBetaRunCount: number;
    };

export const MEMORY_WRITER_TASK_BENCHMARK_TASKS: readonly MemoryWriterTaskBenchmarkTask[] =
  [
    {
      id: "setting-check",
      labelKo: "설정 확인",
      goal: "원문 근거로 세계관, 설정, 상태를 확인한다.",
    },
    {
      id: "character-relation-check",
      labelKo: "인물 관계 확인",
      goal: "인물, 별칭, 관계 방향을 뒤집지 않고 확인한다.",
    },
    {
      id: "thread-resolution-check",
      labelKo: "떡밥 회수 여부 확인",
      goal: "미회수/회수된 떡밥 상태를 근거와 함께 구분한다.",
    },
    {
      id: "chapter-knowledge-state-check",
      labelKo: "회차 기준 지식 상태 확인",
      goal: "기준 회차 이후 정보를 섞지 않고 당시 지식 상태를 확인한다.",
    },
    {
      id: "draft-canon-conflict-check",
      labelKo: "초안/정사 충돌 확인",
      goal: "초안, 폐기 설정, 정사 원문을 혼동하지 않는다.",
    },
  ] as const;

const FALSE_CONFIDENCE_FAILURES = new Set<MemoryEvalP0Failure>([
  "unsupported_confirmed_answer",
  "answer_contains_unsupported_claim",
  "expected_answer_not_supported_by_gold_evidence",
  "deleted_or_draft_fact_confirmed",
  "future_fact_used_in_past_answer",
  "unresolved_thread_falsely_marked_resolved",
]);

export function classifyMemoryWriterTaskBenchmarkCase(
  evalCase: MemoryEvalCaseDefinition,
): MemoryWriterTaskBenchmarkTaskId {
  const searchableText = `${evalCase.name} ${evalCase.question} ${
    evalCase.expectedAnswer ?? ""
  }`.toLowerCase();
  if (
    evalCase.caseType === "relation" ||
    (evalCase.expectedRelations?.length ?? 0) > 0
  ) {
    return "character-relation-check";
  }
  if (
    evalCase.caseType === "temporal_state" ||
    evalCase.queryChapterOrder !== undefined ||
    evalCase.temporalScopeStartChapterId ||
    evalCase.temporalScopeEndChapterId
  ) {
    return "chapter-knowledge-state-check";
  }
  if ((evalCase.expectedThreads?.length ?? 0) > 0) {
    return "thread-resolution-check";
  }
  if (
    searchableText.includes("초안") ||
    searchableText.includes("폐기") ||
    searchableText.includes("draft") ||
    searchableText.includes("canon")
  ) {
    return "draft-canon-conflict-check";
  }
  return "setting-check";
}

export function summarizeMemoryWriterTaskBenchmark(
  results: MemoryWriterTaskBenchmarkCaseResult[],
): MemoryWriterTaskBenchmarkSummary {
  const taskSummaries = MEMORY_WRITER_TASK_BENCHMARK_TASKS.map((task) => {
    const taskResults = results.filter(
      (result) =>
        classifyMemoryWriterTaskBenchmarkCase(result.evalCase) === task.id,
    );
    return summarizeTask(task.id, taskResults);
  });
  const totals = summarizeTask(
    "setting-check",
    results,
  );

  return {
    schemaVersion: 1,
    taskCount: MEMORY_WRITER_TASK_BENCHMARK_TASKS.length,
    caseCount: results.length,
    successRate: totals.successRate,
    averageResponseTimeMs: totals.averageResponseTimeMs,
    evidenceSatisfactionRate: totals.evidenceSatisfactionRate,
    falseConfidenceRate: totals.falseConfidenceRate,
    tasks: taskSummaries,
  };
}

export function assessMemoryWriterTaskBenchmarkThresholds(input: {
  summaries: MemoryWriterTaskBenchmarkSummary[];
  minimumBetaRunCount: number;
  thresholds?: MemoryWriterTaskBenchmarkThresholds;
}): MemoryWriterTaskBenchmarkThresholdAssessment {
  const betaRunCount = input.summaries.length;
  if (betaRunCount < input.minimumBetaRunCount) {
    return {
      status: "insufficient_beta_data",
      betaRunCount,
      minimumBetaRunCount: input.minimumBetaRunCount,
      failures: [],
    };
  }
  const thresholds = input.thresholds ?? DEFAULT_WRITER_TASK_BENCHMARK_THRESHOLDS;
  const aggregate = aggregateBenchmarkSummaries(input.summaries);
  const failures: MemoryWriterTaskBenchmarkThresholdFailure[] = [];
  if (aggregate.successRate < thresholds.minSuccessRate) {
    failures.push("successRate");
  }
  if (
    aggregate.evidenceSatisfactionRate <
    thresholds.minEvidenceSatisfactionRate
  ) {
    failures.push("evidenceSatisfactionRate");
  }
  if (aggregate.falseConfidenceRate > thresholds.maxFalseConfidenceRate) {
    failures.push("falseConfidenceRate");
  }
  if (
    aggregate.averageResponseTimeMs !== null &&
    aggregate.averageResponseTimeMs > thresholds.maxAverageResponseTimeMs
  ) {
    failures.push("averageResponseTimeMs");
  }
  return {
    status: failures.length === 0 ? "passed" : "failed",
    betaRunCount,
    minimumBetaRunCount: input.minimumBetaRunCount,
    failures,
  };
}

export function calibrateMemoryWriterTaskBenchmarkThresholds(input: {
  summaries: MemoryWriterTaskBenchmarkSummary[];
  minimumBetaRunCount: number;
}): MemoryWriterTaskBenchmarkThresholdCalibration {
  const betaRunCount = input.summaries.length;
  if (betaRunCount < input.minimumBetaRunCount) {
    return {
      status: "insufficient_beta_data",
      betaRunCount,
      minimumBetaRunCount: input.minimumBetaRunCount,
    };
  }
  const aggregate = aggregateBenchmarkSummaries(input.summaries);
  return {
    status: "calibrated",
    betaRunCount,
    minimumBetaRunCount: input.minimumBetaRunCount,
    thresholds: {
      minSuccessRate: aggregate.successRate,
      minEvidenceSatisfactionRate: aggregate.evidenceSatisfactionRate,
      maxFalseConfidenceRate: aggregate.falseConfidenceRate,
      maxAverageResponseTimeMs:
        aggregate.averageResponseTimeMs ??
        DEFAULT_WRITER_TASK_BENCHMARK_THRESHOLDS.maxAverageResponseTimeMs,
    },
  };
}

export const DEFAULT_WRITER_TASK_BENCHMARK_THRESHOLDS: MemoryWriterTaskBenchmarkThresholds =
  {
    minSuccessRate: 0.8,
    minEvidenceSatisfactionRate: 0.75,
    maxFalseConfidenceRate: 0.05,
    maxAverageResponseTimeMs: 5_000,
  };

function summarizeTask(
  taskId: MemoryWriterTaskBenchmarkTaskId,
  results: MemoryWriterTaskBenchmarkCaseResult[],
): MemoryWriterTaskBenchmarkTaskSummary {
  const caseCount = results.length;
  const successCount = results.filter(isSuccessfulCase).length;
  const responseTimes = results
    .map((result) => result.responseTimeMs)
    .filter((value): value is number => typeof value === "number");
  const p0FailureCount = results.reduce(
    (sum, result) => sum + result.scoreResult.p0FailureCount,
    0,
  );
  const falseConfidenceCount = results.filter((result) =>
    result.scoreResult.p0Failures.some((failure) =>
      FALSE_CONFIDENCE_FAILURES.has(failure),
    ),
  ).length;

  return {
    taskId,
    caseCount,
    successCount,
    successRate: ratio(successCount, caseCount),
    averageResponseTimeMs:
      responseTimes.length === 0
        ? null
        : responseTimes.reduce((sum, value) => sum + value, 0) /
          responseTimes.length,
    evidenceSatisfactionRate:
      caseCount === 0
        ? 0
        : results.reduce(
            (sum, result) => sum + result.scoreResult.contextRecallAtK,
            0,
          ) / caseCount,
    falseConfidenceRate: ratio(falseConfidenceCount, caseCount),
    p0FailureCount,
  };
}

function isSuccessfulCase(result: MemoryWriterTaskBenchmarkCaseResult): boolean {
  return (
    result.scoreResult.p0FailureCount === 0 &&
    result.scoreResult.contextRecallAtK > 0
  );
}

function ratio(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function aggregateBenchmarkSummaries(
  summaries: MemoryWriterTaskBenchmarkSummary[],
): Pick<
  MemoryWriterTaskBenchmarkSummary,
  | "successRate"
  | "averageResponseTimeMs"
  | "evidenceSatisfactionRate"
  | "falseConfidenceRate"
> {
  const averageResponseTimes = summaries
    .map((summary) => summary.averageResponseTimeMs)
    .filter((value): value is number => typeof value === "number");
  return {
    successRate: averageMetric(summaries, (summary) => summary.successRate),
    averageResponseTimeMs:
      averageResponseTimes.length === 0
        ? null
        : averageResponseTimes.reduce((sum, value) => sum + value, 0) /
          averageResponseTimes.length,
    evidenceSatisfactionRate: averageMetric(
      summaries,
      (summary) => summary.evidenceSatisfactionRate,
    ),
    falseConfidenceRate: averageMetric(
      summaries,
      (summary) => summary.falseConfidenceRate,
    ),
  };
}

function averageMetric(
  summaries: MemoryWriterTaskBenchmarkSummary[],
  select: (summary: MemoryWriterTaskBenchmarkSummary) => number,
): number {
  if (summaries.length === 0) return 0;
  return summaries.reduce((sum, summary) => sum + select(summary), 0) / summaries.length;
}
