export type MemoryEvalOptimizationGuardInput = {
  label: string;
  averageContextRecallAtK: number;
  totalP0FailureCount: number;
  minAverageContextRecallAtK: number;
  maxTotalP0FailureCount: number;
};

export function summarizeMemoryEvalOptimizationFailures(
  input: MemoryEvalOptimizationGuardInput,
): string[] {
  const failures: string[] = [];
  if (input.averageContextRecallAtK < input.minAverageContextRecallAtK) {
    failures.push(
      `${input.label} averageContextRecallAtK ${input.averageContextRecallAtK} < ${input.minAverageContextRecallAtK}`,
    );
  }
  if (input.totalP0FailureCount > input.maxTotalP0FailureCount) {
    failures.push(
      `${input.label} totalP0FailureCount ${input.totalP0FailureCount} > ${input.maxTotalP0FailureCount}`,
    );
  }
  return failures;
}
