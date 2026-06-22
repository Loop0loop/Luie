import { describe, expect, it } from "vitest";
import {
  summarizeMemoryEvalOptimizationFailures,
  type MemoryEvalOptimizationGuardInput,
} from "../../../../../src/main/services/features/memory/eval/memoryEvalOptimizationGuard.js";

describe("memoryEvalOptimizationGuard", () => {
  it("passes when optimized recall stays above the baseline threshold", () => {
    const input: MemoryEvalOptimizationGuardInput = {
      label: "phase-4-3-optimized-rag",
      averageContextRecallAtK: 1,
      totalP0FailureCount: 0,
      minAverageContextRecallAtK: 0.98,
      maxTotalP0FailureCount: 0,
    };

    expect(summarizeMemoryEvalOptimizationFailures(input)).toEqual([]);
  });

  it("summarizes recall and P0 failures for CI assertion mode", () => {
    const input: MemoryEvalOptimizationGuardInput = {
      label: "phase-4-3-optimized-rag",
      averageContextRecallAtK: 0.91,
      totalP0FailureCount: 2,
      minAverageContextRecallAtK: 0.98,
      maxTotalP0FailureCount: 0,
    };

    expect(summarizeMemoryEvalOptimizationFailures(input)).toEqual([
      "phase-4-3-optimized-rag averageContextRecallAtK 0.91 < 0.98",
      "phase-4-3-optimized-rag totalP0FailureCount 2 > 0",
    ]);
  });
});
