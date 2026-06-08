import { describe, expect, it } from "vitest";
import type { NarrativeMemoryQueryPlan } from "../../../../../src/main/services/features/memory/query/internal/plan.js";
import {
  createDefaultNarrativeMemoryIntentCalibrationCases,
  runNarrativeMemoryIntentClassifierCalibration,
  type NarrativeMemoryIntentClassifier,
} from "../../../../../src/main/services/features/memory/query/internal/memoryIntentClassifierCalibration.js";

const classifier: NarrativeMemoryIntentClassifier = async ({ question }) => {
  const planByQuestion = new Map<string, NarrativeMemoryQueryPlan>([
    [
      "10화 기준 아린과 백야회는 어떤 관계인가?",
      {
        intent: "relationship-at-chapter",
        sources: ["memory_relation_state", "memory_fact_evidence"],
        reason: "relationship question",
      },
    ],
    [
      "현재 설정 충돌 검사해줘",
      {
        intent: "contradiction-check",
        sources: ["memory_fact_invalidation", "memory_fact"],
        reason: "contradiction question",
      },
    ],
  ]);
  const plan = planByQuestion.get(question);
  if (!plan) throw new Error("unexpected calibration question");
  return plan;
};

describe("runNarrativeMemoryIntentClassifierCalibration", () => {
  it("passes when expected intent and required sources are returned", async () => {
    const result = await runNarrativeMemoryIntentClassifierCalibration({
      projectId: "project-1",
      classifier,
      cases: [
        {
          id: "relationship",
          name: "relationship route",
          question: "10화 기준 아린과 백야회는 어떤 관계인가?",
          expected: {
            intent: "relationship-at-chapter",
            requiredSources: ["memory_relation_state", "memory_fact_evidence"],
          },
        },
      ],
    });

    expect(result.caseCount).toBe(1);
    expect(result.passCount).toBe(1);
    expect(result.failures).toEqual([]);
  });

  it("reports intent mismatches and missing required sources", async () => {
    const result = await runNarrativeMemoryIntentClassifierCalibration({
      projectId: "project-1",
      classifier,
      cases: [
        {
          id: "bad-intent",
          name: "bad intent",
          question: "10화 기준 아린과 백야회는 어떤 관계인가?",
          expected: {
            intent: "entity-profile",
            requiredSources: ["memory_entity"],
          },
        },
      ],
    });

    expect(result.passCount).toBe(0);
    expect(result.failures).toEqual([
      {
        caseId: "bad-intent",
        reason: "EXPECTED_INTENT_MISMATCH",
        detail: "expected=entity-profile actual=relationship-at-chapter",
      },
      {
        caseId: "bad-intent",
        reason: "EXPECTED_SOURCE_MISSING",
        detail: "memory_entity",
      },
    ]);
  });

  it("includes default calibration cases for every narrative memory intent", () => {
    const cases = createDefaultNarrativeMemoryIntentCalibrationCases();
    const intents = new Set(cases.map((item) => item.expected.intent));

    expect(intents).toEqual(
      new Set([
        "evidence-trace",
        "entity-profile",
        "entity-state-at-chapter",
        "relationship-at-chapter",
        "event-causality",
        "contradiction-check",
        "unresolved-thread-check",
        "global-summary",
      ]),
    );
  });
});
