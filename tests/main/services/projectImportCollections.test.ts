import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "../../../src/shared/constants/index.js";

const mocked = vi.hoisted(() => ({
  entries: new Map<string, string | null>(),
}));

vi.mock("../../../src/main/services/io/luieContainer.js", () => ({
  readLuieContainerEntry: async (_packagePath: string, entryPath: string) =>
    mocked.entries.get(entryPath) ?? null,
}));

import { readLuieImportCollections } from "../../../src/main/services/core/project/importOpen/index.js";

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe("readLuieImportCollections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.entries.clear();
  });

  it("reads optional world collections from .luie entries", async () => {
    mocked.entries.set(
      "world/characters.json",
      JSON.stringify({
        characters: [
          {
            id: "char-1",
            name: "Alice",
            description: "Hero",
            updatedAt: "2026-03-01T00:00:00.000Z",
          },
        ],
      }),
    );
    mocked.entries.set(
      "world/terms.json",
      JSON.stringify({
        terms: [
          {
            id: "term-1",
            term: "Arcology",
            definition: "Mega city",
            updatedAt: "2026-03-01T00:00:00.000Z",
          },
        ],
      }),
    );
    mocked.entries.set(
      "snapshots/index.json",
      JSON.stringify({
        snapshots: [
          {
            id: "snapshot-1",
            chapterId: "chapter-1",
            content: "draft",
            createdAt: "2026-03-01T00:00:00.000Z",
          },
        ],
      }),
    );
    mocked.entries.set(
      "world/synopsis.json",
      JSON.stringify({
        synopsis: "story",
        updatedAt: "2026-03-02T00:00:00.000Z",
      }),
    );
    mocked.entries.set(
      "world/scrap-memos.json",
      JSON.stringify({
        memos: [
          {
            id: "memo-1",
            title: "memo",
            content: "note",
            tags: ["plot"],
            updatedAt: "2026-03-02T00:00:00.000Z",
          },
        ],
        updatedAt: "2026-03-02T00:00:00.000Z",
      }),
    );
    mocked.entries.set(
      "memory/canonical.json",
      JSON.stringify({
        schemaVersion: 1,
        exportedAt: "2026-03-02T00:00:00.000Z",
        tables: {
          MemoryEntity: [
            {
              id: "entity-1",
              projectId: "project-1",
              status: "confirmed",
            },
          ],
        },
      }),
    );

    const collections = await readLuieImportCollections(
      "/tmp/project.luie",
      logger,
    );

    expect(collections.characters).toHaveLength(1);
    expect(collections.terms).toHaveLength(1);
    expect(collections.snapshots).toHaveLength(1);
    expect(collections.synopsis).toMatchObject({ synopsis: "story" });
    expect(collections.memos?.memos).toHaveLength(1);
    expect(collections.memory?.tables?.MemoryEntity).toHaveLength(1);
  });

  it("throws a validation error for malformed collection JSON", async () => {
    mocked.entries.set("world/characters.json", "{malformed");

    await expect(
      readLuieImportCollections("/tmp/project.luie", logger),
    ).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_FAILED,
    });
  });

  it("returns empty collections when optional entries are missing", async () => {
    const collections = await readLuieImportCollections(
      "/tmp/project.luie",
      logger,
    );

    expect(collections).toMatchObject({
      characters: [],
      terms: [],
      snapshots: [],
    });
    expect(collections.synopsis).toBeUndefined();
    expect(collections.plot).toBeUndefined();
    expect(collections.drawing).toBeUndefined();
    expect(collections.mindmap).toBeUndefined();
    expect(collections.memos).toBeUndefined();
    expect(collections.graph).toBeUndefined();
    expect(collections.memory).toBeUndefined();
  });

  it("throws a validation error for malformed collection shape", async () => {
    mocked.entries.set(
      "world/terms.json",
      JSON.stringify({
        terms: "not-an-array",
      }),
    );

    await expect(
      readLuieImportCollections("/tmp/project.luie", logger),
    ).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_FAILED,
    });
  });

  it("rejects unsupported or unreviewed canonical memory payloads", async () => {
    mocked.entries.set(
      "memory/canonical.json",
      JSON.stringify({
        schemaVersion: 1,
        tables: {
          MemoryChunk: [
            {
              id: "chunk-1",
              projectId: "project-1",
            },
          ],
          MemoryFact: [
            {
              id: "fact-1",
              projectId: "project-1",
              status: "suggested",
            },
          ],
        },
      }),
    );

    await expect(
      readLuieImportCollections("/tmp/project.luie", logger),
    ).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_FAILED,
    });
  });
});
