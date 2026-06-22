import { describe, expect, it, vi } from "vitest";
import type { MemoryEpisodeExtractionChunk } from "../../../../../src/main/services/features/memory/episode/memoryEpisodeExtractionProcessor.js";

const generateTextMock = vi.hoisted(() => vi.fn());

vi.mock(
  "../../../../../src/main/services/features/utility/utilityProcessBridge.js",
  () => ({
    utilityProcessBridge: {
      generateText: generateTextMock,
    },
  }),
);

describe("createLlmEpisodeExtractor", () => {
  const chunks: MemoryEpisodeExtractionChunk[] = [
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
  ];

  it("generates episode candidates from grounded JSON returned by the LLM", async () => {
    generateTextMock.mockReset();
    generateTextMock.mockResolvedValue({
      providerName: "test-provider",
      text: JSON.stringify({
        episodes: [
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
        ],
      }),
    });

    const { createLlmEpisodeExtractor } =
      await import("../../../../../src/main/services/features/memory/episode/memoryEpisodeLlmExtractor.js");
    const extractor = createLlmEpisodeExtractor();
    const result = await extractor({
      projectId: "project-1",
      sourceType: "chapter",
      sourceId: "chapter-1",
      sourceContentHash: "source-hash-1",
      extractorVersion: "episode-v1",
      chunks,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
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
    });
    expect(generateTextMock).toHaveBeenCalledWith(
      "project-1",
      expect.stringContaining("chunk-1"),
      { maxTokens: 1200, temperature: 0.1 },
    );
  });

  it("rejects hallucinated evidence chunks", async () => {
    generateTextMock.mockReset();
    generateTextMock.mockResolvedValue({
      providerName: "test-provider",
      text: JSON.stringify({
        episodes: [
          {
            episodeType: "major_event",
            title: "없는 사건",
            summary: "없는 청크에 근거한 사건",
            evidence: [
              {
                chunkId: "missing-chunk",
                quote: "없는 근거",
                startOffset: null,
                endOffset: null,
              },
            ],
          },
        ],
      }),
    });

    const { createLlmEpisodeExtractor } =
      await import("../../../../../src/main/services/features/memory/episode/memoryEpisodeLlmExtractor.js");
    const extractor = createLlmEpisodeExtractor();

    await expect(
      extractor({
        projectId: "project-1",
        sourceType: "chapter",
        sourceId: "chapter-1",
        sourceContentHash: "source-hash-1",
        extractorVersion: "episode-v1",
        chunks,
      }),
    ).rejects.toThrow("MEMORY_EPISODE_LLM_UNKNOWN_EVIDENCE_CHUNK");
  });
});
