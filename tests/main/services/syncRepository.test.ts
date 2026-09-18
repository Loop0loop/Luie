import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncBundle } from "../../../src/main/services/features/sync/syncMapper.js";

const mocked = vi.hoisted(() => ({
  fetch: vi.fn(),
}));

vi.mock("../../../src/main/services/features/sync/supabaseEnv.js", () => ({
  getSupabaseConfig: () => ({
    url: "https://example.supabase.co",
    anonKey: "anon-key",
  }),
  getSupabaseConfigOrThrow: () => ({
    url: "https://example.supabase.co",
    anonKey: "anon-key",
  }),
}));

describe("SyncRepository scope narrowing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    mocked.fetch.mockReset();
    vi.stubGlobal("fetch", mocked.fetch);
  });

  it("fetchBundle does not request snapshots table", async () => {
    mocked.fetch.mockImplementation(
      async () =>
        new Response(JSON.stringify([]), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
    );

    const { syncRepository } =
      await import("../../../src/main/services/features/sync/syncRepository.js");
    const bundle = await syncRepository.fetchBundle(
      "access-token",
      "00000000-0000-0000-0000-000000000001",
    );

    const requested = mocked.fetch.mock.calls.map((call) => String(call[0]));
    expect(requested.some((url) => url.includes("/rest/v1/snapshots"))).toBe(
      false,
    );
    expect(bundle.snapshots).toEqual([]);
  });

  it("fetches all 2,001 chapter rows and 1,001 tombstones with stable Range pages", async () => {
    const userId = "00000000-0000-0000-0000-000000000001";
    const chapters = Array.from({ length: 2_001 }, (_, index) => ({
      id: `chapter-${String(index).padStart(4, "0")}`,
      user_id: userId,
      project_id: "project-1",
      title: `Chapter ${index}`,
      content: `content ${index}`,
      order: index,
      word_count: 10,
      created_at: "2026-09-13T00:00:00.000Z",
      updated_at: "2026-09-13T00:00:00.000Z",
    }));
    const tombstones = Array.from({ length: 1_001 }, (_, index) => ({
      id: `tombstone-${String(index).padStart(4, "0")}`,
      user_id: userId,
      project_id: "project-1",
      entity_type: "chapter",
      entity_id: `deleted-${index}`,
      deleted_at: "2026-09-13T00:00:00.000Z",
      updated_at: "2026-09-13T00:00:00.000Z",
    }));
    const rowsByTable: Record<string, Array<Record<string, unknown>>> = {
      chapters,
      tombstones,
    };
    mocked.fetch.mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        const table = url.pathname.split("/").at(-1) ?? "";
        const range = String(
          (init?.headers as Record<string, string> | undefined)?.Range ??
            "0-999",
        );
        const [start, end] = range.split("-").map(Number);
        const rows = rowsByTable[table] ?? [];
        const page = rows.slice(start, end + 1);
        const contentRange =
          rows.length === 0
            ? "*/0"
            : `${start}-${start + page.length - 1}/${rows.length}`;
        return new Response(JSON.stringify(page), {
          status: page.length === rows.length ? 200 : 206,
          headers: { "content-range": contentRange },
        });
      },
    );

    const { syncRepository } =
      await import("../../../src/main/services/features/sync/syncRepository.js");
    const bundle = await syncRepository.fetchBundle("access-token", userId);

    expect(bundle.chapters).toHaveLength(2_001);
    expect(bundle.chapters.at(-1)?.id).toBe("chapter-2000");
    expect(bundle.tombstones).toHaveLength(1_001);
    expect(bundle.tombstones.at(-1)?.id).toBe("tombstone-1000");
    const chapterCalls = mocked.fetch.mock.calls.filter((call) =>
      String(call[0]).includes("/rest/v1/chapters?"),
    );
    expect(
      chapterCalls.map(
        (call) =>
          ((call[1] as RequestInit).headers as Record<string, string>).Range,
      ),
    ).toEqual(["0-999", "1000-1999", "2000-2999"]);
    expect(
      chapterCalls.every(
        (call) =>
          new URL(String(call[0])).searchParams.get("order") === "id.asc",
      ),
    ).toBe(true);
  });

  it("rejects a table response that ends before its declared total", async () => {
    let chapterPage = 0;
    mocked.fetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (!url.includes("/rest/v1/chapters?")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "content-range": "*/0" },
        });
      }
      chapterPage += 1;
      return chapterPage === 1
        ? new Response(JSON.stringify([{ id: "only-row" }]), {
            status: 206,
            headers: { "content-range": "0-0/2" },
          })
        : new Response(JSON.stringify([]), {
            status: 200,
            headers: { "content-range": "*/2" },
          });
    });

    const { syncRepository } =
      await import("../../../src/main/services/features/sync/syncRepository.js");
    await expect(
      syncRepository.fetchBundle(
        "access-token",
        "00000000-0000-0000-0000-000000000001",
      ),
    ).rejects.toThrow("SYNC_PAGINATION_INCOMPLETE:chapters");
  });

  it("upsertBundle omits snapshots writes and excludes project_path payload", async () => {
    mocked.fetch.mockResolvedValue(
      new Response("", {
        status: 201,
      }),
    );

    const { createEmptySyncBundle } =
      await import("../../../src/main/services/features/sync/syncMapper.js");
    const { syncRepository } =
      await import("../../../src/main/services/features/sync/syncRepository.js");

    const bundle: SyncBundle = createEmptySyncBundle();
    bundle.projects.push({
      id: "project-1",
      userId: "00000000-0000-0000-0000-000000000001",
      title: "Project",
      description: "desc",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    bundle.chapters.push({
      id: "chapter-1",
      userId: "00000000-0000-0000-0000-000000000001",
      projectId: "project-1",
      title: "Chapter",
      content: "text",
      order: 0,
      wordCount: 4,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    bundle.worldDocuments.push({
      id: "project-1:synopsis",
      userId: "00000000-0000-0000-0000-000000000001",
      projectId: "project-1",
      docType: "synopsis",
      payload: { synopsis: "s" },
      updatedAt: new Date().toISOString(),
    });
    bundle.memos.push({
      id: "memo-1",
      userId: "00000000-0000-0000-0000-000000000001",
      projectId: "project-1",
      title: "memo",
      content: "memo content",
      tags: [],
      updatedAt: new Date().toISOString(),
    });
    bundle.memoryCanonicalRows?.push({
      id: "project-1:MemoryEntity:entity-1",
      userId: "00000000-0000-0000-0000-000000000001",
      projectId: "project-1",
      tableName: "MemoryEntity",
      row: {
        id: "project-1:MemoryEntity:entity-1",
        projectId: "project-1",
        entityType: "character",
        canonicalName: "Alice",
        status: "confirmed",
      },
      updatedAt: new Date().toISOString(),
    });
    bundle.tombstones.push({
      id: "project-1:chapter:chapter-2",
      userId: "00000000-0000-0000-0000-000000000001",
      projectId: "project-1",
      entityType: "chapter",
      entityId: "chapter-2",
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    bundle.snapshots.push({
      id: "snapshot-1",
      userId: "00000000-0000-0000-0000-000000000001",
      projectId: "project-1",
      chapterId: "chapter-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      contentLength: 10,
      contentInline: "snapshot",
    });

    await syncRepository.upsertBundle("access-token", bundle);

    const requestedUrls = mocked.fetch.mock.calls.map((call) =>
      String(call[0]),
    );
    expect(
      requestedUrls.some((url) => url.includes("/rest/v1/snapshots")),
    ).toBe(false);

    const projectsCall = mocked.fetch.mock.calls.find((call) =>
      String(call[0]).includes("/rest/v1/projects?"),
    );
    expect(projectsCall).toBeDefined();
    const body = String(
      (projectsCall?.[1] as RequestInit | undefined)?.body ?? "",
    );
    expect(body.includes("project_path")).toBe(false);

    const worldDocumentCall = mocked.fetch.mock.calls.find((call) =>
      String(call[0]).includes("/rest/v1/world_documents?"),
    );
    expect(worldDocumentCall).toBeDefined();
    expect(
      new URL(String(worldDocumentCall?.[0])).searchParams.get("on_conflict"),
    ).toBe("user_id,project_id,doc_type");

    const memoryCall = mocked.fetch.mock.calls.find((call) =>
      String(call[0]).includes("/rest/v1/memory_canonical_rows?"),
    );
    expect(memoryCall).toBeDefined();
    const memoryBody = JSON.parse(
      String((memoryCall?.[1] as RequestInit | undefined)?.body ?? "[]"),
    ) as Array<Record<string, unknown>>;
    expect(memoryBody).toEqual([
      expect.objectContaining({
        id: "project-1:MemoryEntity:entity-1",
        table_name: "MemoryEntity",
        row: expect.objectContaining({
          canonicalName: "Alice",
          status: "confirmed",
        }),
      }),
    ]);
  });

  it("fetchBundle normalizes world document payloads to safe objects", async () => {
    mocked.fetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/rest/v1/world_documents")) {
        return new Response(
          JSON.stringify([
            {
              id: "project-1:synopsis",
              user_id: "00000000-0000-0000-0000-000000000001",
              project_id: "project-1",
              doc_type: "synopsis",
              payload: '{"synopsis":"remote","status":"working"}',
              updated_at: "2026-02-28T00:00:00.000Z",
            },
            {
              id: "project-1:plot",
              user_id: "00000000-0000-0000-0000-000000000001",
              project_id: "project-1",
              doc_type: "plot",
              payload: "not-json",
              updated_at: "2026-02-28T00:00:00.000Z",
            },
          ]),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              "content-range": "0-1/2",
            },
          },
        );
      }
      if (url.includes("/rest/v1/memory_canonical_rows")) {
        return new Response(
          JSON.stringify([
            {
              id: "project-1:MemoryEntity:entity-1",
              user_id: "00000000-0000-0000-0000-000000000001",
              project_id: "project-1",
              table_name: "MemoryEntity",
              row: {
                id: "project-1:MemoryEntity:entity-1",
                projectId: "project-1",
                entityType: "character",
                canonicalName: "Alice",
                status: "confirmed",
              },
              updated_at: "2026-02-28T00:00:00.000Z",
            },
            {
              id: "project-1:MemoryEntity:bad-status",
              user_id: "00000000-0000-0000-0000-000000000001",
              project_id: "project-1",
              table_name: "MemoryEntity",
              row: {
                id: "project-1:MemoryEntity:bad-status",
                projectId: "project-1",
                entityType: "character",
                canonicalName: "Draft",
                status: "suggested",
              },
              updated_at: "2026-02-28T00:00:00.000Z",
            },
            {
              id: "project-1:MemoryEntity:wrong-project",
              user_id: "00000000-0000-0000-0000-000000000001",
              project_id: "project-1",
              table_name: "MemoryEntity",
              row: {
                id: "project-1:MemoryEntity:wrong-project",
                projectId: "other-project",
                entityType: "character",
                canonicalName: "Wrong",
                status: "confirmed",
              },
              updated_at: "2026-02-28T00:00:00.000Z",
            },
          ]),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              "content-range": "0-2/3",
            },
          },
        );
      }

      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    });

    const { syncRepository } =
      await import("../../../src/main/services/features/sync/syncRepository.js");
    const bundle = await syncRepository.fetchBundle(
      "access-token",
      "00000000-0000-0000-0000-000000000001",
    );

    const synopsisDoc = bundle.worldDocuments.find(
      (doc) => doc.docType === "synopsis",
    );
    const plotDoc = bundle.worldDocuments.find((doc) => doc.docType === "plot");

    expect(synopsisDoc?.payload).toMatchObject({
      synopsis: "remote",
      status: "working",
    });
    expect(plotDoc?.payload).toEqual({});
    expect(bundle.memoryCanonicalRows).toEqual([
      expect.objectContaining({
        id: "project-1:MemoryEntity:entity-1",
        tableName: "MemoryEntity",
        row: expect.objectContaining({
          canonicalName: "Alice",
          status: "confirmed",
        }),
      }),
    ]);
  });

  it("degrades when the optional canonical memory table is not migrated yet", async () => {
    mocked.fetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/rest/v1/memory_canonical_rows")) {
        return new Response(
          JSON.stringify({
            code: "PGRST205",
            message: "Could not find the table 'public.memory_canonical_rows'",
          }),
          {
            status: 404,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    });

    const { syncRepository } =
      await import("../../../src/main/services/features/sync/syncRepository.js");
    const bundle = await syncRepository.fetchBundle(
      "access-token",
      "00000000-0000-0000-0000-000000000001",
    );

    expect(bundle.memoryCanonicalRows).toEqual([]);
  });

  it("skips optional canonical memory upsert when the remote table is missing", async () => {
    mocked.fetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/rest/v1/memory_canonical_rows")) {
        return new Response(
          JSON.stringify({
            code: "PGRST205",
            message: "Could not find the table 'public.memory_canonical_rows'",
          }),
          {
            status: 404,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }
      return new Response("", { status: 201 });
    });

    const { createEmptySyncBundle } =
      await import("../../../src/main/services/features/sync/syncMapper.js");
    const { syncRepository } =
      await import("../../../src/main/services/features/sync/syncRepository.js");
    const bundle: SyncBundle = createEmptySyncBundle();
    bundle.memoryCanonicalRows?.push({
      id: "project-1:MemoryEntity:entity-1",
      userId: "00000000-0000-0000-0000-000000000001",
      projectId: "project-1",
      tableName: "MemoryEntity",
      row: {
        id: "project-1:MemoryEntity:entity-1",
        projectId: "project-1",
        entityType: "character",
        canonicalName: "Alice",
        status: "confirmed",
      },
      updatedAt: "2026-02-28T00:00:00.000Z",
    });

    await expect(
      syncRepository.upsertBundle("access-token", bundle),
    ).resolves.toBeUndefined();
  });
});
