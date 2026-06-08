import { describe, expect, it, vi } from "vitest";
import type {
  MemoryTemporalFactExtractionEntity,
  MemoryTemporalFactExtractionEvidence,
} from "../../../../../src/main/services/features/memory/temporal/memoryTemporalFactExtractionRunner.js";

const generateTextMock = vi.hoisted(() => vi.fn());

vi.mock(
  "../../../../../src/main/services/features/utility/utilityProcessBridge.js",
  () => ({
    utilityProcessBridge: {
      generateText: generateTextMock,
    },
  }),
);

describe("createLlmTemporalFactExtractor", () => {
  const evidence: MemoryTemporalFactExtractionEvidence[] = [
    {
      evidenceId: "evidence-1",
      episodeId: "episode-1",
      episodeType: "relation_changes",
      episodeTitle: "아린이 백야회에 들어감",
      episodeSummary: "아린은 백야회에 들어간다.",
      chapterId: "chapter-10",
      chapterOrder: 10,
      chunkId: "chunk-1",
      quote: "아린은 백야회에 들어간다.",
      startOffset: 0,
      endOffset: 14,
      contentHash: "chunk-hash",
      sourceContentHash: "source-hash",
    },
  ];
  const entities: MemoryTemporalFactExtractionEntity[] = [
    {
      id: "entity-arin",
      entityType: "character",
      canonicalName: "아린",
      status: "confirmed",
    },
    {
      id: "entity-baekya",
      entityType: "faction",
      canonicalName: "백야회",
      status: "confirmed",
    },
  ];

  it("generates temporal fact candidates from grounded JSON returned by the LLM", async () => {
    generateTextMock.mockReset();
    generateTextMock.mockResolvedValue({
      providerName: "test-provider",
      text: JSON.stringify({
        facts: [
          {
            subjectEntityId: "entity-arin",
            predicate: "belongs_to",
            objectEntityId: "entity-baekya",
            objectValue: null,
            valueType: "entity",
            validFromChapterId: "chapter-10",
            validFromChapterOrder: 10,
            validToChapterId: null,
            validToChapterOrder: null,
            observedAtChapterId: "chapter-10",
            observedAtChapterOrder: 10,
            confidence: 88,
            sourceContentHash: "source-hash",
            evidenceIds: ["evidence-1"],
            projection: {
              kind: "relation",
              sourceEntityId: "entity-arin",
              targetEntityId: "entity-baekya",
              relation: "belongs_to",
            },
          },
        ],
      }),
    });

    const { createLlmTemporalFactExtractor } =
      await import("../../../../../src/main/services/features/memory/temporal/memoryTemporalFactLlmExtractor.js");
    const extractor = createLlmTemporalFactExtractor();
    const result = await extractor({
      projectId: "project-1",
      evidence,
      entities,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      subjectEntityId: "entity-arin",
      predicate: "belongs_to",
      objectEntityId: "entity-baekya",
      evidenceIds: ["evidence-1"],
      projection: {
        kind: "relation",
        sourceEntityId: "entity-arin",
        targetEntityId: "entity-baekya",
      },
    });
    expect(generateTextMock).toHaveBeenCalledWith(
      "project-1",
      expect.stringContaining("evidence-1"),
      { maxTokens: 1200, temperature: 0.1 },
    );
  });

  it("rejects hallucinated evidence IDs", async () => {
    generateTextMock.mockReset();
    generateTextMock.mockResolvedValue({
      providerName: "test-provider",
      text: JSON.stringify({
        facts: [
          {
            subjectEntityId: "entity-arin",
            predicate: "belongs_to",
            objectEntityId: "entity-baekya",
            objectValue: null,
            valueType: "entity",
            validFromChapterId: "chapter-10",
            validFromChapterOrder: 10,
            validToChapterId: null,
            validToChapterOrder: null,
            observedAtChapterId: "chapter-10",
            observedAtChapterOrder: 10,
            confidence: 88,
            sourceContentHash: "source-hash",
            evidenceIds: ["missing-evidence"],
            projection: {
              kind: "relation",
              sourceEntityId: "entity-arin",
              targetEntityId: "entity-baekya",
              relation: "belongs_to",
            },
          },
        ],
      }),
    });

    const { createLlmTemporalFactExtractor } =
      await import("../../../../../src/main/services/features/memory/temporal/memoryTemporalFactLlmExtractor.js");
    await expect(
      createLlmTemporalFactExtractor()({
        projectId: "project-1",
        evidence,
        entities,
      }),
    ).rejects.toThrow("MEMORY_TEMPORAL_FACT_LLM_UNKNOWN_EVIDENCE");
  });
});
