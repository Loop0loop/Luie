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
