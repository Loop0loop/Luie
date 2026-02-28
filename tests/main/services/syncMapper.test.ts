import { describe, expect, it } from "vitest";
import {
  createEmptySyncBundle,
  mergeSyncBundles,
} from "../../../src/main/services/features/syncMapper.js";

describe("syncMapper project tombstones", () => {
  it("drops project-scoped entities when a project tombstone exists", () => {
    const local = createEmptySyncBundle();
    local.projects.push({
      id: "project-1",
      userId: "user-1",
      title: "Project",
      description: null,
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:00:00.000Z",
    });
    local.chapters.push({
      id: "chapter-1",
      userId: "user-1",
      projectId: "project-1",
      title: "Chapter",
      content: "text",
      order: 0,
      wordCount: 4,
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:00:00.000Z",
    });
    local.characters.push({
      id: "character-1",
      userId: "user-1",
      projectId: "project-1",
      name: "Character",
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:00:00.000Z",
    });
    local.terms.push({
      id: "term-1",
      userId: "user-1",
      projectId: "project-1",
      term: "Term",
      order: 0,
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:00:00.000Z",
    });
    local.worldDocuments.push({
      id: "project-1:synopsis",
      userId: "user-1",
      projectId: "project-1",
      docType: "synopsis",
      payload: { synopsis: "s" },
      updatedAt: "2026-02-22T00:00:00.000Z",
    });
    local.memos.push({
      id: "memo-1",
      userId: "user-1",
      projectId: "project-1",
      title: "Memo",
      content: "memo",
      tags: [],
      updatedAt: "2026-02-22T00:00:00.000Z",
    });

    const remote = createEmptySyncBundle();
    remote.tombstones.push({
      id: "project-1:project:project-1",
      userId: "user-1",
      projectId: "project-1",
      entityType: "project",
      entityId: "project-1",
      deletedAt: "2026-02-22T00:05:00.000Z",
      updatedAt: "2026-02-22T00:05:00.000Z",
    });

    const { merged } = mergeSyncBundles(local, remote);
    expect(merged.projects).toEqual([]);
    expect(merged.chapters).toEqual([]);
    expect(merged.characters).toEqual([]);
    expect(merged.terms).toEqual([]);
    expect(merged.worldDocuments).toEqual([]);
    expect(merged.memos).toEqual([]);
  });

  it("does not create conflict copy when chapter is deleted", () => {
    const local = createEmptySyncBundle();
    local.chapters.push({
      id: "chapter-1",
      userId: "user-1",
      projectId: "project-1",
      title: "Chapter",
      content: "local text",
      order: 0,
      wordCount: 10,
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:00:00.000Z",
      deletedAt: "2026-02-22T00:10:00.000Z",
    });

    const remote = createEmptySyncBundle();
    remote.chapters.push({
      id: "chapter-1",
      userId: "user-1",
      projectId: "project-1",
      title: "Chapter",
      content: "remote text",
      order: 0,
      wordCount: 11,
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:12:00.000Z",
    });

    const { merged, conflicts } = mergeSyncBundles(local, remote);
    expect(conflicts.chapters).toBe(0);
    expect(merged.chapters.filter((chapter) => chapter.title.includes("(Conflict Copy)"))).toHaveLength(0);
    expect(merged.chapters).toHaveLength(1);
  });

  it("does not create conflict copy without entity baseline", () => {
    const local = createEmptySyncBundle();
    local.chapters.push({
      id: "chapter-1",
      userId: "user-1",
      projectId: "project-1",
      title: "Chapter",
      content: "local text",
      order: 0,
      wordCount: 10,
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:15:00.000Z",
    });

    const remote = createEmptySyncBundle();
    remote.chapters.push({
      id: "chapter-1",
      userId: "user-1",
      projectId: "project-1",
      title: "Chapter",
      content: "remote text",
      order: 0,
      wordCount: 11,
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:16:00.000Z",
    });

    const { merged, conflicts } = mergeSyncBundles(local, remote);
    expect(conflicts.chapters).toBe(0);
    expect(merged.chapters.filter((chapter) => chapter.title.includes("(Conflict Copy)"))).toHaveLength(0);
    expect(merged.chapters).toHaveLength(1);
  });

  it("creates conflict copy only when both sides changed after baseline", () => {
    const local = createEmptySyncBundle();
    local.chapters.push({
      id: "chapter-1",
      userId: "user-1",
      projectId: "project-1",
      title: "Chapter",
      content: "local text",
      order: 0,
      wordCount: 10,
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:15:00.000Z",
    });

    const remote = createEmptySyncBundle();
    remote.chapters.push({
      id: "chapter-1",
      userId: "user-1",
      projectId: "project-1",
      title: "Chapter",
      content: "remote text",
      order: 0,
      wordCount: 11,
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:16:00.000Z",
    });

    const { merged, conflicts } = mergeSyncBundles(local, remote, {
      baselinesByProjectId: {
        "project-1": {
          chapter: {
            "chapter-1": "2026-02-22T00:10:00.000Z",
          },
          memo: {},
          capturedAt: "2026-02-22T00:10:00.000Z",
        },
      },
    });
    expect(conflicts.chapters).toBe(1);
    expect(merged.chapters.filter((chapter) => chapter.title.includes("(Conflict Copy)"))).toHaveLength(1);
    expect(merged.chapters).toHaveLength(2);
    expect(conflicts.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "chapter",
          id: "chapter-1",
          projectId: "project-1",
        }),
      ]),
    );
  });

  it("applies explicit conflict resolution and skips conflict copy creation", () => {
    const local = createEmptySyncBundle();
    local.chapters.push({
      id: "chapter-1",
      userId: "user-1",
      projectId: "project-1",
      title: "Chapter Local",
      content: "local text",
      order: 0,
      wordCount: 10,
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:15:00.000Z",
    });

    const remote = createEmptySyncBundle();
    remote.chapters.push({
      id: "chapter-1",
      userId: "user-1",
      projectId: "project-1",
      title: "Chapter Remote",
      content: "remote text",
      order: 0,
      wordCount: 11,
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:16:00.000Z",
    });

    const { merged, conflicts } = mergeSyncBundles(local, remote, {
      baselinesByProjectId: {
        "project-1": {
          chapter: {
            "chapter-1": "2026-02-22T00:10:00.000Z",
          },
          memo: {},
          capturedAt: "2026-02-22T00:10:00.000Z",
        },
      },
      conflictResolutions: {
        "chapter:chapter-1": "local",
      },
    });

    expect(conflicts.chapters).toBe(0);
    expect(conflicts.total).toBe(0);
    expect(conflicts.items).toBeUndefined();
    expect(merged.chapters.filter((chapter) => chapter.title.includes("(Conflict Copy)"))).toHaveLength(0);
    expect(merged.chapters).toHaveLength(1);
    expect(merged.chapters[0]?.content).toBe("local text");
  });
});
