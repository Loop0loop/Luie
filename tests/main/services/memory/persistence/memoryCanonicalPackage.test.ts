import { describe, expect, it, vi } from "vitest";
import { applyMemoryCanonicalPackagePayload } from "../../../../../src/main/services/features/memory/persistence/memoryCanonicalPackage.js";

const createTx = () => {
  const inserted: unknown[] = [];
  return {
    inserted,
    tx: {
      insert: vi.fn(() => ({
        values: vi.fn((rows: unknown) => {
          inserted.push(rows);
          return {
            run: vi.fn(() => undefined),
          };
        }),
      })),
    },
  };
};

describe("applyMemoryCanonicalPackagePayload", () => {
  it("re-scopes imported canonical memory rows to the resolved project", () => {
    const { tx, inserted } = createTx();

    applyMemoryCanonicalPackagePayload(tx as never, {
      projectId: "resolved-project",
      importedAt: new Date("2026-03-12T00:00:00.000Z"),
      validChapterIds: new Set(["chapter-1"]),
      payload: {
        schemaVersion: 1,
        exportedAt: "2026-03-11T00:00:00.000Z",
        tables: {
          MemoryEntity: [
            {
              id: "entity-1",
              projectId: "package-project",
              entityType: "character",
              canonicalName: "Alice",
              status: "confirmed",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
        },
      },
    });

    expect(inserted).toEqual([
      [
        expect.objectContaining({
          id: "resolved-project:MemoryEntity:entity-1",
          projectId: "resolved-project",
          status: "confirmed",
        }),
      ],
    ]);
  });

  it("drops fact rows that point outside imported entity or chapter scope", () => {
    const { tx, inserted } = createTx();

    applyMemoryCanonicalPackagePayload(tx as never, {
      projectId: "project-1",
      importedAt: new Date("2026-03-12T00:00:00.000Z"),
      validChapterIds: new Set(["chapter-1"]),
      payload: {
        schemaVersion: 1,
        exportedAt: "2026-03-11T00:00:00.000Z",
        tables: {
          MemoryEntity: [
            {
              id: "entity-1",
              projectId: "project-1",
              entityType: "character",
              canonicalName: "Alice",
              status: "confirmed",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
          MemoryFact: [
            {
              id: "fact-valid",
              projectId: "project-1",
              subjectEntityId: "entity-1",
              predicate: "alive_status",
              objectValue: "alive",
              valueType: "string",
              validFromChapterId: "chapter-1",
              validFromChapterOrder: 1,
              observedAtChapterId: "chapter-1",
              observedAtChapterOrder: 1,
              status: "confirmed",
              extractorVersion: "manual",
              sourceContentHash: "hash",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
            {
              id: "fact-bad-entity",
              projectId: "project-1",
              subjectEntityId: "missing-entity",
              predicate: "alive_status",
              objectValue: "alive",
              valueType: "string",
              validFromChapterId: "chapter-1",
              validFromChapterOrder: 1,
              observedAtChapterId: "chapter-1",
              observedAtChapterOrder: 1,
              status: "confirmed",
              extractorVersion: "manual",
              sourceContentHash: "hash",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
            {
              id: "fact-bad-chapter",
              projectId: "project-1",
              subjectEntityId: "entity-1",
              predicate: "alive_status",
              objectValue: "alive",
              valueType: "string",
              validFromChapterId: "chapter-2",
              validFromChapterOrder: 2,
              observedAtChapterId: "chapter-2",
              observedAtChapterOrder: 2,
              status: "confirmed",
              extractorVersion: "manual",
              sourceContentHash: "hash",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
        },
      },
    });

    expect(inserted).toEqual([
      [expect.objectContaining({ id: "project-1:MemoryEntity:entity-1" })],
      [
        expect.objectContaining({
          id: "project-1:MemoryFact:fact-valid",
          subjectEntityId: "project-1:MemoryEntity:entity-1",
        }),
      ],
    ]);
  });

  it("nulls invalidatedByFactId when the invalidating fact is not imported", () => {
    const { tx, inserted } = createTx();

    applyMemoryCanonicalPackagePayload(tx as never, {
      projectId: "project-1",
      importedAt: new Date("2026-03-12T00:00:00.000Z"),
      validChapterIds: new Set(["chapter-1"]),
      payload: {
        schemaVersion: 1,
        exportedAt: "2026-03-11T00:00:00.000Z",
        tables: {
          MemoryEntity: [
            {
              id: "entity-1",
              projectId: "project-1",
              entityType: "character",
              canonicalName: "Alice",
              status: "confirmed",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
          MemoryFact: [
            {
              id: "fact-1",
              projectId: "project-1",
              subjectEntityId: "entity-1",
              predicate: "alive_status",
              objectValue: "alive",
              valueType: "string",
              validFromChapterId: "chapter-1",
              validFromChapterOrder: 1,
              observedAtChapterId: "chapter-1",
              observedAtChapterOrder: 1,
              status: "confirmed",
              extractorVersion: "manual",
              sourceContentHash: "hash",
              invalidatedByFactId: "missing-fact",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
        },
      },
    });

    expect(inserted).toEqual([
      [expect.objectContaining({ id: "project-1:MemoryEntity:entity-1" })],
      [
        expect.objectContaining({
          id: "project-1:MemoryFact:fact-1",
          invalidatedByFactId: null,
        }),
      ],
    ]);
  });

  it("nulls invalidatedByFactId when the invalidating fact is filtered out", () => {
    const { tx, inserted } = createTx();

    applyMemoryCanonicalPackagePayload(tx as never, {
      projectId: "project-1",
      importedAt: new Date("2026-03-12T00:00:00.000Z"),
      validChapterIds: new Set(["chapter-1"]),
      payload: {
        schemaVersion: 1,
        exportedAt: "2026-03-11T00:00:00.000Z",
        tables: {
          MemoryEntity: [
            {
              id: "entity-1",
              projectId: "project-1",
              entityType: "character",
              canonicalName: "Alice",
              status: "confirmed",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
          ],
          MemoryFact: [
            {
              id: "fact-kept",
              projectId: "project-1",
              subjectEntityId: "entity-1",
              predicate: "alive_status",
              objectValue: "alive",
              valueType: "string",
              validFromChapterId: "chapter-1",
              validFromChapterOrder: 1,
              observedAtChapterId: "chapter-1",
              observedAtChapterOrder: 1,
              status: "confirmed",
              extractorVersion: "manual",
              sourceContentHash: "hash",
              invalidatedByFactId: "fact-filtered",
              updatedAt: "2026-03-11T01:00:00.000Z",
            },
            {
              id: "fact-filtered",
              projectId: "project-1",
              subjectEntityId: "entity-1",
              predicate: "alive_status",
              objectValue: "dead",
              valueType: "string",
              validFromChapterId: "chapter-2",
              validFromChapterOrder: 2,
              observedAtChapterId: "chapter-2",
              observedAtChapterOrder: 2,
              status: "confirmed",
              extractorVersion: "manual",
              sourceContentHash: "hash",
              updatedAt: "2026-03-11T02:00:00.000Z",
            },
          ],
        },
      },
    });

    expect(inserted).toEqual([
      [expect.objectContaining({ id: "project-1:MemoryEntity:entity-1" })],
      [
        expect.objectContaining({
          id: "project-1:MemoryFact:fact-kept",
          invalidatedByFactId: null,
        }),
      ],
    ]);
  });
});
