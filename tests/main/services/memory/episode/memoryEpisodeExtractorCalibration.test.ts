import { describe, expect, it } from "vitest";
import type { MemoryEpisodeExtractor } from "../../../../../src/main/services/features/memory/episode/memoryEpisodeExtractionProcessor.js";
import { runMemoryEpisodeExtractorCalibration } from "../../../../../src/main/services/features/memory/episode/memoryEpisodeExtractorCalibration.js";

const passingExtractor: MemoryEpisodeExtractor = async () => [
  {
    episodeType: "character_learns_secret",
    title: "아린이 백야회의 목적을 알게 됨",
    summary: "아린은 봉인된 편지를 읽고 백야회의 목적을 알게 된다.",
    evidence: [
      {
        chunkId: "chunk-1",
        quote: "아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
        startOffset: 120,
        endOffset: 151,
      },
    ],
  },
];

const failingExtractor: MemoryEpisodeExtractor = async () => [];

describe("runMemoryEpisodeExtractorCalibration", () => {
  const cases = [
    {
      id: "secret-letter",
      name: "secret letter extraction",
      input: {
        projectId: "project-1",
        sourceType: "chapter",
        sourceId: "chapter-1",
        sourceContentHash: "source-hash-1",
        extractorVersion: "episode-v1",
        chunks: [
          {
            chunkId: "chunk-1",
            chapterId: "chapter-1",
            sceneId: null,
            content: "아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
            contentHash: "chunk-hash-1",
            sourceContentHash: "source-hash-1",
            startOffset: 120,
            endOffset: 151,
          },
        ],
      },
      expected: {
        episodeType: "character_learns_secret",
        titleIncludes: "백야회",
        evidenceChunkIds: ["chunk-1"],
      },
    },
  ];

  it("passes when expected episode and evidence are extracted", async () => {
    const result = await runMemoryEpisodeExtractorCalibration({
      extractor: passingExtractor,
      cases,
    });

    expect(result.caseCount).toBe(1);
    expect(result.passCount).toBe(1);
    expect(result.failures).toEqual([]);
  });

  it("reports missing expected episode candidates", async () => {
    const result = await runMemoryEpisodeExtractorCalibration({
      extractor: failingExtractor,
      cases,
    });

    expect(result.passCount).toBe(0);
    expect(result.failures).toEqual([
      {
        caseId: "secret-letter",
        reason: "EXPECTED_EPISODE_NOT_FOUND",
        detail: "none",
      },
    ]);
  });
});
