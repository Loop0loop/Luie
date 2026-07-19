import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import type { SyncBundle } from "../../../src/main/services/features/sync/syncMapper.js";
import type * as ProjectAttachmentStoreModule from "../../../src/main/services/core/project/projectAttachmentStore.js";
import type * as ProjectRevisionStoreModule from "../../../src/main/services/core/project/projectRevisionStore.js";
import type * as DatabaseModule from "../../../src/main/infra/database/index.js";

const mocked = vi.hoisted(() => ({
  writeLuieContainer: vi.fn(),
  getProjectAttachmentPath: vi.fn(async () => "/tmp/project-1.luie"),
  schedulePackageExport: vi.fn(),
  markProjectExported: vi.fn(),
  calls: [] as string[],
  useRealDatabase: false,
  useRealAttachmentStore: false,
  useRealRevisionStore: false,
}));

vi.mock("../../../src/main/services/io/luieContainer.js", () => ({
  writeLuieContainer: (...args: unknown[]) =>
    mocked.writeLuieContainer(...args),
}));

vi.mock(
  "../../../src/main/services/core/project/projectAttachmentStore.js",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof ProjectAttachmentStoreModule
      >();
    return {
      ...actual,
      getProjectAttachmentPath: (...args: Parameters<typeof actual.getProjectAttachmentPath>) =>
        mocked.useRealAttachmentStore
          ? actual.getProjectAttachmentPath(...args)
          : mocked.getProjectAttachmentPath(...args),
    };
  },
);

vi.mock("../../../src/main/services/features/project/projectService.js", () => ({
  projectService: {
    schedulePackageExport: (...args: unknown[]) =>
      mocked.schedulePackageExport(...args),
  },
}));

vi.mock(
  "../../../src/main/services/core/project/projectRevisionStore.js",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof ProjectRevisionStoreModule
      >();
    return {
      ...actual,
      markProjectExported: (...args: Parameters<typeof actual.markProjectExported>) => {
        mocked.calls.push(`mark:${args[1]}`);
        return mocked.useRealRevisionStore
          ? actual.markProjectExported(...args)
          : mocked.markProjectExported(...args);
      },
    };
  },
);

vi.mock(
  "../../../src/main/infra/database/index.js",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof DatabaseModule
      >();
    const fakeClient = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ orderBy: vi.fn(async () => []) })),
        })),
      })),
    };
    return {
      ...actual,
      db: {
        getClient: () =>
          mocked.useRealDatabase ? actual.db.getClient() : fakeClient,
      },
    };
  },
);

import { persistBundleToLuiePackages } from "../../../src/main/services/features/sync/syncPackagePersistence.js";
import {
  db,
  memoryEntity,
  project,
  projectAttachment,
} from "../../../src/main/infra/database/index.js";
import {
  getProjectRevisionState,
  listProjectsNeedingExport,
} from "../../../src/main/services/core/project/projectRevisionStore.js";

const createBundle = (): SyncBundle => ({
  projects: [
    {
      id: "project-1",
      userId: "user-1",
      title: "Project",
      description: null,
      createdAt: "2026-06-30T00:00:00.000Z",
      updatedAt: "2026-06-30T00:00:00.000Z",
    },
  ],
  chapters: [],
  characters: [],
  terms: [],
  worldDocuments: [],
  memos: [],
  snapshots: [],
  memoryCanonicalRows: [],
  tombstones: [],
});

describe("persistBundleToLuiePackages retry", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    mocked.calls.length = 0;
    mocked.useRealDatabase = false;
    mocked.useRealAttachmentStore = false;
    mocked.useRealRevisionStore = false;
    mocked.getProjectAttachmentPath.mockReset().mockResolvedValue(
      "/tmp/project-1.luie",
    );
    mocked.markProjectExported.mockReset().mockResolvedValue(undefined);
    mocked.writeLuieContainer
      .mockReset()
      .mockRejectedValue(new Error("disk full"));
  });

  it("queues a package export retry when sync .luie persistence fails", async () => {
    await expect(
      persistBundleToLuiePackages({
        bundle: createBundle(),
        capturedRevisions: new Map([["project-1", 7]]),
        hydrateMissingWorldDocsFromPackage: vi.fn(),
        buildProjectPackagePayload: vi.fn(async () => ({} as never)),
        logger: {
          warn: vi.fn(),
          error: vi.fn(),
        },
      }),
    ).rejects.toThrow("SYNC_LUIE_PERSIST_FAILED:project-1");

    expect(mocked.schedulePackageExport).toHaveBeenCalledWith(
      "project-1",
      "sync:retry",
    );
    expect(mocked.markProjectExported).not.toHaveBeenCalled();
  });

  it("marks only the captured revision when the current revision advances during write", async () => {
    mocked.useRealDatabase = true;
    mocked.useRealAttachmentStore = true;
    mocked.useRealRevisionStore = true;
    const client = db.getClient();
    client
      .insert(project)
      .values({
        id: "project-1",
        title: "Local DB title",
        createdAt: "2026-06-30T00:00:00.000Z",
        updatedAt: "2026-06-30T00:00:00.000Z",
      })
      .run();
    client
      .update(project)
      .set({ revision: 7 })
      .where(eq(project.id, "project-1"))
      .run();
    client
      .insert(projectAttachment)
      .values({
        projectId: "project-1",
        projectPath: "/tmp/project-1.luie",
        updatedAt: "2026-06-30T00:00:00.000Z",
      })
      .run();
    const bundle = createBundle();
    bundle.projects[0].title = "Captured bundle title";
    let writtenPayload: unknown;
    mocked.writeLuieContainer.mockImplementation(async (input) => {
      writtenPayload = input.payload;
      mocked.calls.push("writer");
      client
        .insert(memoryEntity)
        .values({
          id: "concurrent-edit",
          projectId: "project-1",
          entityType: "character",
          canonicalName: "Concurrent",
          status: "confirmed",
          updatedAt: "2026-06-30T00:00:00.000Z",
        })
        .run();
    });
    const selectable = client as unknown as {
      select: (...args: unknown[]) => { from: (table: unknown) => unknown };
    };
    const originalSelect = selectable.select.bind(client);
    vi.spyOn(selectable, "select").mockImplementation((...args) => {
      const builder = originalSelect(...args);
      const originalFrom = builder.from.bind(builder);
      builder.from = (table: unknown) => {
        if (table === project) mocked.calls.push("select:project");
        return originalFrom(table);
      };
      return builder;
    });

    await persistBundleToLuiePackages({
      bundle,
      capturedRevisions: new Map([["project-1", 7]]),
      hydrateMissingWorldDocsFromPackage: vi.fn(),
      buildProjectPackagePayload: vi.fn(async ({ bundle: capturedBundle }) =>
        ({ meta: { title: capturedBundle.projects[0]?.title } }) as never,
      ),
      logger: { warn: vi.fn(), error: vi.fn() },
    });

    expect(writtenPayload).toMatchObject({
      meta: { title: "Captured bundle title" },
    });
    expect(mocked.calls).toEqual(["writer", "mark:7", "select:project"]);
    expect(await getProjectRevisionState("project-1", client)).toEqual({
      revision: 8,
      exportedRevision: 7,
    });
    expect(await listProjectsNeedingExport(client)).toContain("project-1");
    expect(mocked.schedulePackageExport).not.toHaveBeenCalled();
  });

  it("queues retry and records no success when marking fails", async () => {
    mocked.writeLuieContainer.mockResolvedValue(undefined);
    mocked.markProjectExported.mockRejectedValue(new Error("mark failed"));

    await expect(
      persistBundleToLuiePackages({
        bundle: createBundle(),
        capturedRevisions: new Map([["project-1", 7]]),
        hydrateMissingWorldDocsFromPackage: vi.fn(),
        buildProjectPackagePayload: vi.fn(async () => ({} as never)),
        logger: { warn: vi.fn(), error: vi.fn() },
      }),
    ).rejects.toThrow("SYNC_LUIE_PERSIST_FAILED:project-1");

    expect(mocked.markProjectExported).toHaveBeenCalledWith("project-1", 7);
    expect(mocked.schedulePackageExport).toHaveBeenCalledWith(
      "project-1",
      "sync:retry",
    );
  });
});
