import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  chapter,
  chapterBody,
} from "../../../src/main/database/schema/index.js";
import { upsertChapter } from "../../../src/main/services/features/sync/syncLocalApply.js";

describe("syncLocalApply.upsertChapter", () => {
  it("runs existing update, new insert, and ChapterBody upserts", () => {
    const chapterValues: Array<Record<string, unknown>> = [];
    const chapterInsertValues: Array<Record<string, unknown>> = [];
    const bodyValues: Array<Record<string, unknown>> = [];
    const bodyConflictValues: Array<Record<string, unknown>> = [];
    const get = vi
      .fn()
      .mockReturnValueOnce({ id: "chapter-1" })
      .mockReturnValueOnce(undefined);
    const chapterUpdateRun = vi.fn();
    const chapterInsertRun = vi.fn();
    const otherRun = vi.fn();
    const bodyConflictRun = vi.fn();
    const tx = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => ({ get })),
          })),
        })),
      })),
      update: vi.fn((table: unknown) => ({
        set: vi.fn((values: Record<string, unknown>) => {
          if (table === chapter) chapterValues.push(values);
          return {
            where: vi.fn(() => ({
              run: table === chapter ? chapterUpdateRun : otherRun,
            })),
          };
        }),
      })),
      insert: vi.fn((table: unknown) => ({
        values: vi.fn((values: Record<string, unknown>) => {
          if (table === chapter) chapterInsertValues.push(values);
          if (table === chapterBody) bodyValues.push(values);
          return {
            run: table === chapter ? chapterInsertRun : otherRun,
            onConflictDoUpdate: vi.fn(
              (config: { set: Record<string, unknown>; target: unknown[] }) => {
                if (table === chapterBody) {
                  expect(config.target).toEqual([chapterBody.chapterId]);
                  bodyConflictValues.push(config.set);
                  return { run: bodyConflictRun };
                }
                return { run: otherRun };
              },
            ),
          };
        }),
      })),
    } as never;

    upsertChapter(tx, {
      id: "chapter-1",
      userId: "user-1",
      projectId: "project-1",
      title: "Chapter 1",
      content: "remote-body",
      synopsis: null,
      order: 0,
      wordCount: 11,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
      deletedAt: null,
    });
    upsertChapter(tx, {
      id: "chapter-2",
      userId: "user-1",
      projectId: "project-1",
      title: "Chapter 2",
      content: "new-body",
      synopsis: null,
      order: 1,
      wordCount: 8,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-03T00:00:00.000Z",
      deletedAt: null,
    });

    expect(chapterValues[0]?.content).toBe("remote-body");
    expect(chapterUpdateRun).toHaveBeenCalledTimes(1);
    expect(chapterInsertValues[0]).toMatchObject({
      id: "chapter-2",
      content: "new-body",
    });
    expect(chapterInsertRun).toHaveBeenCalledTimes(1);
    expect(bodyValues[0]).toMatchObject({
      chapterId: "chapter-1",
      content: "remote-body",
      contentHash: createHash("sha256").update("remote-body").digest("hex"),
      updatedAt: "2026-03-02T00:00:00.000Z",
    });
    expect(bodyConflictValues[0]).toMatchObject({
      content: "remote-body",
      contentHash: createHash("sha256").update("remote-body").digest("hex"),
      updatedAt: "2026-03-02T00:00:00.000Z",
    });
    expect(bodyValues[1]).toMatchObject({
      chapterId: "chapter-2",
      content: "new-body",
    });
    expect(bodyConflictValues[1]).toMatchObject({ content: "new-body" });
    expect(bodyConflictRun).toHaveBeenCalledTimes(2);
  });
});
