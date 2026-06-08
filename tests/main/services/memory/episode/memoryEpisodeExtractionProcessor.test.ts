import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  db,
  memoryChunk,
  memoryEpisode,
  memoryEpisodeEvidence,
  memoryEpisodeExtractionJob,
  project,
} from "../../../../../src/main/infra/database/index.js";
import {
  processPendingEpisodeExtractionJobs,
  type MemoryEpisodeExtractor,
} from "../../../../../src/main/services/features/memory/episode/memoryEpisodeExtractionProcessor.js";

describe("processPendingEpisodeExtractionJobs", () => {
  it("claims pending jobs, stores extracted episode candidates, and marks jobs completed", async () => {
    const projectId = crypto.randomUUID();
    const jobId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Episode Processor",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryChunk).values({
      id: "chunk-episode-1",
      projectId,
      sourceType: "chapter",
      sourceId: "chapter-1",
      chapterId: null,
      sceneId: null,
      chunkIndex: 0,
      content: "아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
      contentHash: "chunk-hash-1",
      indexText: "7화: 아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
      indexTextHash: "index-hash-1",
      contextLabel: "7화",
      sourceContentHash: "source-hash-1",
      startOffset: 120,
      endOffset: 151,
      tokenCount: 12,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEpisodeExtractionJob).values({
      id: jobId,
      projectId,
      sourceType: "chapter",
      sourceId: "chapter-1",
      sourceContentHash: "source-hash-1",
      extractorVersion: "episode-v1",
      status: "pending",
      priority: 50,
      attempts: 0,
      updatedAt: nowIso,
    });

    const extractor: MemoryEpisodeExtractor = async ({ chunks }) => [
      {
        episodeType: "character_learns_secret",
        title: "아린이 백야회의 목적을 알게 됨",
        summary: "아린은 봉인된 편지를 통해 백야회의 목적을 알게 된다.",
        evidence: [
          {
            chunkId: chunks[0].chunkId,
            quote: chunks[0].content,
            startOffset: chunks[0].startOffset,
            endOffset: chunks[0].endOffset,
          },
        ],
      },
    ];

    const result = await processPendingEpisodeExtractionJobs({
      projectId,
      extractor,
      nowIso,
      limit: 1,
    });

    expect(result).toEqual({ queued: 1, processed: 1 });

    const [job] = await db
      .getClient()
      .select()
      .from(memoryEpisodeExtractionJob)
      .where(eq(memoryEpisodeExtractionJob.id, jobId));
    expect(job.status).toBe("completed");
    expect(job.attempts).toBe(1);

    const episodes = await db
      .getClient()
      .select()
      .from(memoryEpisode)
      .where(eq(memoryEpisode.projectId, projectId));
    expect(episodes).toHaveLength(1);
    expect(episodes[0]).toMatchObject({
      sourceType: "chapter",
      sourceId: "chapter-1",
      sourceContentHash: "source-hash-1",
      extractorVersion: "episode-v1",
      episodeType: "character_learns_secret",
      status: "suggested",
    });

    const evidence = await db
      .getClient()
      .select()
      .from(memoryEpisodeEvidence)
      .where(eq(memoryEpisodeEvidence.episodeId, episodes[0].id));
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      chunkId: "chunk-episode-1",
      contentHash: "chunk-hash-1",
      sourceContentHash: "source-hash-1",
      quote: "아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
    });
  });
});
