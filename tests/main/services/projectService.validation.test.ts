import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceError } from "../../../src/main/utils/serviceError.js";
import { ErrorCode } from "../../../src/shared/constants/errorCode.js";

const mocked = vi.hoisted(() => ({
  normalizeProjectPath: vi.fn(),
  findProjectPathConflict: vi.fn(),
  renameSnapshotDirectoryForProjectTitleChange: vi.fn(),
  projectCreate: vi.fn(),
  projectUpdate: vi.fn(),
  projectFindUnique: vi.fn(),
  deleteMany: vi.fn(async () => ({ count: 0 })),
  initialize: vi.fn(async () => undefined),
  disconnect: vi.fn(async () => undefined),
}));

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    initialize: mocked.initialize,
    disconnect: mocked.disconnect,
    getClient: () => ({
      snapshot: {
        deleteMany: mocked.deleteMany,
      },
      termAppearance: {
        deleteMany: mocked.deleteMany,
      },
      characterAppearance: {
        deleteMany: mocked.deleteMany,
      },
      term: {
        deleteMany: mocked.deleteMany,
      },
      character: {
        deleteMany: mocked.deleteMany,
      },
      chapter: {
        deleteMany: mocked.deleteMany,
      },
      projectSettings: {
        deleteMany: mocked.deleteMany,
      },
      project: {
        create: mocked.projectCreate,
        update: mocked.projectUpdate,
        findUnique: mocked.projectFindUnique,
        findMany: vi.fn(),
        deleteMany: mocked.deleteMany,
      },
    }),
  },
}));

vi.mock("../../../src/main/manager/settingsManager.js", () => ({
  settingsManager: {
    getSyncSettings: vi.fn(() => ({})),
    setSyncSettings: vi.fn(),
    addPendingProjectDelete: vi.fn(),
    removePendingProjectDeletes: vi.fn(),
  },
}));

vi.mock("../../../src/main/services/core/project/projectDeletionPolicy.js", () => ({
  deleteProjectPackageFileIfRequested: vi.fn(),
  normalizeProjectDeleteInput: vi.fn(),
}));

vi.mock("../../../src/main/services/core/project/projectListStatus.js", () => ({
  withProjectPathStatus: vi.fn(async (projects) => projects),
}));

vi.mock("../../../src/main/services/core/project/projectPathPolicy.js", () => ({
  findProjectPathConflict: mocked.findProjectPathConflict,
  normalizeProjectPath: mocked.normalizeProjectPath,
  renameSnapshotDirectoryForProjectTitleChange:
    mocked.renameSnapshotDirectoryForProjectTitleChange,
}));

vi.mock("../../../src/main/services/core/project/projectPathReconciliation.js", () => ({
  collectDuplicateProjectPathGroups: vi.fn(() => []),
}));

vi.mock("../../../src/main/services/core/project/projectExportEngine.js", () => ({
  exportProjectPackageWithOptions: vi.fn(async () => true),
}));

vi.mock("../../../src/main/services/core/project/projectImportOpen.js", () => ({
  openLuieProjectPackage: vi.fn(),
}));

import { ProjectService } from "../../../src/main/services/core/projectService.js";

describe("ProjectService validation errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.findProjectPathConflict.mockResolvedValue(null);
    mocked.projectCreate.mockResolvedValue({
      id: "project-1",
      title: "project",
      description: null,
      projectPath: "/tmp/project.luie",
    });
    mocked.projectUpdate.mockResolvedValue({
      id: "project-1",
      title: "project",
      description: null,
      projectPath: "/tmp/project.luie",
    });
    mocked.projectFindUnique.mockResolvedValue({
      title: "project",
      projectPath: "/tmp/project.luie",
    });
    mocked.renameSnapshotDirectoryForProjectTitleChange.mockResolvedValue(undefined);
  });

  it("preserves VALIDATION_FAILED on create", async () => {
    mocked.normalizeProjectPath.mockImplementationOnce(() => {
      throw new ServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Invalid project path",
      );
    });

    const service = new ProjectService();

    await expect(
      service.createProject({
        title: "Invalid Path",
        projectPath: "relative/path.luie",
      }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
  });

  it("preserves VALIDATION_FAILED on update", async () => {
    mocked.normalizeProjectPath.mockImplementationOnce(() => {
      throw new ServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Invalid project path",
      );
    });

    const service = new ProjectService();

    await expect(
      service.updateProject({
        id: "project-1",
        projectPath: "relative/path.luie",
      }),
    ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
  });
});
