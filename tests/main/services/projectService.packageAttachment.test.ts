import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode, LUIE_PACKAGE_META_FILENAME } from "../../../src/shared/constants/index.js";

const mocked = vi.hoisted(() => ({
  projectFindUnique: vi.fn(),
  exportProjectPackageWithOptions: vi.fn(),
  findProjectPathConflict: vi.fn(),
  getProjectAttachmentPath: vi.fn(),
  setProjectAttachmentPath: vi.fn(),
  readLuieEntry: vi.fn(),
  withProjectPathStatus: vi.fn(async (projects: unknown[]) => projects),
  normalizeLuiePackagePath: vi.fn((value: string) => value),
}));

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    getClient: () => ({
      project: {
        findUnique: mocked.projectFindUnique,
      },
    }),
  },
}));

vi.mock("../../../src/main/services/core/project/projectExportEngine.js", () => ({
  exportProjectPackageWithOptions: (...args: unknown[]) =>
    mocked.exportProjectPackageWithOptions(...args),
}));

vi.mock("../../../src/main/services/core/project/projectPathPolicy.js", () => ({
  findProjectPathConflict: (...args: unknown[]) =>
    mocked.findProjectPathConflict(...args),
  normalizeProjectPath: (value?: string) => value,
  normalizeLuiePackagePath: (...args: unknown[]) =>
    mocked.normalizeLuiePackagePath(...args),
  renameSnapshotDirectoryForProjectTitleChange: vi.fn(),
}));

vi.mock("../../../src/main/services/core/project/projectAttachmentStore.js", () => ({
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
}));

vi.mock("../../../src/main/services/core/project/projectListStatus.js", () => ({
  withProjectPathStatus: (...args: unknown[]) => mocked.withProjectPathStatus(...args),
}));

vi.mock("../../../src/main/services/core/project/projectLocalStateStore.js", () => ({
  getProjectLastOpenedAt: vi.fn(async () => null),
  hydrateProjectsWithLocalState: vi.fn(async (projects) => projects),
  markProjectOpened: vi.fn(async () => new Date("2026-03-12T00:00:00.000Z")),
  sortProjectsByRecentLocalState: vi.fn((projects) => projects),
}));

vi.mock("../../../src/main/services/core/project/projectDeletionPolicy.js", () => ({
  deleteProjectPackageFileIfRequested: vi.fn(),
  normalizeProjectDeleteInput: vi.fn(),
}));

vi.mock("../../../src/main/services/core/project/projectPathReconciliation.js", () => ({
  collectDuplicateProjectPathGroups: vi.fn(() => []),
}));

vi.mock("../../../src/main/services/core/project/projectImportOpen.js", () => ({
  openLuieProjectPackage: vi.fn(),
}));

vi.mock("../../../src/main/manager/settingsManager.js", () => ({
  settingsManager: {
    getSyncSettings: vi.fn(() => ({})),
    setSyncSettings: vi.fn(),
  },
}));

vi.mock("../../../src/main/utils/luiePackage.js", () => ({
  readLuieEntry: (...args: unknown[]) => mocked.readLuieEntry(...args),
}));

import { ProjectService } from "../../../src/main/services/core/projectService.js";

describe("ProjectService package attachment flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.projectFindUnique.mockResolvedValue({ id: "project-1" });
    mocked.findProjectPathConflict.mockResolvedValue(null);
    mocked.getProjectAttachmentPath.mockResolvedValue("/tmp/current.luie");
    mocked.exportProjectPackageWithOptions.mockResolvedValue(true);
    mocked.setProjectAttachmentPath.mockResolvedValue(undefined);
    mocked.readLuieEntry.mockResolvedValue(
      JSON.stringify({
        format: "luie",
        version: 1,
        projectId: "project-1",
        title: "Project 1",
      }),
    );
  });

  it("attaches only when the selected .luie meta belongs to the same project", async () => {
    const service = new ProjectService();
    vi.spyOn(service, "getProject").mockResolvedValue({
      id: "project-1",
      title: "Project 1",
      createdAt: new Date("2026-03-12T00:00:00.000Z"),
      updatedAt: new Date("2026-03-12T00:00:00.000Z"),
      projectPath: "/tmp/attached.luie",
      attachmentStatus: "attached",
      pathMissing: false,
    });

    const attached = await service.attachProjectPackage(
      "project-1",
      "/tmp/attached.luie",
    );

    expect(mocked.readLuieEntry).toHaveBeenCalledWith(
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
    expect(attached).toMatchObject({
      id: "project-1",
      attachmentStatus: "attached",
    });
  });

  it("rejects attach when selected .luie belongs to another project", async () => {
    mocked.readLuieEntry.mockResolvedValue(
      JSON.stringify({
        format: "luie",
        version: 1,
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
      createdAt: new Date("2026-03-12T00:00:00.000Z"),
      updatedAt: new Date("2026-03-12T00:00:00.000Z"),
      projectPath: "/tmp/new-target.luie",
      attachmentStatus: "attached",
      pathMissing: false,
    });

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
    expect(materialized).toMatchObject({
      id: "project-1",
      attachmentStatus: "attached",
    });
  });
});
