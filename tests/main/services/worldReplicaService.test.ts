import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const worldDocumentFindUnique = vi.fn();
  const worldDocumentUpsert = vi.fn();
  const scrapMemoFindMany = vi.fn();
  const scrapMemoDeleteMany = vi.fn();
  const scrapMemoCreateMany = vi.fn();

  const transactionClient = {
    worldDocument: {
      upsert: worldDocumentUpsert,
    },
    scrapMemo: {
      deleteMany: scrapMemoDeleteMany,
      createMany: scrapMemoCreateMany,
    },
  };

  return {
    initialize: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    worldDocumentFindUnique,
    worldDocumentUpsert,
    scrapMemoFindMany,
    scrapMemoDeleteMany,
    scrapMemoCreateMany,
    transactionClient,
    transaction: vi.fn(async (callback: (client: typeof transactionClient) => unknown) =>
      await callback(transactionClient),
    ),
  };
});

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    initialize: mocked.initialize,
    disconnect: mocked.disconnect,
    getClient: () => ({
      worldDocument: {
        findUnique: mocked.worldDocumentFindUnique,
        upsert: mocked.worldDocumentUpsert,
      },
      scrapMemo: {
        findMany: mocked.scrapMemoFindMany,
        deleteMany: mocked.scrapMemoDeleteMany,
        createMany: mocked.scrapMemoCreateMany,
      },
      $transaction: mocked.transaction,
    }),
  },
}));

import { worldReplicaService } from "../../../src/main/services/features/worldReplicaService.js";

describe("worldReplicaService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns missing document state when no replica row exists", async () => {
    mocked.worldDocumentFindUnique.mockResolvedValue(null);

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
    mocked.worldDocumentFindUnique.mockResolvedValue({
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
    mocked.worldDocumentFindUnique.mockResolvedValue(null);
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
            updatedAt: "2026-03-12T02:00:00.000Z",
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
    expect(mocked.worldDocumentUpsert).toHaveBeenCalledWith({
      where: {
        projectId_docType: {
          projectId: "7a8dba7d-52c0-4d11-a86a-2ed82a6ab9b1",
          docType: "scrap",
        },
      },
      update: {
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
      },
      create: {
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
      },
    });
    expect(mocked.scrapMemoDeleteMany).toHaveBeenCalledWith({
      where: { projectId: "7a8dba7d-52c0-4d11-a86a-2ed82a6ab9b1" },
    });
    expect(mocked.scrapMemoCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: "memo-1",
          projectId: "7a8dba7d-52c0-4d11-a86a-2ed82a6ab9b1",
          title: "Memo",
          content: "Body",
          tags: JSON.stringify(["tag"]),
          sortOrder: 0,
        }),
      ],
    });
  });
});
