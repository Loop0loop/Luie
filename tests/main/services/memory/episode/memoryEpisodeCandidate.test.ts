import { describe, expect, it } from "vitest";
import {
  buildMemoryEpisodeExtractionKey,
  createMemoryEpisodeCandidateRows,
  validateMemoryEpisodeCandidate,
} from "../../../../../src/main/services/features/memory/episode/memoryEpisodeCandidate.js";

describe("memory episode candidate helpers", () => {
  it("rejects episode candidates without evidence", () => {
    expect(() =>
      validateMemoryEpisodeCandidate({
        title: "아린이 비밀을 알게 됨",
        summary: "아린은 백야회의 추적 이유를 알게 된다.",
        evidence: [],
      }),
    ).toThrow("MEMORY_EPISODE_REQUIRES_EVIDENCE");
  });

  it("accepts candidates with at least one evidence span", () => {
    expect(() =>
      validateMemoryEpisodeCandidate({
        title: "아린이 비밀을 알게 됨",
        summary: "아린은 백야회의 추적 이유를 알게 된다.",
        evidence: [
          {
            chapterId: "chapter-7",
            chunkId: "chunk-1",
            contentHash: "chunk-hash",
            sourceContentHash: "source-hash",
            quote: "아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
            startOffset: 120,
            endOffset: 151,
          },
        ],
      }),
    ).not.toThrow();
  });

  it("builds an incremental extraction key from source hash and extractor version", () => {
    expect(
      buildMemoryEpisodeExtractionKey({
        projectId: "project-1",
        sourceType: "chapter",
        sourceId: "chapter-7",
        sourceContentHash: "hash-a",
        extractorVersion: "episode-v1",
      }),
    ).toBe("project-1:chapter:chapter-7:hash-a:episode-v1");
  });

  it("builds episode and evidence rows together", () => {
    const rows = createMemoryEpisodeCandidateRows({
      nowIso: "2026-06-08T00:00:00.000Z",
      projectId: "project-1",
      sourceType: "chapter",
      sourceId: "chapter-7",
      chapterId: "chapter-7",
      sceneId: null,
      sourceContentHash: "source-hash",
      extractorVersion: "episode-v1",
      episodeType: "character_learns_secret",
      title: "아린이 비밀을 알게 됨",
      summary: "아린은 백야회의 추적 이유를 알게 된다.",
      evidence: [
        {
          chapterId: "chapter-7",
          chunkId: "chunk-1",
          contentHash: "chunk-hash",
          sourceContentHash: "source-hash",
          quote: "아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
          startOffset: 120,
          endOffset: 151,
        },
      ],
    });

    expect(rows.episode.status).toBe("suggested");
    expect(rows.episode.provenanceKind).toBe("canon");
    expect(rows.episode.canonStatus).toBe("canon");
    expect(rows.evidence).toHaveLength(1);
    expect(rows.evidence[0].episodeId).toBe(rows.episode.id);
    expect(rows.evidence[0].provenanceKind).toBe("canon");
    expect(rows.evidence[0].canonStatus).toBe("canon");
    expect(rows.evidence[0].contentHash).toBe("chunk-hash");
  });

  it("rejects evidence with empty hash snapshots", () => {
    expect(() =>
      createMemoryEpisodeCandidateRows({
        nowIso: "2026-06-08T00:00:00.000Z",
        projectId: "project-1",
        sourceType: "chapter",
        sourceId: "chapter-7",
        chapterId: "chapter-7",
        sceneId: null,
        sourceContentHash: "source-hash",
        extractorVersion: "episode-v1",
        episodeType: "character_learns_secret",
        title: "아린이 비밀을 알게 됨",
        summary: "아린은 백야회의 추적 이유를 알게 된다.",
        evidence: [
          {
            chapterId: "chapter-7",
            chunkId: "chunk-1",
            contentHash: "",
            sourceContentHash: "source-hash",
            quote: "아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
            startOffset: 120,
            endOffset: 151,
          },
        ],
      }),
    ).toThrow("MEMORY_EPISODE_EVIDENCE_REQUIRES_HASH");
  });

  it("rejects any blank evidence quote", () => {
    expect(() =>
      createMemoryEpisodeCandidateRows({
        nowIso: "2026-06-08T00:00:00.000Z",
        projectId: "project-1",
        sourceType: "chapter",
        sourceId: "chapter-7",
        chapterId: "chapter-7",
        sceneId: null,
        sourceContentHash: "source-hash",
        extractorVersion: "episode-v1",
        episodeType: "character_learns_secret",
        title: "아린이 비밀을 알게 됨",
        summary: "아린은 백야회의 추적 이유를 알게 된다.",
        evidence: [
          {
            chapterId: "chapter-7",
            chunkId: "chunk-1",
            contentHash: "chunk-hash",
            sourceContentHash: "source-hash",
            quote: " ",
            startOffset: 120,
            endOffset: 151,
          },
        ],
      }),
    ).toThrow("MEMORY_EPISODE_REQUIRES_EVIDENCE");
  });
});
