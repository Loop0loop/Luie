import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  db,
  memoryChunk,
  project,
} from "../../../../src/main/infra/database/index.js";
import { searchMemoryChunksForRag } from "../../../../src/main/services/features/rag/internal/contextAssembler.search.js";

describe("searchMemoryChunksForRag", () => {
  it("boosts chunks that contain the exact quote candidate from the query", async () => {
    const projectId = crypto.randomUUID();
    const nowIso = "2026-06-08T00:00:00.000Z";
    const exactChunkId = crypto.randomUUID();
    const distractorChunkId = crypto.randomUUID();

    await db.getClient().insert(project).values({
      id: projectId,
      title: "RAG Search",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db
      .getClient()
      .insert(memoryChunk)
      .values([
        {
          id: distractorChunkId,
          projectId,
          sourceType: "chapter",
          sourceId: "chapter-1",
          chapterId: null,
          sceneId: null,
          chunkIndex: 0,
          content: "아내의 방과 돋보기 장난에 대한 다른 대목이다.",
          contentHash: "distractor-content-hash",
          indexText: "아내 방 돋보기 장난 다른 대목",
          indexTextHash: "distractor-index-hash",
          contextLabel: "chapter: distractor",
          sourceContentHash: "source-hash",
          startOffset: 0,
          endOffset: 30,
          paragraphStartIndex: 0,
          paragraphEndIndex: 0,
          tokenCount: 30,
          updatedAt: nowIso,
        },
        {
          id: exactChunkId,
          projectId,
          sourceType: "chapter",
          sourceId: "chapter-1",
          chapterId: null,
          sceneId: null,
          chunkIndex: 1,
          content:
            "앞부분. 나는 아내의 이름을 속으로만 한 번 불러 보았다. 뒷부분.",
          contentHash: "exact-content-hash",
          indexText:
            "앞부분 나는 아내의 이름을 속으로만 한 번 불러 보았다 뒷부분",
          indexTextHash: "exact-index-hash",
          contextLabel: "chapter: exact",
          sourceContentHash: "source-hash",
          startOffset: 100,
          endOffset: 170,
          paragraphStartIndex: 1,
          paragraphEndIndex: 1,
          tokenCount: 70,
          updatedAt: nowIso,
        },
      ]);

    const results = await searchMemoryChunksForRag({
      projectId,
      query:
        "아내의 비밀의 원문 근거를 찾아라: 나는 아내의 이름을 속으로만 한 번 불러 보았다.",
      limit: 5,
    });

    expect(results[0]?.chunkId).toBe(exactChunkId);
  });
});
