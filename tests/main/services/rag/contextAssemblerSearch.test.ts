import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  db,
  memoryChunk,
  project,
} from "../../../../src/main/infra/database/index.js";
import {
  searchMemoryChunksForRag,
  type RagSearchStageDiagnostic,
} from "../../../../src/main/services/features/rag/internal/contextAssembler.search.js";

describe("searchMemoryChunksForRag", () => {
  it("skips embedding on low-end lexical hits and keeps vector fallback when lexical search misses", async () => {
    const projectId = crypto.randomUUID();
    const chunkId = crypto.randomUUID();
    const nowIso = "2026-09-13T00:00:00.000Z";
    await db.getClient().insert(project).values({
      id: projectId,
      title: "Low-end vector policy",
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryChunk).values({
      id: chunkId,
      projectId,
      sourceType: "chapter",
      sourceId: "chapter-low-end",
      chapterId: "chapter-low-end",
      chunkIndex: 0,
      content: "하린은 붉은 등대 아래에서 오래된 열쇠를 발견했다.",
      contentHash: "low-end-content-hash",
      indexText: "하린 붉은 등대 오래된 열쇠 발견",
      indexTextHash: "low-end-index-hash",
      sourceContentHash: "low-end-source-hash",
      paragraphStartIndex: 0,
      paragraphEndIndex: 0,
      tokenCount: 20,
      updatedAt: nowIso,
    });
    const embedTexts = vi.fn(async () => [[1, 0, 0]]);
    const previousMode = process.env.LUIE_SEARCH_OPTIMIZATION_MODE;
    const previousUtility = process.env.LUIE_IS_UTILITY_PROCESS;
    const vectorEnabled = vi
      .spyOn(db, "isVectorSearchEnabled")
      .mockReturnValue(true);
    process.env.LUIE_SEARCH_OPTIMIZATION_MODE = "low-end";
    process.env.LUIE_IS_UTILITY_PROCESS = "1";

    try {
      const lexicalDiagnostics: { stages: RagSearchStageDiagnostic[] } = {
        stages: [],
      };
      const lexicalResults = await searchMemoryChunksForRag({
        projectId,
        query: "하린은 붉은 등대 아래에서 오래된 열쇠를 발견했다.",
        limit: 5,
        embedTexts,
        diagnostics: lexicalDiagnostics,
      });
      expect(lexicalResults[0]?.chunkId).toBe(chunkId);
      expect(embedTexts).not.toHaveBeenCalled();
      expect(
        lexicalDiagnostics.stages.find((stage) => stage.stage === "vector"),
      ).toMatchObject({ skipped: true, candidateCount: 0 });

      await searchMemoryChunksForRag({
        projectId,
        query: "존재하지않는검색어",
        limit: 5,
        embedTexts,
      });
      expect(embedTexts).toHaveBeenCalledTimes(1);
    } finally {
      vectorEnabled.mockRestore();
      if (previousMode === undefined) {
        delete process.env.LUIE_SEARCH_OPTIMIZATION_MODE;
      } else {
        process.env.LUIE_SEARCH_OPTIMIZATION_MODE = previousMode;
      }
      if (previousUtility === undefined) {
        delete process.env.LUIE_IS_UTILITY_PROCESS;
      } else {
        process.env.LUIE_IS_UTILITY_PROCESS = previousUtility;
      }
    }
  });

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

  it("prefers the chapter chunk where both queried characters co-occur", async () => {
    const projectId = crypto.randomUUID();
    const nowIso = "2026-07-01T00:00:00.000Z";
    const singleNameChunkId = crypto.randomUUID();
    const coOccurringChunkId = crypto.randomUUID();

    await db.getClient().insert(project).values({
      id: projectId,
      title: "RAG Co-occurrence Search",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db
      .getClient()
      .insert(memoryChunk)
      .values([
        {
          id: singleNameChunkId,
          projectId,
          sourceType: "chapter",
          sourceId: "chapter-4",
          chapterId: "chapter-4",
          sceneId: null,
          chunkIndex: 0,
          content:
            "루디우스는 혼자 시장을 지나갔다. 루디우스는 아무도 만나지 않았다. 루디우스의 검만 빛났다.",
          contentHash: "single-name-content-hash",
          indexText:
            "루디우스는 혼자 시장을 지나갔다 루디우스는 아무도 만나지 않았다 루디우스의 검만 빛났다",
          indexTextHash: "single-name-index-hash",
          contextLabel: "chapter: single",
          sourceContentHash: "source-hash",
          startOffset: 0,
          endOffset: 60,
          paragraphStartIndex: 0,
          paragraphEndIndex: 0,
          tokenCount: 60,
          updatedAt: nowIso,
        },
        {
          id: coOccurringChunkId,
          projectId,
          sourceType: "chapter",
          sourceId: "chapter-17",
          chapterId: "chapter-17",
          sceneId: null,
          chunkIndex: 1,
          content:
            "주인공은 폐허의 문 앞에서 루디우스를 처음 마주했다. 둘은 짧게 인사를 나눴다.",
          contentHash: "co-occurring-content-hash",
          indexText:
            "주인공은 폐허의 문 앞에서 루디우스를 처음 마주했다 둘은 짧게 인사를 나눴다",
          indexTextHash: "co-occurring-index-hash",
          contextLabel: "chapter: co-occurring",
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
      query: "주인공이랑 루디우스 만난 챕터가 어디였지?",
      limit: 5,
    });

    expect(results[0]?.chunkId).toBe(coOccurringChunkId);
    expect(results[0]?.chapterId).toBe("chapter-17");
  });
});
