import { describe, expect, it } from "vitest";
import {
  MEMORY_WRITER_TASK_BENCHMARK_TASKS,
  assessMemoryWriterTaskBenchmarkThresholds,
  calibrateMemoryWriterTaskBenchmarkThresholds,
  classifyMemoryWriterTaskBenchmarkCase,
  summarizeMemoryWriterTaskBenchmark,
} from "../../../../../src/main/services/features/memory/benchmark/memoryWriterTaskBenchmark.js";
import type {
  MemoryEvalCaseDefinition,
  MemoryEvalScoreResult,
} from "../../../../../src/shared/types/index.js";

const makeCase = (
  id: string,
  input: Partial<MemoryEvalCaseDefinition>,
): MemoryEvalCaseDefinition => ({
  id,
  projectId: "project-1",
  name: input.name ?? id,
  question: input.question ?? "설정을 확인해줘",
  caseType: input.caseType,
  expectedAnswer: input.expectedAnswer ?? "근거 있는 답변",
  queryChapterOrder: input.queryChapterOrder,
  temporalScopeStartChapterId: input.temporalScopeStartChapterId,
  temporalScopeEndChapterId: input.temporalScopeEndChapterId,
  expectedRelations: input.expectedRelations,
  expectedThreads: input.expectedThreads,
  goldEvidence: [
    {
      id: `${id}-gold`,
      chapterId: "chapter-1",
      expectedChunkId: `${id}-chunk`,
      startOffset: 0,
      endOffset: 10,
      quote: "근거 문장",
    },
  ],
});

const makeScore = (
  caseId: string,
  input: Partial<MemoryEvalScoreResult>,
): MemoryEvalScoreResult => ({
  caseId,
  evidenceHitCount: input.evidenceHitCount ?? 1,
  evidenceMissCount: input.evidenceMissCount ?? 0,
  contextRecallAtK: input.contextRecallAtK ?? 1,
  p0FailureCount: input.p0FailureCount ?? 0,
  p0Failures: input.p0Failures ?? [],
});

describe("memoryWriterTaskBenchmark", () => {
  it("defines the five Phase 7 writer task benchmark categories", () => {
    expect(MEMORY_WRITER_TASK_BENCHMARK_TASKS.map((task) => task.id)).toEqual([
      "setting-check",
      "character-relation-check",
      "thread-resolution-check",
      "chapter-knowledge-state-check",
      "draft-canon-conflict-check",
    ]);
  });

  it("classifies eval cases into writer task benchmark categories", () => {
    expect(
      classifyMemoryWriterTaskBenchmarkCase(
        makeCase("relation", {
          caseType: "relation",
          expectedRelations: [
            {
              sourceName: "아린",
              targetName: "백야회",
              relation: "hostile_to",
            },
          ],
        }),
      ),
    ).toBe("character-relation-check");
    expect(
      classifyMemoryWriterTaskBenchmarkCase(
        makeCase("thread", {
          expectedThreads: [{ name: "봉인된 문", status: "unresolved" }],
        }),
      ),
    ).toBe("thread-resolution-check");
    expect(
      classifyMemoryWriterTaskBenchmarkCase(
        makeCase("temporal", {
          caseType: "temporal_state",
          queryChapterOrder: 3,
        }),
      ),
    ).toBe("chapter-knowledge-state-check");
    expect(
      classifyMemoryWriterTaskBenchmarkCase(
        makeCase("draft", {
          question: "이 초안 설정을 정사로 확정해도 되나?",
        }),
      ),
    ).toBe("draft-canon-conflict-check");
    expect(classifyMemoryWriterTaskBenchmarkCase(makeCase("setting", {}))).toBe(
      "setting-check",
    );
  });

  it("summarizes success, response time, evidence satisfaction, and false confidence by task", () => {
    const settingCase = makeCase("setting", {});
    const relationCase = makeCase("relation", {
      caseType: "relation",
      expectedRelations: [
        { sourceName: "아린", targetName: "백야회", relation: "hostile_to" },
      ],
    });
    const draftCase = makeCase("draft", {
      question: "폐기 설정을 확정해도 되나?",
    });

    const summary = summarizeMemoryWriterTaskBenchmark([
      {
        evalCase: settingCase,
        scoreResult: makeScore("setting", {}),
        responseTimeMs: 120,
      },
      {
        evalCase: relationCase,
        scoreResult: makeScore("relation", {
          contextRecallAtK: 0.5,
          p0FailureCount: 1,
          p0Failures: ["relation_direction_reversed"],
        }),
        responseTimeMs: 240,
      },
      {
        evalCase: draftCase,
        scoreResult: makeScore("draft", {
          contextRecallAtK: 0,
          p0FailureCount: 1,
          p0Failures: ["deleted_or_draft_fact_confirmed"],
        }),
        responseTimeMs: 360,
      },
    ]);

    expect(summary).toMatchObject({
      schemaVersion: 1,
      taskCount: 5,
      caseCount: 3,
      successRate: 1 / 3,
      averageResponseTimeMs: 240,
      evidenceSatisfactionRate: 0.5,
      falseConfidenceRate: 1 / 3,
    });
    expect(summary.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taskId: "setting-check",
          caseCount: 1,
          successRate: 1,
          evidenceSatisfactionRate: 1,
          falseConfidenceRate: 0,
        }),
        expect.objectContaining({
          taskId: "character-relation-check",
          caseCount: 1,
          successRate: 0,
          evidenceSatisfactionRate: 0.5,
          falseConfidenceRate: 0,
          p0FailureCount: 1,
        }),
        expect.objectContaining({
          taskId: "draft-canon-conflict-check",
          caseCount: 1,
          successRate: 0,
          evidenceSatisfactionRate: 0,
          falseConfidenceRate: 1,
          p0FailureCount: 1,
        }),
      ]),
    );
  });

  it("refuses threshold calibration when beta sample count is insufficient", () => {
    const summary = summarizeMemoryWriterTaskBenchmark([
      {
        evalCase: makeCase("setting", {}),
        scoreResult: makeScore("setting", {}),
        responseTimeMs: 120,
      },
    ]);

    expect(
      assessMemoryWriterTaskBenchmarkThresholds({
        summaries: [summary],
        minimumBetaRunCount: 3,
      }),
    ).toEqual({
      status: "insufficient_beta_data",
      betaRunCount: 1,
      minimumBetaRunCount: 3,
      failures: [],
    });
  });

  it("assesses writer benchmark thresholds only after enough beta samples exist", () => {
    const passing = summarizeMemoryWriterTaskBenchmark([
      {
        evalCase: makeCase("setting", {}),
        scoreResult: makeScore("setting", {}),
        responseTimeMs: 120,
      },
    ]);
    const failing = summarizeMemoryWriterTaskBenchmark([
      {
        evalCase: makeCase("draft", {
          question: "폐기 설정을 확정해도 되나?",
        }),
        scoreResult: makeScore("draft", {
          contextRecallAtK: 0,
          p0FailureCount: 1,
          p0Failures: ["deleted_or_draft_fact_confirmed"],
        }),
        responseTimeMs: 1200,
      },
    ]);

    expect(
      assessMemoryWriterTaskBenchmarkThresholds({
        summaries: [passing, passing, failing],
        minimumBetaRunCount: 3,
        thresholds: {
          minSuccessRate: 0.8,
          minEvidenceSatisfactionRate: 0.7,
          maxFalseConfidenceRate: 0.1,
          maxAverageResponseTimeMs: 800,
        },
      }),
    ).toEqual({
      status: "failed",
      betaRunCount: 3,
      minimumBetaRunCount: 3,
      failures: [
        "successRate",
        "evidenceSatisfactionRate",
        "falseConfidenceRate",
      ],
    });
  });

  it("calibrates threshold candidates from enough beta benchmark samples", () => {
    const fastPassing = summarizeMemoryWriterTaskBenchmark([
      {
        evalCase: makeCase("setting", {}),
        scoreResult: makeScore("setting", {}),
        responseTimeMs: 100,
      },
    ]);
    const slowerSupported = summarizeMemoryWriterTaskBenchmark([
      {
        evalCase: makeCase("relation", {
          caseType: "relation",
          expectedRelations: [
            { sourceName: "아린", targetName: "백야회", relation: "member_of" },
          ],
        }),
        scoreResult: makeScore("relation", {
          contextRecallAtK: 0.8,
        }),
        responseTimeMs: 300,
      },
    ]);
    const falseConfident = summarizeMemoryWriterTaskBenchmark([
      {
        evalCase: makeCase("draft", {
          question: "폐기 설정을 정사라고 답해도 되나?",
        }),
        scoreResult: makeScore("draft", {
          contextRecallAtK: 0.4,
          p0FailureCount: 1,
          p0Failures: ["deleted_or_draft_fact_confirmed"],
        }),
        responseTimeMs: 500,
      },
    ]);

    expect(
      calibrateMemoryWriterTaskBenchmarkThresholds({
        summaries: [fastPassing, slowerSupported, falseConfident],
        minimumBetaRunCount: 3,
      }),
    ).toEqual({
      status: "calibrated",
      betaRunCount: 3,
      minimumBetaRunCount: 3,
      thresholds: {
        minSuccessRate: 2 / 3,
        minEvidenceSatisfactionRate: (1 + 0.8 + 0.4) / 3,
        maxFalseConfidenceRate: 1 / 3,
        maxAverageResponseTimeMs: 300,
      },
    });
  });

  it("refuses threshold candidate calibration when beta samples are insufficient", () => {
    const summary = summarizeMemoryWriterTaskBenchmark([
      {
        evalCase: makeCase("setting", {}),
        scoreResult: makeScore("setting", {}),
        responseTimeMs: 100,
      },
    ]);

    expect(
      calibrateMemoryWriterTaskBenchmarkThresholds({
        summaries: [summary],
        minimumBetaRunCount: 3,
      }),
    ).toEqual({
      status: "insufficient_beta_data",
      betaRunCount: 1,
      minimumBetaRunCount: 3,
    });
  });
});
