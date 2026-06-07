import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  db,
  memoryEpisode,
  memoryEpisodeEvidence,
  project,
} from "../../../../../src/main/infra/database/index.js";
import { createMemoryEpisodeCandidate } from "../../../../../src/main/services/features/memory/episode/memoryEpisodeCandidate.js";

describe("createMemoryEpisodeCandidate", () => {
  it("stores episode candidates and evidence in one boundary", async () => {
    const projectId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";
    await db.getClient().insert(project).values({
      id: projectId,
      title: "Episode Boundary",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });

    const rows = await createMemoryEpisodeCandidate({
      nowIso,
      projectId,
      sourceType: "chapter",
      sourceId: "chapter-1",
      chapterId: null,
      sceneId: null,
      sourceContentHash: "source-hash",
      extractorVersion: "episode-v1",
      episodeType: "character_learns_secret",
      title: "아린이 비밀을 알게 됨",
      summary: "아린은 백야회의 추적 이유를 알게 된다.",
      evidence: [
        {
          chapterId: null,
          chunkId: "chunk-1",
          contentHash: "chunk-hash",
          sourceContentHash: "source-hash",
          quote: "아린은 봉인된 편지를 읽고 백야회의 목적을 깨달았다.",
          startOffset: 120,
          endOffset: 151,
        },
      ],
    });

    const episodeRows = await db
      .getClient()
      .select()
      .from(memoryEpisode)
      .where(eq(memoryEpisode.id, rows.episode.id));
    const evidenceRows = await db
      .getClient()
      .select()
      .from(memoryEpisodeEvidence)
      .where(eq(memoryEpisodeEvidence.episodeId, rows.episode.id));

    expect(episodeRows).toHaveLength(1);
    expect(evidenceRows).toHaveLength(1);
    expect(evidenceRows[0].contentHash).toBe("chunk-hash");
  });

  it("does not store an episode when evidence is missing", async () => {
    const projectId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";
    await db.getClient().insert(project).values({
      id: projectId,
      title: "Episode Rejection",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });

    await expect(
      createMemoryEpisodeCandidate({
        nowIso,
        projectId,
        sourceType: "chapter",
        sourceId: "chapter-1",
        chapterId: null,
        sceneId: null,
        sourceContentHash: "source-hash",
        extractorVersion: "episode-v1",
        episodeType: "character_learns_secret",
        title: "아린이 비밀을 알게 됨",
        summary: "아린은 백야회의 추적 이유를 알게 된다.",
        evidence: [],
      }),
    ).rejects.toThrow("MEMORY_EPISODE_REQUIRES_EVIDENCE");

    const episodeRows = await db
      .getClient()
      .select()
      .from(memoryEpisode)
      .where(eq(memoryEpisode.projectId, projectId));
    expect(episodeRows).toHaveLength(0);
  });
});
