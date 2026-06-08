import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  db,
  memoryEpisode,
  memoryEpisodeEvidence,
  project,
} from "../../../../../src/main/infra/database/index.js";
import {
  listSuggestedMemoryEpisodes,
  rejectMemoryEpisode,
} from "../../../../../src/main/services/features/memory/episode/memoryEpisodeReviewService.js";

describe("memoryEpisodeReviewService", () => {
  it("lists suggested episodes with evidence counts", async () => {
    const projectId = crypto.randomUUID();
    const episodeId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Episode Review",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEpisode).values({
      id: episodeId,
      projectId,
      sourceType: "chapter",
      sourceId: "chapter-1",
      chapterId: null,
      sceneId: null,
      sourceContentHash: "source-hash",
      extractorVersion: "episode-v1",
      episodeType: "major_event",
      title: "아린이 편지를 읽음",
      summary: "아린은 봉인된 편지를 읽고 백야회의 목적을 알게 된다.",
      status: "suggested",
      confidence: 0,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEpisodeEvidence).values({
      id: crypto.randomUUID(),
      projectId,
      episodeId,
      chapterId: null,
      chunkId: "chunk-1",
      contentHash: "chunk-hash",
      sourceContentHash: "source-hash",
      startOffset: 0,
      endOffset: 10,
      quote: "아린은 봉인된 편지를 읽었다.",
      updatedAt: nowIso,
    });

    const result = await listSuggestedMemoryEpisodes({ projectId, limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: episodeId,
      title: "아린이 편지를 읽음",
      status: "suggested",
      evidenceCount: 1,
    });
  });

  it("rejects a suggested episode with a review reason", async () => {
    const projectId = crypto.randomUUID();
    const episodeId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Episode Reject",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryEpisode).values({
      id: episodeId,
      projectId,
      sourceType: "chapter",
      sourceId: "chapter-1",
      chapterId: null,
      sceneId: null,
      sourceContentHash: "source-hash",
      extractorVersion: "episode-v1",
      episodeType: "major_event",
      title: "잘못 추출된 사건",
      summary: "근거가 부족한 사건",
      status: "suggested",
      confidence: 0,
      updatedAt: nowIso,
    });

    const result = await rejectMemoryEpisode({
      projectId,
      episodeId,
      reason: "근거가 부족함",
      nowIso,
    });

    expect(result.updated).toBe(true);
    const [row] = await db
      .getClient()
      .select()
      .from(memoryEpisode)
      .where(eq(memoryEpisode.id, episodeId));
    expect(row.status).toBe("rejected");
    expect(row.rejectedAt).toBe(nowIso);
    expect(row.rejectionReason).toBe("근거가 부족함");
  });
});
