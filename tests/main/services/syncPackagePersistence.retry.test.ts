import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncBundle } from "../../../src/main/services/features/sync/syncMapper.js";

const mocked = vi.hoisted(() => ({
  writeLuieContainer: vi.fn(),
  getProjectAttachmentPath: vi.fn(async () => "/tmp/project-1.luie"),
  schedulePackageExport: vi.fn(),
  selectCall: 0,
}));

vi.mock("../../../src/main/services/io/luieContainer.js", () => ({
  writeLuieContainer: (...args: unknown[]) =>
    mocked.writeLuieContainer(...args),
}));

vi.mock(
  "../../../src/main/services/core/project/projectAttachmentStore.js",
  () => ({
    getProjectAttachmentPath: (...args: unknown[]) =>
      mocked.getProjectAttachmentPath(...args),
  }),
);

vi.mock("../../../src/main/services/features/project/projectService.js", () => ({
  projectService: {
    schedulePackageExport: (...args: unknown[]) =>
      mocked.schedulePackageExport(...args),
  },
}));

vi.mock("../../../src/main/infra/database/index.js", () => ({
  db: {
    getClient: () => ({
      select: vi.fn(() => {
        const callIndex = mocked.selectCall;
        mocked.selectCall += 1;
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(async () =>
                callIndex === 0
                  ? [
                      {
                        id: "project-1",
                        title: "Project",
                        createdAt: new Date("2026-06-30T00:00:00.000Z"),
                        updatedAt: new Date("2026-06-30T00:00:00.000Z"),
                      },
                    ]
                  : [],
              ),
              orderBy: vi.fn(async () => []),
            })),
          })),
        };
      }),
    }),
  },
  project: {
    id: "project.id",
  },
  snapshot: {
    id: "snapshot.id",
    chapterId: "snapshot.chapterId",
    content: "snapshot.content",
    description: "snapshot.description",
    createdAt: "snapshot.createdAt",
    projectId: "snapshot.projectId",
  },
}));

import { persistBundleToLuiePackages } from "../../../src/main/services/features/sync/syncPackagePersistence.js";

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
    vi.clearAllMocks();
    mocked.selectCall = 0;
    mocked.writeLuieContainer.mockRejectedValue(new Error("disk full"));
  });

  it("queues a package export retry when sync .luie persistence fails", async () => {
    await expect(
      persistBundleToLuiePackages({
        bundle: createBundle(),
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
  });
});
