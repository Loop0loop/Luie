import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  getProjectAttachmentPath: vi.fn(),
  readLuieContainerEntry: vi.fn(),
  buildMemoryCanonicalPackagePayload: vi.fn(),
}));

vi.mock(
  "../../../../../src/main/services/core/project/projectAttachmentStore.js",
  () => ({
    getProjectAttachmentPath: mocked.getProjectAttachmentPath,
  }),
);

vi.mock("../../../../../src/main/services/io/luieContainer.js", () => ({
  readLuieContainerEntry: mocked.readLuieContainerEntry,
}));

vi.mock(
  "../../../../../src/main/services/features/memory/persistence/memoryCanonicalPackage.js",
  () => ({
    buildMemoryCanonicalPackagePayload:
      mocked.buildMemoryCanonicalPackagePayload,
  }),
);

describe("verifyMemoryCanonicalPackageSync", () => {
  beforeEach(() => {
    mocked.getProjectAttachmentPath.mockReset();
    mocked.readLuieContainerEntry.mockReset();
    mocked.buildMemoryCanonicalPackagePayload.mockReset();
  });

  it("reports in-sync when DB canonical rows match the attached .luie payload", async () => {
    const { verifyMemoryCanonicalPackageSync } =
      await import("../../../../../src/main/services/features/memory/persistence/memoryCanonicalPackageSyncVerifier.js");
    mocked.getProjectAttachmentPath.mockResolvedValue("/tmp/project.luie");
    mocked.buildMemoryCanonicalPackagePayload.mockResolvedValue({
      schemaVersion: 1,
      exportedAt: "2026-06-08T00:00:00.000Z",
      tables: {
        MemoryEntity: [
          {
            id: "entity-1",
            projectId: "project-1",
            status: "confirmed",
          },
        ],
      },
    });
    mocked.readLuieContainerEntry.mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        exportedAt: "2026-06-08T00:01:00.000Z",
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

    const result = await verifyMemoryCanonicalPackageSync({
      projectId: "project-1",
    });

    expect(result).toMatchObject({
      projectPath: "/tmp/project.luie",
      packageEntryPresent: true,
      inSync: true,
      totalDbRows: 1,
      totalPackageRows: 1,
    });
    expect(result.tables.MemoryEntity).toMatchObject({
      missingInPackage: [],
      extraInPackage: [],
    });
  });

  it("reports missing and extra package ids when payloads diverge", async () => {
    const { verifyMemoryCanonicalPackageSync } =
      await import("../../../../../src/main/services/features/memory/persistence/memoryCanonicalPackageSyncVerifier.js");
    mocked.getProjectAttachmentPath.mockResolvedValue("/tmp/project.luie");
    mocked.buildMemoryCanonicalPackagePayload.mockResolvedValue({
      schemaVersion: 1,
      exportedAt: "2026-06-08T00:00:00.000Z",
      tables: {
        MemoryEvalCase: [
          {
            id: "case-db",
            projectId: "project-1",
          },
        ],
      },
    });
    mocked.readLuieContainerEntry.mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        exportedAt: "2026-06-08T00:01:00.000Z",
        tables: {
          MemoryEvalCase: [
            {
              id: "case-package",
              projectId: "project-1",
            },
          ],
        },
      }),
    );

    const result = await verifyMemoryCanonicalPackageSync({
      projectId: "project-1",
    });

    expect(result.inSync).toBe(false);
    expect(result.tables.MemoryEvalCase).toMatchObject({
      missingInPackage: ["case-db"],
      extraInPackage: ["case-package"],
    });
  });

  it("treats import-scoped DB ids as matching their package source ids", async () => {
    const { verifyMemoryCanonicalPackageSync } =
      await import("../../../../../src/main/services/features/memory/persistence/memoryCanonicalPackageSyncVerifier.js");
    mocked.getProjectAttachmentPath.mockResolvedValue("/tmp/project.luie");
    mocked.buildMemoryCanonicalPackagePayload.mockResolvedValue({
      schemaVersion: 1,
      exportedAt: "2026-06-08T00:00:00.000Z",
      tables: {
        MemoryEntity: [
          {
            id: "project-1:MemoryEntity:entity-1",
            projectId: "project-1",
            status: "confirmed",
          },
        ],
      },
    });
    mocked.readLuieContainerEntry.mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        exportedAt: "2026-06-08T00:01:00.000Z",
        tables: {
          MemoryEntity: [
            {
              id: "entity-1",
              projectId: "source-project",
              status: "confirmed",
            },
          ],
        },
      }),
    );

    const result = await verifyMemoryCanonicalPackageSync({
      projectId: "project-1",
    });

    expect(result.inSync).toBe(true);
    expect(result.tables.MemoryEntity).toMatchObject({
      missingInPackage: [],
      extraInPackage: [],
    });
  });

  it("reports scoped foreign id mismatches for matching canonical row ids", async () => {
    const { verifyMemoryCanonicalPackageSync } =
      await import("../../../../../src/main/services/features/memory/persistence/memoryCanonicalPackageSyncVerifier.js");
    mocked.getProjectAttachmentPath.mockResolvedValue("/tmp/project.luie");
    mocked.buildMemoryCanonicalPackagePayload.mockResolvedValue({
      schemaVersion: 1,
      exportedAt: "2026-06-08T00:00:00.000Z",
      tables: {
        MemoryFact: [
          {
            id: "project-1:MemoryFact:fact-1",
            projectId: "project-1",
            subjectEntityId: "project-1:MemoryEntity:entity-db",
            predicate: "knows_secret",
            valueType: "text",
            status: "confirmed",
          },
        ],
      },
    });
    mocked.readLuieContainerEntry.mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        exportedAt: "2026-06-08T00:01:00.000Z",
        tables: {
          MemoryFact: [
            {
              id: "fact-1",
              projectId: "source-project",
              subjectEntityId: "entity-package",
              predicate: "knows_secret",
              valueType: "text",
              status: "confirmed",
            },
          ],
        },
      }),
    );

    const result = await verifyMemoryCanonicalPackageSync({
      projectId: "project-1",
    });

    expect(result.inSync).toBe(false);
    expect(result.tables.MemoryFact.sourceIdMismatches).toEqual([
      {
        rowId: "fact-1",
        field: "subjectEntityId",
        dbValue: "entity-db",
        packageValue: "entity-package",
      },
    ]);
  });
});
