// TEST_LEVEL: REAL_DB_INTEGRATION
// PROVES: package hydration이 canonical row와 일치하는 exported revision을 atomic commit한다.

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../../../src/main/database/index.js";
import * as schema from "../../../src/main/database/schema/index.js";
import { applyProjectImportTransaction } from "../../../src/main/services/core/project/projectImportTransaction.js";

const baseInput = () => ({
  resolvedProjectId: "project-import-transaction",
  legacyProjectId: null,
  existing: null,
  meta: {
    title: "Imported Project",
    updatedAt: "2026-03-12T03:00:00.000Z",
  },
  resolvedPath: "/tmp/project-import-transaction.luie",
  chaptersForCreate: [],
  charactersForCreate: [],
  termsForCreate: [],
  factionsForCreate: [],
  eventsForCreate: [],
  worldEntitiesForCreate: [],
  relationsForCreate: [],
  snapshotsForCreate: [],
});

describe("projectImportTransaction", () => {
  it("hydrates Chapter and ChapterBody before storing the final exported revision", async () => {
    const input = baseInput();
    const result = await applyProjectImportTransaction({
      ...input,
      chaptersForCreate: [
        {
          id: "chapter-import-transaction",
          projectId: input.resolvedProjectId,
          title: "Chapter 1",
          content: "package-body",
          synopsis: null,
          order: 0,
          wordCount: 12,
        },
      ],
    });

    const [savedProject] = await db
      .getClient()
      .select({
        revision: schema.project.revision,
        exportedRevision: schema.projectAttachment.exportedRevision,
      })
      .from(schema.project)
      .innerJoin(
        schema.projectAttachment,
        eq(schema.projectAttachment.projectId, schema.project.id),
      )
      .where(eq(schema.project.id, input.resolvedProjectId));
    const [savedChapter] = await db
      .getClient()
      .select()
      .from(schema.chapter)
      .where(eq(schema.chapter.id, "chapter-import-transaction"));
    const [savedChapterBody] = await db
      .getClient()
      .select()
      .from(schema.chapterBody)
      .where(eq(schema.chapterBody.chapterId, "chapter-import-transaction"));

    expect(result.id).toBe(input.resolvedProjectId);
    expect(result.projectPath).toBe(input.resolvedPath);
    expect(savedProject.revision).toBeGreaterThan(1);
    expect(savedProject.exportedRevision).toBe(savedProject.revision);
    expect(savedChapter.content).toBe("package-body");
    expect(savedChapterBody).toMatchObject({
      content: "package-body",
      contentHash: createHash("sha256").update("package-body").digest("hex"),
    });
  });

  it("persists imported replica and canonical memory rows", async () => {
    const input = baseInput();
    await applyProjectImportTransaction({
      ...input,
      resolvedProjectId: "project-import-memory",
      resolvedPath: "/tmp/project-import-memory.luie",
      worldSynopsis: {
        synopsis: "Imported synopsis",
        status: "working",
        updatedAt: "2026-03-12T05:00:00.000Z",
      },
      worldScrapMemos: {
        memos: [
          {
            id: "memo-import",
            title: "Memo",
            content: "Body",
            tags: ["tag"],
            updatedAt: "2026-03-12T04:00:00.000Z",
          },
        ],
      },
      memoryCanonical: {
        schemaVersion: 1,
        exportedAt: "2026-03-12T03:00:00.000Z",
        tables: {
          MemoryEntity: [
            {
              id: "memory-entity-import",
              projectId: "source-project",
              entityType: "character",
              canonicalName: "Alice",
              status: "confirmed",
              updatedAt: "2026-03-12T03:00:00.000Z",
            },
          ],
        },
      },
    });

    const [savedProject] = await db
      .getClient()
      .select()
      .from(schema.project)
      .where(eq(schema.project.id, "project-import-memory"));
    const [savedMemo] = await db
      .getClient()
      .select()
      .from(schema.scrapMemo)
      .where(eq(schema.scrapMemo.id, "memo-import"));
    const [savedMemory] = await db
      .getClient()
      .select()
      .from(schema.memoryEntity)
      .where(eq(schema.memoryEntity.projectId, "project-import-memory"));

    expect(savedProject.updatedAt).toBe("2026-03-12T05:00:00.000Z");
    expect(savedMemo.content).toBe("Body");
    expect(savedMemory).toMatchObject({
      id: "project-import-memory:MemoryEntity:memory-entity-import",
      projectId: "project-import-memory",
      canonicalName: "Alice",
    });
  });
});
