import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ErrorCode,
  LUIE_PACKAGE_META_FILENAME,
} from "../../../src/shared/constants/index.js";
import { ServiceError } from "../../../src/main/utils/error/index.js";

const mocked = vi.hoisted(() => ({
  projectFindUnique: vi.fn(),
  exportProjectPackageWithOptions: vi.fn(),
  findProjectPathConflict: vi.fn(),
  getProjectAttachmentPath: vi.fn(),
  setProjectAttachmentPath: vi.fn(),
  readLuieContainerEntry: vi.fn(),
  getProjectRevisionState: vi.fn(),
  markProjectExported: vi.fn(),
  withProjectPathStatus: vi.fn(async (projects: unknown[]) => projects),
  normalizeLuiePackagePath: vi.fn((value: string) => value),
}));

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    initialize: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    getClient: () => ({
      select: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(async () => [{ id: "project-1" }]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      returning: vi.fn(async () => [{ id: "project-1", title: "Project 1" }]),
    }),
    getDrizzleClient: () => ({
      select: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(async () => [{ id: "project-1" }]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      returning: vi.fn(async () => [{ id: "project-1", title: "Project 1" }]),
    }),
  },
}));

vi.mock(
  "../../../src/main/services/core/project/projectRevisionStore.js",
  () => ({
    getProjectRevisionState: (...args: unknown[]) =>
      mocked.getProjectRevisionState(...args),
    markProjectExported: (...args: unknown[]) =>
      mocked.markProjectExported(...args),
    listProjectsNeedingExport: vi.fn(async () => []),
  }),
);

vi.mock(
  "../../../src/main/services/core/project/projectExportEngine.js",
  () => ({
    exportProjectPackageWithOptions: (...args: unknown[]) =>
      mocked.exportProjectPackageWithOptions(...args),
  }),
);

vi.mock("../../../src/main/services/core/project/projectPathPolicy.js", () => ({
  findProjectPathConflict: (...args: unknown[]) =>
    mocked.findProjectPathConflict(...args),
  normalizeProjectPath: (value?: string) => value,
  normalizeLuiePackagePath: (value: string) =>
    mocked.normalizeLuiePackagePath(value),
  renameSnapshotDirectoryForProjectTitleChange: vi.fn(),
}));

vi.mock(
  "../../../src/main/services/core/project/projectAttachmentStore.js",
  () => ({
    getProjectAttachmentPath: (...args: unknown[]) =>
      mocked.getProjectAttachmentPath(...args),
    hydrateProjectsWithAttachmentPaths: vi.fn(async (projects) => projects),
    listProjectAttachmentEntries: vi.fn(async () => []),
    migrateLegacyProjectAttachments: vi.fn(async () => ({
      migratedRecords: 0,
      clearedLegacyRecords: 0,
      skippedInvalidRecords: 0,
    })),
    setProjectAttachmentPath: (...args: unknown[]) =>
      mocked.setProjectAttachmentPath(...args),
  }),
);

vi.mock("../../../src/main/services/core/project/projectListStatus.js", () => ({
  withProjectPathStatus: (projects: unknown[]) =>
    mocked.withProjectPathStatus(projects),
}));

vi.mock(
  "../../../src/main/services/core/project/projectLocalStateStore.js",
  () => ({
    getProjectLastOpenedAt: vi.fn(async () => null),
    hydrateProjectsWithLocalState: vi.fn(async (projects) => projects),
    markProjectOpened: vi.fn(async () => new Date("2026-03-12T00:00:00.000Z")),
    sortProjectsByRecentLocalState: vi.fn((projects) => projects),
  }),
);

vi.mock(
  "../../../src/main/services/core/project/projectDeletionPolicy.js",
  () => ({
    deleteProjectPackageFileIfRequested: vi.fn(),
    normalizeProjectDeleteInput: vi.fn(),
  }),
);

vi.mock(
  "../../../src/main/services/core/project/projectPathReconciliation.js",
  () => ({
    collectDuplicateProjectPathGroups: vi.fn(() => []),
  }),
);

vi.mock("../../../src/main/services/core/project/projectImportOpen.js", () => ({
  openLuieProjectPackage: vi.fn(),
}));

vi.mock("../../../src/main/manager/settings/index.js", () => ({
  settingsManager: {
    getSyncSettings: vi.fn(() => ({})),
    setSyncSettings: vi.fn(),
  },
}));

vi.mock("../../../src/main/utils/package/index.js", () => ({
  ensureLuieExtension: (value: string) => value,
}));

vi.mock("../../../src/main/services/io/luieContainer.js", () => ({
  readLuieContainerEntry: (...args: unknown[]) =>
    mocked.readLuieContainerEntry(...args),
}));

import { ProjectService } from "../../../src/main/services/features/project/projectService.js";

describe("ProjectService package attachment flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.projectFindUnique.mockResolvedValue({ id: "project-1" });
    mocked.findProjectPathConflict.mockResolvedValue(null);
    mocked.getProjectAttachmentPath.mockResolvedValue("/tmp/current.luie");
    mocked.exportProjectPackageWithOptions.mockResolvedValue(true);
    mocked.setProjectAttachmentPath.mockResolvedValue(undefined);
    mocked.readLuieContainerEntry.mockResolvedValue(
      JSON.stringify({
        format: "luie",
        version: 2,
        container: "sqlite",
        projectId: "project-1",
        title: "Project 1",
      }),
    );
    mocked.getProjectRevisionState.mockResolvedValue({
      revision: 7,
      exportedRevision: 3,
    });
    mocked.markProjectExported.mockResolvedValue(undefined);
  });

  it("attaches only when the selected .luie meta belongs to the same project", async () => {
    mocked.exportProjectPackageWithOptions.mockImplementationOnce(async () => {
      mocked.getProjectRevisionState.mockResolvedValue({
        revision: 8,
        exportedRevision: 3,
      });
      return true;
    });
    const service = new ProjectService();
    vi.spyOn(service, "getProject").mockResolvedValue({
      id: "project-1",
      title: "Project 1",
      createdAt: "2026-03-12T00:00:00.000Z",
      updatedAt: "2026-03-12T00:00:00.000Z",
      projectPath: "/tmp/attached.luie",
      attachmentStatus: "attached",
      pathMissing: false,
    } as never);

    const attached = await service.attachProjectPackage(
      "project-1",
      "/tmp/attached.luie",
    );

    expect(mocked.readLuieContainerEntry).toHaveBeenCalledWith(
      "/tmp/attached.luie",
      LUIE_PACKAGE_META_FILENAME,
      expect.any(Object),
    );
    expect(mocked.exportProjectPackageWithOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
        options: {
          targetPath: "/tmp/attached.luie",
          worldSourcePath: "/tmp/attached.luie",
        },
      }),
    );
    expect(mocked.setProjectAttachmentPath).toHaveBeenCalledWith(
      "project-1",
      "/tmp/attached.luie",
    );
    expect(mocked.markProjectExported).toHaveBeenCalledWith("project-1", 7);
    expect(
      mocked.getProjectRevisionState.mock.invocationCallOrder[0],
    ).toBeLessThan(
      mocked.exportProjectPackageWithOptions.mock.invocationCallOrder[0],
    );
    expect(
      mocked.exportProjectPackageWithOptions.mock.invocationCallOrder[0],
    ).toBeLessThan(mocked.setProjectAttachmentPath.mock.invocationCallOrder[0]);
    expect(
      mocked.setProjectAttachmentPath.mock.invocationCallOrder[0],
    ).toBeLessThan(mocked.markProjectExported.mock.invocationCallOrder[0]);
    expect(attached).toMatchObject({
      id: "project-1",
      attachmentStatus: "attached",
    });
  });

  it("rejects attach when selected .luie belongs to another project", async () => {
    mocked.readLuieContainerEntry.mockResolvedValue(
      JSON.stringify({
        format: "luie",
        version: 2,
        container: "sqlite",
        projectId: "other-project",
        title: "Other Project",
      }),
    );

    const service = new ProjectService();

    await expect(
      service.attachProjectPackage("project-1", "/tmp/other.luie"),
    ).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_FAILED,
    });
    expect(mocked.exportProjectPackageWithOptions).not.toHaveBeenCalled();
    expect(mocked.setProjectAttachmentPath).not.toHaveBeenCalled();
  });

  it("materializes detached runtime into a new .luie and reattaches it", async () => {
    const service = new ProjectService();
    vi.spyOn(service, "getProject").mockResolvedValue({
      id: "project-1",
      title: "Project 1",
      createdAt: "2026-03-12T00:00:00.000Z",
      updatedAt: "2026-03-12T00:00:00.000Z",
      projectPath: "/tmp/new-target.luie",
      attachmentStatus: "attached",
      pathMissing: false,
    } as never);

    const materialized = await service.materializeProjectPackage(
      "project-1",
      "/tmp/new-target.luie",
    );

    expect(mocked.exportProjectPackageWithOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
        options: {
          targetPath: "/tmp/new-target.luie",
          worldSourcePath: "/tmp/current.luie",
        },
      }),
    );
    expect(mocked.setProjectAttachmentPath).toHaveBeenCalledWith(
      "project-1",
      "/tmp/new-target.luie",
    );
    expect(mocked.markProjectExported).toHaveBeenCalledWith("project-1", 7);
    expect(materialized).toMatchObject({
      id: "project-1",
      attachmentStatus: "attached",
    });
  });

  it.each([
    ["export", mocked.exportProjectPackageWithOptions],
    ["attachment", mocked.setProjectAttachmentPath],
  ] as const)("does not mark attach as exported when %s fails", async (_, failing) => {
    if (failing === mocked.exportProjectPackageWithOptions) {
      failing.mockResolvedValueOnce(false);
    } else {
      failing.mockRejectedValueOnce(new Error("attachment failed"));
    }

    const service = new ProjectService();
    await expect(
      service.attachProjectPackage("project-1", "/tmp/attached.luie"),
    ).rejects.toBeDefined();
    expect(mocked.markProjectExported).not.toHaveBeenCalled();
  });

  it("rejects attach when the captured revision mark fails", async () => {
    mocked.markProjectExported.mockRejectedValueOnce(new Error("mark failed"));

    const service = new ProjectService();
    await expect(
      service.attachProjectPackage("project-1", "/tmp/attached.luie"),
    ).rejects.toBeDefined();
  });

  it.each([
    ["export", mocked.exportProjectPackageWithOptions],
    ["attachment", mocked.setProjectAttachmentPath],
  ] as const)("does not mark materialize as exported when %s fails", async (_, failing) => {
    if (failing === mocked.exportProjectPackageWithOptions) {
      failing.mockResolvedValueOnce(false);
    } else {
      failing.mockRejectedValueOnce(new Error("attachment failed"));
    }

    const service = new ProjectService();
    await expect(
      service.materializeProjectPackage("project-1", "/tmp/new-target.luie"),
    ).rejects.toBeDefined();
    expect(mocked.markProjectExported).not.toHaveBeenCalled();
  });

  it("propagates legacy container rejection when attaching an old package", async () => {
    mocked.readLuieContainerEntry.mockRejectedValue(
      new ServiceError(
        ErrorCode.LUIE_LEGACY_FORMAT_UNSUPPORTED,
        "현재 앱은 구형 package .luie를 지원하지 않습니다",
      ),
    );

    const service = new ProjectService();

    await expect(
      service.attachProjectPackage("project-1", "/tmp/legacy.luie"),
    ).rejects.toMatchObject({
      code: ErrorCode.LUIE_LEGACY_FORMAT_UNSUPPORTED,
    });
    expect(mocked.exportProjectPackageWithOptions).not.toHaveBeenCalled();
    expect(mocked.setProjectAttachmentPath).not.toHaveBeenCalled();
  });
});
