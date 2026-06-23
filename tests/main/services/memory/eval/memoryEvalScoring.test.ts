import { describe, expect, it } from "vitest";
import {
  runMemoryEvalSuite,
  scoreMemoryEvalCase,
} from "../../../../../src/main/services/features/memory/eval/memoryEvalScoring.js";
import type { MemoryEvalCaseDefinition } from "../../../../../src/shared/types/index.js";

const baseCase: MemoryEvalCaseDefinition = {
  id: "case-1",
  projectId: "project-1",
  name: "관계 근거 회수",
  question: "아린과 백야회의 관계는 무엇인가?",
  expectedAnswer: "아린은 백야회와 적대한다.",
  goldEvidence: [
    {
      id: "gold-1",
      chapterId: "chapter-3",
      expectedChunkId: "chunk-3-a",
      startOffset: 120,
      endOffset: 170,
      quote: "아린은 백야회의 추적을 피해 골목으로 숨어들었다.",
    },
  ],
};

describe("scoreMemoryEvalCase", () => {
  it("counts evidence hits by chunk id and reports recall at k", () => {
    const result = scoreMemoryEvalCase({
      evalCase: baseCase,
      retrievedEvidence: [
        {
          chunkId: "chunk-3-a",
          chapterId: "chapter-3",
          offset: 130,
          quote: "아린은 백야회의 추적을 피해 골목으로 숨어들었다.",
        },
      ],
      groundingStatus: "inferred",
      topK: 3,
    });

    expect(result.evidenceHitCount).toBe(1);
    expect(result.evidenceMissCount).toBe(0);
    expect(result.contextRecallAtK).toBe(1);
    expect(result.p0FailureCount).toBe(0);
    expect(result.p0Failures).toEqual([]);
  });

  it("counts evidence hits by chapter and offset overlap when chunk ids differ", () => {
    const result = scoreMemoryEvalCase({
      evalCase: baseCase,
      retrievedEvidence: [
        {
          chunkId: "rechunked-3-a",
          chapterId: "chapter-3",
          offset: 150,
          quote: "백야회의 추적을 피해",
        },
      ],
      groundingStatus: "inferred",
      topK: 3,
    });

    expect(result.evidenceHitCount).toBe(1);
    expect(result.contextRecallAtK).toBe(1);
  });

  it("flags confirmed answers without supporting gold evidence as a P0 failure", () => {
    const result = scoreMemoryEvalCase({
      evalCase: baseCase,
      retrievedEvidence: [],
      groundingStatus: "confirmed",
      topK: 3,
    });

    expect(result.evidenceHitCount).toBe(0);
    expect(result.evidenceMissCount).toBe(1);
    expect(result.contextRecallAtK).toBe(0);
    expect(result.p0FailureCount).toBe(1);
    expect(result.p0Failures).toEqual(["unsupported_confirmed_answer"]);
  });

  it("flags expected answers that are not supported by gold evidence", () => {
    const result = scoreMemoryEvalCase({
      evalCase: {
        ...baseCase,
        expectedAnswer:
          "아린은 백야회의 목적을 알고 봉인된 왕관을 훔쳤다.",
      },
      answer: "아린은 백야회의 목적을 알고 봉인된 왕관을 훔쳤다.",
      retrievedEvidence: [
        {
          chunkId: "chunk-3-a",
          chapterId: "chapter-3",
          offset: 130,
          quote: "아린은 백야회의 추적을 피해 골목으로 숨어들었다.",
        },
      ],
      groundingStatus: "confirmed",
      topK: 3,
    });

    expect(result.p0Failures).toContain(
      "expected_answer_not_supported_by_gold_evidence",
    );
    expect(result.p0Failures).toContain("answer_contains_unsupported_claim");
  });

  it("flags deleted or draft facts used as confirmed memory", () => {
    const result = scoreMemoryEvalCase({
      evalCase: baseCase,
      retrievedEvidence: [
        {
          chunkId: "chunk-3-a",
          chapterId: "chapter-3",
          offset: 130,
          quote: "아린은 백야회의 추적을 피해 골목으로 숨어들었다.",
        },
      ],
      groundingStatus: "confirmed",
      observedFacts: [
        {
          id: "fact-draft",
          status: "draft",
          usedAs: "confirmed",
        },
        {
          id: "fact-deleted",
          status: "deleted",
          usedAs: "confirmed",
        },
      ],
      topK: 3,
    });

    expect(result.p0Failures).toContain("deleted_or_draft_fact_confirmed");
  });

  it("flags future facts used for past-time answers", () => {
    const result = scoreMemoryEvalCase({
      evalCase: baseCase,
      retrievedEvidence: [
        {
          chunkId: "chunk-3-a",
          chapterId: "chapter-3",
          offset: 130,
          quote: "아린은 백야회의 추적을 피해 골목으로 숨어들었다.",
        },
      ],
      groundingStatus: "confirmed",
      queryChapterOrder: 3,
      observedFacts: [
        {
          id: "fact-future",
          status: "confirmed",
          observedAtChapterOrder: 9,
          usedAs: "confirmed",
        },
      ],
      topK: 3,
    });

    expect(result.p0Failures).toContain("future_fact_used_in_past_answer");
  });

  it("flags reversed relation direction", () => {
    const result = scoreMemoryEvalCase({
      evalCase: {
        ...baseCase,
        expectedRelations: [
          {
            sourceName: "아린",
            targetName: "백야회",
            relation: "hostile_to",
          },
        ],
      },
      retrievedEvidence: [
        {
          chunkId: "chunk-3-a",
          chapterId: "chapter-3",
          offset: 130,
          quote: "아린은 백야회의 추적을 피해 골목으로 숨어들었다.",
        },
      ],
      groundingStatus: "confirmed",
      observedRelations: [
        {
          sourceName: "백야회",
          targetName: "아린",
          relation: "hostile_to",
        },
      ],
      topK: 3,
    });

    expect(result.p0Failures).toContain("relation_direction_reversed");
  });

  it("flags entity alias mismatches", () => {
    const result = scoreMemoryEvalCase({
      evalCase: {
        ...baseCase,
        expectedEntities: [
          {
            canonicalName: "아린",
            aliases: ["흰 까마귀"],
          },
        ],
      },
      retrievedEvidence: [
        {
          chunkId: "chunk-3-a",
          chapterId: "chapter-3",
          offset: 130,
          quote: "흰 까마귀는 백야회의 추적을 피해 골목으로 숨어들었다.",
        },
      ],
      groundingStatus: "confirmed",
      observedEntities: [
        {
          canonicalName: "레온",
          name: "흰 까마귀",
        },
      ],
      topK: 3,
    });

    expect(result.p0Failures).toContain("entity_alias_mismatch");
  });

  it("does not flag entity aliases when the canonical entity matches", () => {
    const result = scoreMemoryEvalCase({
      evalCase: {
        ...baseCase,
        expectedEntities: [
          {
            canonicalName: "아린",
            aliases: ["흰 까마귀"],
          },
        ],
      },
      retrievedEvidence: [
        {
          chunkId: "chunk-3-a",
          chapterId: "chapter-3",
          offset: 130,
          quote: "흰 까마귀는 백야회의 추적을 피해 골목으로 숨어들었다.",
        },
      ],
      groundingStatus: "confirmed",
      observedEntities: [
        {
          canonicalName: "아린",
          name: "흰 까마귀",
        },
      ],
      topK: 3,
    });

    expect(result.p0Failures).not.toContain("entity_alias_mismatch");
  });

  it("flags unresolved threads that are falsely marked resolved", () => {
    const result = scoreMemoryEvalCase({
      evalCase: {
        ...baseCase,
        expectedThreads: [
          {
            name: "봉인된 편지의 발신자",
            status: "unresolved",
          },
        ],
      },
      retrievedEvidence: [
        {
          chunkId: "chunk-3-a",
          chapterId: "chapter-3",
          offset: 130,
          quote: "아린은 발신자가 적혀 있지 않은 봉인된 편지를 품에 숨겼다.",
        },
      ],
      groundingStatus: "confirmed",
      observedThreads: [
        {
          name: "봉인된 편지의 발신자",
          status: "resolved",
        },
      ],
      topK: 3,
    });

    expect(result.p0Failures).toContain(
      "unresolved_thread_falsely_marked_resolved",
    );
  });

  it("does not flag unresolved threads when the answer keeps them unresolved", () => {
    const result = scoreMemoryEvalCase({
      evalCase: {
        ...baseCase,
        expectedThreads: [
          {
            name: "봉인된 편지의 발신자",
            status: "unresolved",
          },
        ],
      },
      retrievedEvidence: [
        {
          chunkId: "chunk-3-a",
          chapterId: "chapter-3",
          offset: 130,
          quote: "아린은 발신자가 적혀 있지 않은 봉인된 편지를 품에 숨겼다.",
        },
      ],
      groundingStatus: "confirmed",
      observedThreads: [
        {
          name: "봉인된 편지의 발신자",
          status: "unresolved",
        },
      ],
      topK: 3,
    });

    expect(result.p0Failures).not.toContain(
      "unresolved_thread_falsely_marked_resolved",
    );
  });

  it("does not flag deterministic guard failures for supported consistent observations", () => {
    const result = scoreMemoryEvalCase({
      evalCase: {
        ...baseCase,
        expectedAnswer: "아린은 백야회의 추적을 피했다.",
        expectedEntities: [
          {
            canonicalName: "아린",
            aliases: ["흰 까마귀"],
          },
        ],
        expectedRelations: [
          {
            sourceName: "아린",
            targetName: "백야회",
            relation: "hostile_to",
          },
        ],
        expectedThreads: [
          {
            name: "봉인된 편지의 발신자",
            status: "unresolved",
          },
        ],
      },
      answer: "아린은 백야회의 추적을 피했다.",
      retrievedEvidence: [
        {
          chunkId: "chunk-3-a",
          chapterId: "chapter-3",
          offset: 130,
          quote: "아린은 백야회의 추적을 피했다.",
        },
      ],
      groundingStatus: "confirmed",
      queryChapterOrder: 3,
      observedFacts: [
        {
          id: "fact-current",
          status: "confirmed",
          observedAtChapterOrder: 2,
          usedAs: "confirmed",
        },
      ],
      observedEntities: [
        {
          canonicalName: "아린",
          name: "흰 까마귀",
        },
      ],
      observedRelations: [
        {
          sourceName: "아린",
          targetName: "백야회",
          relation: "hostile_to",
        },
      ],
      observedThreads: [
        {
          name: "봉인된 편지의 발신자",
          status: "unresolved",
        },
      ],
      topK: 3,
    });

    expect(result.p0Failures).toEqual([]);
  });

  it("runs a fixed suite and reports aggregate recall and P0 failures", () => {
    const result = runMemoryEvalSuite({
      topK: 3,
      cases: [
        {
          evalCase: baseCase,
          retrievedEvidence: [
            {
              chunkId: "chunk-3-a",
              chapterId: "chapter-3",
              offset: 130,
              quote: "아린은 백야회의 추적을 피해 골목으로 숨어들었다.",
            },
          ],
          groundingStatus: "inferred",
        },
        {
          evalCase: { ...baseCase, id: "case-2" },
          retrievedEvidence: [],
          groundingStatus: "confirmed",
        },
      ],
    });

    expect(result.caseCount).toBe(2);
    expect(result.averageContextRecallAtK).toBe(0.5);
    expect(result.totalP0FailureCount).toBe(1);
    expect(result.p0FailureTypeCounts).toEqual({
      unsupported_confirmed_answer: 1,
    });
    expect(result.results.map((item) => item.caseId)).toEqual([
      "case-1",
      "case-2",
    ]);
  });
});
