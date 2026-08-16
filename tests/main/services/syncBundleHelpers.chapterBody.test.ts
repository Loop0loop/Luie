import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const queryCounts = new Map<string, number>();
  const rowsByTable = new Map<string, Array<Record<string, unknown>>>();

  const getTableName = (table: unknown): string => {
    if (typeof table === "string") return table;
    const tableRecord = table as Record<string | symbol, unknown>;
    const nameSymbol = Object.getOwnPropertySymbols(tableRecord).find(
      (symbol) => String(symbol) === "Symbol(drizzle:Name)",
    );
    return nameSymbol ? String(tableRecord[nameSymbol]) : "";
  };

  const terminal = (rows: Array<Record<string, unknown>>) => {
    const result = Promise.resolve(rows);
    return Object.assign(result, {
      where: vi.fn(() => terminal(rows)),
      orderBy: vi.fn(() => result),
    });
  };

  const store = {
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => {
        const tableName = getTableName(table);
        queryCounts.set(tableName, (queryCounts.get(tableName) ?? 0) + 1);
        return terminal(rowsByTable.get(tableName) ?? []);
      }),
    })),
  };

  return { queryCounts, rowsByTable, store };
});

vi.mock("../../../src/main/infra/database/index.js", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  db: { getClient: () => mocked.store },
}));

vi.mock(
  "../../../src/main/services/core/project/projectAttachmentStore.js",
  () => ({
    hydrateProjectsWithAttachmentPaths: vi.fn(async (projects) => projects),
  }),
);

vi.mock(
  "../../../src/main/services/features/memory/persistence/memoryCanonicalPackage.js",
  () => ({
    buildMemoryCanonicalPackagePayload: vi.fn(async () => ({
      schemaVersion: 1,
      exportedAt: "2026-03-12T03:00:00.000Z",
      tables: {},
    })),
  }),
);

import { buildLocalBundleFromDatabase } from "../../../src/main/services/features/sync/syncBundleHelpers.js";

describe("buildLocalBundleFromDatabase ChapterBody", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.queryCounts.clear();
    mocked.rowsByTable.clear();
  });

  it("overlays all bodies in one query and falls back to legacy content", async () => {
    mocked.rowsByTable.set("Project", [
      {
        id: "project-1",
        title: "Novel",
        description: null,
        projectPath: null,
        createdAt: "2026-03-12T00:00:00.000Z",
        updatedAt: "2026-03-12T03:00:00.000Z",
      },
    ]);
    mocked.rowsByTable.set("Chapter", [
      {
        id: "chapter-1",
        projectId: "project-1",
        title: "Chapter 1",
        content: "legacy-old",
        synopsis: null,
        order: 0,
        wordCount: 10,
        createdAt: "2026-03-12T00:00:00.000Z",
        updatedAt: "2026-03-12T01:00:00.000Z",
        deletedAt: null,
      },
      {
        id: "chapter-2",
        projectId: "project-1",
        title: "Chapter 2",
        content: "legacy-fallback",
        synopsis: null,
        order: 1,
        wordCount: 10,
        createdAt: "2026-03-12T00:00:00.000Z",
        updatedAt: "2026-03-12T01:00:00.000Z",
        deletedAt: null,
      },
    ]);
    mocked.rowsByTable.set("ChapterBody", [
      { chapterId: "chapter-1", content: "chapter-body-new" },
    ]);

    const bundle = await buildLocalBundleFromDatabase({
      logger: { warn: vi.fn(), error: vi.fn() },
      pendingProjectDeletes: [],
      userId: "user-1",
    });

    expect(bundle.chapters).toEqual([
      expect.objectContaining({
        id: "chapter-1",
        content: "chapter-body-new",
      }),
      expect.objectContaining({
        id: "chapter-2",
        content: "legacy-fallback",
      }),
    ]);
    expect(mocked.queryCounts.get("ChapterBody")).toBe(1);
  });
});
