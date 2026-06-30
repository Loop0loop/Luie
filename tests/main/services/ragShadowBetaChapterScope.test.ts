import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  db,
  memoryChunk,
  project,
} from "../../../src/main/infra/database/index.js";
import { searchMemoryChunksForRag } from "../../../src/main/services/features/rag/internal/contextAssembler.search.js";

describe("shadow beta chapter scope search", () => {
  it("excludes future shadow-beta manuscript chunks", async () => {
    const projectId = crypto.randomUUID();
    const nowIso = "2026-06-30T00:00:00.000Z";
    const prefix = `${projectId}:shadow-beta:modern_fantasy:`;

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Shadow Beta Chapter Scope",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryChunk).values([
      {
        id: `${prefix}chapter-3:manuscript/modern_fantasy_003.txt:0`,
        projectId,
        sourceType: "shadow_beta",
        sourceId: "chapter-3",
        chapterId: null,
        sceneId: null,
        chunkIndex: 1,
        content: "서은재는 태오가 아직 앱 기능을 모른다고 판단했다.",
        contentHash: crypto.randomUUID(),
        indexText: "서은재는 태오가 아직 앱 기능을 모른다고 판단했다.",
        indexTextHash: crypto.randomUUID(),
        contextLabel: null,
        sourceContentHash: crypto.randomUUID(),
        startOffset: null,
        endOffset: null,
        paragraphStartIndex: 0,
        paragraphEndIndex: 0,
        tokenCount: 0,
        updatedAt: nowIso,
      },
      {
        id: `${prefix}chapter-12:manuscript/modern_fantasy_012.txt:0`,
        projectId,
        sourceType: "shadow_beta",
        sourceId: "chapter-12",
        chapterId: null,
        sceneId: null,
        chunkIndex: 2,
        content: "서은재는 태오가 앱 기능을 안다고 확정했다.",
        contentHash: crypto.randomUUID(),
        indexText: "서은재는 태오가 앱 기능을 안다고 확정했다.",
        indexTextHash: crypto.randomUUID(),
        contextLabel: null,
        sourceContentHash: crypto.randomUUID(),
        startOffset: null,
        endOffset: null,
        paragraphStartIndex: 0,
        paragraphEndIndex: 0,
        tokenCount: 0,
        updatedAt: nowIso,
      },
    ]);

    const rows = await searchMemoryChunksForRag({
      projectId,
      query: "서은재 태오 앱 기능 확정",
      limit: 5,
      chunkIdPrefix: prefix,
      maxShadowBetaChapter: 3,
    });

    expect(rows.map((row) => row.chunkId)).toEqual([
      `${prefix}chapter-3:manuscript/modern_fantasy_003.txt:0`,
    ]);
  });

  it("does not reintroduce future shadow-beta chunks through parent windows", async () => {
    const projectId = crypto.randomUUID();
    const nowIso = "2026-06-30T00:00:00.000Z";
    const prefix = `${projectId}:shadow-beta:modern_fantasy:`;
    const currentChunkId = `${prefix}chapter-3:manuscript/shared.txt:0`;
    const futureChunkId = `${prefix}chapter-12:manuscript/shared.txt:1`;

    await db.getClient().insert(project).values({
      id: projectId,
      title: "Shadow Beta Parent Window Scope",
      description: null,
      projectPath: null,
      updatedAt: nowIso,
    });
    await db.getClient().insert(memoryChunk).values([
      {
        id: currentChunkId,
        projectId,
        sourceType: "shadow_beta_novel",
        sourceId: "manuscript/shared.txt",
        chapterId: null,
        sceneId: null,
        chunkIndex: 1,
        content: "앵커장면 태오는 앱 기능을 모른다.",
        contentHash: crypto.randomUUID(),
        indexText: "앵커장면 태오는 앱 기능을 모른다.",
        indexTextHash: crypto.randomUUID(),
        contextLabel: null,
        sourceContentHash: crypto.randomUUID(),
        startOffset: null,
        endOffset: null,
        paragraphStartIndex: 0,
        paragraphEndIndex: 0,
        tokenCount: 0,
        updatedAt: nowIso,
      },
      {
        id: futureChunkId,
        projectId,
        sourceType: "shadow_beta_novel",
        sourceId: "manuscript/shared.txt",
        chapterId: null,
        sceneId: null,
        chunkIndex: 2,
        content: "미래장면 태오는 앱 기능을 안다고 확정한다.",
        contentHash: crypto.randomUUID(),
        indexText: "미래장면 태오는 앱 기능을 안다고 확정한다.",
        indexTextHash: crypto.randomUUID(),
        contextLabel: null,
        sourceContentHash: crypto.randomUUID(),
        startOffset: null,
        endOffset: null,
        paragraphStartIndex: 1,
        paragraphEndIndex: 1,
        tokenCount: 0,
        updatedAt: nowIso,
      },
    ]);

    const rows = await searchMemoryChunksForRag({
      projectId,
      query: "앵커장면 태오 앱 기능",
      limit: 5,
      chunkIdPrefix: prefix,
      maxShadowBetaChapter: 3,
      parentWindow: { before: 0, after: 1 },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.chunkId).toBe(currentChunkId);
    expect(rows[0]?.parentWindow?.chunkIds).toEqual([currentChunkId]);
    expect(rows[0]?.parentWindow?.content).not.toContain("미래장면");
  });
});
