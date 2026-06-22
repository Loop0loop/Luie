import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const worldDocumentFindUnique = vi.fn();
  const worldDocumentWrite = vi.fn();
  const scrapMemoDelete = vi.fn();
  const scrapMemoWrite = vi.fn();
  const projectWrite = vi.fn();
  const scrapMemoFindMany = vi.fn();

  const makeSelect = () => {
    let callIndex = 0;
    return vi.fn(() => ({
      from: vi.fn(() => {
        const currentCall = callIndex;
        callIndex += 1;
        return {
          where: vi.fn(() => ({
            limit: vi.fn(async () => {
              const row = await worldDocumentFindUnique();
              return row ? [row] : [];
            }),
            orderBy: vi.fn(async () => await scrapMemoFindMany()),
            get: vi.fn(() =>
              currentCall === 0 ? worldDocumentFindUnique() : null,
            ),
          })),
        };
      }),
    }));
  };

  const writeChain = (handler: ReturnType<typeof vi.fn>) => ({
    set: vi.fn((value) => ({
      where: vi.fn(() => ({
        run: vi.fn(() => handler(value)),
      })),
    })),
    values: vi.fn((value) => ({
      run: vi.fn(() => handler(value)),
    })),
    where: vi.fn(() => ({
      run: vi.fn(() => handler()),
    })),
  });

  return {
    initialize: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    worldDocumentFindUnique,
    worldDocumentWrite,
    projectWrite,
    scrapMemoFindMany,
    scrapMemoDelete,
    scrapMemoWrite,
    makeSelect,
    transaction: vi.fn((callback: (client: unknown) => unknown) =>
      callback({
        select: makeSelect(),
        update: vi.fn((table) =>
          String(table).includes("Project")
            ? writeChain(projectWrite)
            : writeChain(worldDocumentWrite),
        ),
        insert: vi.fn((table) =>
          String(table).includes("ScrapMemo")
            ? writeChain(scrapMemoWrite)
            : writeChain(worldDocumentWrite),
        ),
        delete: vi.fn(() => writeChain(scrapMemoDelete)),
      }),
    ),
    attemptImmediatePackageExport: vi.fn(
      async (_projectId?: string, _reason?: string) => ({
        exported: true,
      }),
    ),
  };
});

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    initialize: mocked.initialize,
    disconnect: mocked.disconnect,
    getClient: () => ({
      select: mocked.makeSelect(),
      transaction: mocked.transaction,
    }),
  },
}));

vi.mock("../../../src/main/services/core/projectService.js", () => ({
  projectService: {
    attemptImmediatePackageExport: (projectId: string, reason: string) =>
      mocked.attemptImmediatePackageExport(projectId, reason),
  },
}));

import { worldReplicaService } from "../../../src/main/services/features/worldReplica/index.js";

describe("worldReplicaService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.worldDocumentFindUnique.mockReturnValue(null);
    mocked.scrapMemoFindMany.mockResolvedValue([]);
    mocked.attemptImmediatePackageExport.mockResolvedValue({
      exported: true,
    });
  });

  it("returns missing document state when no replica row exists", async () => {
    mocked.worldDocumentFindUnique.mockReturnValue(null);

    await expect(
      worldReplicaService.getDocument({
        projectId: "7a8dba7d-52c0-4d11-a86a-2ed82a6ab9b1",
        docType: "synopsis",
      }),
    ).resolves.toEqual({
      found: false,
      payload: null,
    });
  });

  it("parses stored replica documents", async () => {
    mocked.worldDocumentFindUnique.mockReturnValue({
      payload: JSON.stringify({ synopsis: "hello" }),
      updatedAt: new Date("2026-03-12T01:00:00.000Z"),
    });

    await expect(
      worldReplicaService.getDocument({
        projectId: "7a8dba7d-52c0-4d11-a86a-2ed82a6ab9b1",
        docType: "synopsis",
      }),
    ).resolves.toEqual({
      found: true,
      payload: { synopsis: "hello" },
      updatedAt: "2026-03-12T01:00:00.000Z",
    });
  });

  it("reconstructs scrap memos from replica rows when document payload is missing", async () => {
    mocked.worldDocumentFindUnique.mockReturnValue(null);
    mocked.scrapMemoFindMany.mockResolvedValue([
      {
        id: "memo-1",
        title: "Memo",
        content: "Body",
        tags: JSON.stringify(["tag"]),
        updatedAt: new Date("2026-03-12T02:00:00.000Z"),
      },
    ]);

    await expect(
      worldReplicaService.getScrapMemos("7a8dba7d-52c0-4d11-a86a-2ed82a6ab9b1"),
    ).resolves.toEqual({
      found: true,
      data: {
        schemaVersion: 2,
        memos: [
          {
            id: "memo-1",
            title: "Memo",
            content: "Body",
            tags: ["tag"],
            updatedAt: new Date("2026-03-12T02:00:00.000Z"),
          },
        ],
        updatedAt: "2026-03-12T02:00:00.000Z",
      },
    });
  });

  it("replaces scrap memo rows and stores the aggregate payload together", async () => {
    await worldReplicaService.setScrapMemos({
      projectId: "7a8dba7d-52c0-4d11-a86a-2ed82a6ab9b1",
      data: {
        schemaVersion: 2,
        memos: [
          {
            id: "memo-1",
            title: "Memo",
            content: "Body",
            tags: ["tag"],
            updatedAt: "2026-03-12T02:00:00.000Z",
          },
        ],
        updatedAt: "2026-03-12T03:00:00.000Z",
      },
    });

    expect(mocked.transaction).toHaveBeenCalledTimes(1);
    expect(mocked.worldDocumentWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "7a8dba7d-52c0-4d11-a86a-2ed82a6ab9b1",
        docType: "scrap",
        payload: JSON.stringify({
          schemaVersion: 2,
          memos: [
            {
              id: "memo-1",
              title: "Memo",
              content: "Body",
              tags: ["tag"],
              updatedAt: "2026-03-12T02:00:00.000Z",
            },
          ],
          updatedAt: "2026-03-12T03:00:00.000Z",
        }),
      }),
    );
    expect(mocked.scrapMemoDelete).toHaveBeenCalledTimes(1);
    expect(mocked.worldDocumentWrite).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "memo-1",
        projectId: "7a8dba7d-52c0-4d11-a86a-2ed82a6ab9b1",
        title: "Memo",
        content: "Body",
        tags: JSON.stringify(["tag"]),
        sortOrder: 0,
      }),
    ]);
  });

  it("triggers package export when the graph document is updated", async () => {
    await expect(
      worldReplicaService.setDocument({
        projectId: "7a8dba7d-52c0-4d11-a86a-2ed82a6ab9b1",
        docType: "graph",
        payload: {
          nodes: [
            {
              id: "character-1",
              entityType: "Character",
              name: "Alice",
              positionX: 120,
              positionY: 240,
            },
          ],
          edges: [],
          updatedAt: "2026-03-13T09:00:00.000Z",
        },
      }),
    ).resolves.toEqual({});

    expect(mocked.attemptImmediatePackageExport).toHaveBeenCalledWith(
      "7a8dba7d-52c0-4d11-a86a-2ed82a6ab9b1",
      "world-document:graph",
    );
  });

  it("surfaces graph package export failures without hiding them", async () => {
    mocked.attemptImmediatePackageExport.mockResolvedValueOnce({
      exported: false,
      error: new Error("export failed"),
    });

    await expect(
      worldReplicaService.setDocument({
        projectId: "7a8dba7d-52c0-4d11-a86a-2ed82a6ab9b1",
        docType: "graph",
        payload: {
          nodes: [],
          edges: [],
          updatedAt: "2026-03-13T09:00:00.000Z",
        },
      }),
    ).resolves.toEqual({
      packageExportError: "export failed",
    });
  });
});
