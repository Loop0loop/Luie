import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  chapter,
  chapterBody,
  db,
  project,
  snapshot,
} from "../../../../../src/main/infra/database/index.js";
import { getProjectForExport } from "../../../../../src/main/services/core/project/exportEngine/projectRecord.js";

describe("getProjectForExport", () => {
  it("loads only the newest snapshots and resolves one canonical chapter body", async () => {
    const projectId = crypto.randomUUID();
    const canonicalChapterId = crypto.randomUUID();
    const legacyChapterId = crypto.randomUUID();
    const now = "2026-09-13T00:00:00.000Z";
    await db.getClient().insert(project).values({
      id: projectId,
      title: "Export Query",
      description: null,
      projectPath: null,
      createdAt: now,
      updatedAt: now,
    });
    await db
      .getClient()
      .insert(chapter)
      .values([
        {
          id: canonicalChapterId,
          projectId,
          title: "Canonical",
          content: "legacy stale body",
          order: 0,
          updatedAt: now,
        },
        {
          id: legacyChapterId,
          projectId,
          title: "Legacy fallback",
          content: "legacy fallback body",
          order: 1,
          updatedAt: now,
        },
      ]);
    await db.getClient().insert(chapterBody).values({
      chapterId: canonicalChapterId,
      content: "canonical chapter body",
      contentHash: "test-hash",
      updatedAt: now,
    });
    await db
      .getClient()
      .insert(snapshot)
      .values(
        Array.from({ length: 5 }, (_, index) => ({
          id: crypto.randomUUID(),
          projectId,
          chapterId: canonicalChapterId,
          content: `snapshot-${index + 1}`,
          contentLength: 10,
          type: "AUTO" as const,
          description: null,
          createdAt: `2026-09-13T00:0${index}:00.000Z`,
        })),
      );

    const exported = await getProjectForExport(projectId, 2);
    const unlimited = await getProjectForExport(projectId, 0);

    expect(
      exported?.chapters.map(({ id, content }) => ({ id, content })),
    ).toEqual([
      { id: canonicalChapterId, content: "canonical chapter body" },
      { id: legacyChapterId, content: "legacy fallback body" },
    ]);
    expect(exported?.snapshots.map((row) => row.content)).toEqual([
      "snapshot-5",
      "snapshot-4",
    ]);
    expect(unlimited?.snapshots.map((row) => row.content)).toEqual([
      "snapshot-5",
      "snapshot-4",
      "snapshot-3",
      "snapshot-2",
      "snapshot-1",
    ]);
  });
});
