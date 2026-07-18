// TEST_LEVEL: UNIT_MOCKED
// PROVES: immediate-export policy branching and retry decisions
// DOES_NOT_PROVE: actual .luie file durability on disk

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  attachmentPath: vi.fn(
    async (): Promise<string | null> => "/tmp/project-1.luie",
  ),
  exportProjectPackage: vi.fn(async () => true),
  getProjectRevisionState: vi.fn(async () => ({
    revision: 1,
    exportedRevision: 0,
  })),
  markProjectExported: vi.fn(async () => undefined),
}));

vi.mock(
  "../../../src/main/services/core/project/projectAttachmentStore.js",
  () => ({
    getProjectAttachmentPath: mocked.attachmentPath,
  }),
);

vi.mock(
  "../../../src/main/services/core/project/projectRevisionStore.js",
  () => ({
    getProjectRevisionState: mocked.getProjectRevisionState,
    markProjectExported: mocked.markProjectExported,
    listProjectsNeedingExport: vi.fn(async () => []),
  }),
);

vi.mock(
  "../../../src/main/services/core/project/projectExportEngine.js",
  () => ({
    exportProjectPackageWithOptions: mocked.exportProjectPackage,
  }),
);

import { ProjectService } from "../../../src/main/services/features/project/projectService.js";

describe("ProjectService immediate package durability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.attachmentPath.mockResolvedValue("/tmp/project-1.luie");
    mocked.exportProjectPackage.mockResolvedValue(true);
    mocked.getProjectRevisionState.mockResolvedValue({
      revision: 1,
      exportedRevision: 0,
    });
  });

  it("returns exported=true without queueing a retry when immediate export succeeds", async () => {
    const service = new ProjectService();
    const checkpointSpy = vi
      .spyOn(service, "checkpointProject")
      .mockResolvedValue(true);
    const scheduleSpy = vi
      .spyOn(service, "schedulePackageExport")
      .mockImplementation(() => {});

    await expect(
      service.attemptImmediatePackageExport("project-1", "chapter:update"),
    ).resolves.toEqual({ exported: true });

    expect(checkpointSpy).toHaveBeenCalledWith("project-1", "chapter:update");
    expect(scheduleSpy).not.toHaveBeenCalled();
  });

  it("queues a retry when immediate export fails", async () => {
    const service = new ProjectService();
    const diskError = new Error("disk failure");
    vi.spyOn(service, "exportProjectPackageNow").mockRejectedValue(diskError);
    const scheduleSpy = vi
      .spyOn(service, "schedulePackageExport")
      .mockImplementation(() => {});

    const result = await service.attemptImmediatePackageExport(
      "project-1",
      "chapter:update",
    );

    expect(result).toMatchObject({
      exported: false,
      error: diskError,
    });
    expect(scheduleSpy).toHaveBeenCalledWith(
      "project-1",
      "chapter:update:retry",
    );
  });

  it("throws when strict immediate export is required and export fails", async () => {
    const service = new ProjectService();
    const diskError = new Error("disk failure");
    vi.spyOn(service, "exportProjectPackageNow").mockRejectedValue(diskError);
    const scheduleSpy = vi
      .spyOn(service, "schedulePackageExport")
      .mockImplementation(() => {});

    await expect(
      service.ensureImmediatePackageExport("project-1", "manual-save"),
    ).rejects.toMatchObject({
      code: "FS_2002",
      message: "Failed to persist canonical .luie after mutation",
    });

    expect(scheduleSpy).toHaveBeenCalledWith(
      "project-1",
      "manual-save:retry",
    );
  });

  it("routes mutation persistence through centralized policy API", async () => {
    const service = new ProjectService();
    const immediateSpy = vi
      .spyOn(service, "attemptImmediatePackageExport")
      .mockResolvedValue({ exported: true });
    const scheduleSpy = vi
      .spyOn(service, "schedulePackageExport")
      .mockImplementation(() => {});

    await service.persistPackageAfterMutation("project-1", "manual-save");
    await service.persistPackageAfterMutation("project-1", "chapter:update");

    expect(immediateSpy).toHaveBeenCalledWith("project-1", "manual-save");
    expect(scheduleSpy).toHaveBeenCalledWith(
      "project-1",
      "chapter:update:debounced",
    );
  });

  it("skips immediate export when the project is not attached to a .luie package", async () => {
    mocked.attachmentPath.mockResolvedValueOnce(null);

    const service = new ProjectService();
    const exportSpy = vi
      .spyOn(service, "exportProjectPackageNow")
      .mockResolvedValue(true);

    await expect(
      service.attemptImmediatePackageExport("project-1", "chapter:update"),
    ).resolves.toMatchObject({
      exported: false,
      skipped: true,
    });
    expect(exportSpy).not.toHaveBeenCalled();
  });

  it.each([null, "/tmp/project.txt", "relative-project.luie"])(
    "treats unsupported attachment %s as a clean queue skip",
    async (attachmentPath) => {
      mocked.attachmentPath.mockResolvedValue(attachmentPath);
      const service = new ProjectService();

      service.schedulePackageExport("project-1", "detached-save");
      await expect(service.flushPendingExports()).resolves.toEqual({
        total: 1,
        flushed: 0,
        failed: 0,
        timedOut: false,
      });
      await expect(
        service.exportProjectPackageNow("project-1", "manual-save"),
      ).resolves.toBe(true);
      expect(mocked.exportProjectPackage).not.toHaveBeenCalled();
      expect(mocked.markProjectExported).not.toHaveBeenCalled();
    },
  );

  it("exports after a detached project receives a valid attachment", async () => {
    mocked.attachmentPath.mockResolvedValueOnce(null);
    const service = new ProjectService();

    service.schedulePackageExport("project-1", "detached-save");
    await expect(service.flushPendingExports()).resolves.toMatchObject({
      failed: 0,
    });

    mocked.attachmentPath.mockResolvedValue("/tmp/project-1.luie");
    service.schedulePackageExport("project-1", "character:update");
    await expect(service.flushPendingExports()).resolves.toMatchObject({
      total: 1,
      flushed: 1,
      failed: 0,
    });
    expect(mocked.exportProjectPackage).toHaveBeenCalledOnce();
    expect(mocked.markProjectExported).toHaveBeenCalledWith("project-1", 1);
  });
});
