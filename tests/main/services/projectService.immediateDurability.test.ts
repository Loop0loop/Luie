// TEST_LEVEL: UNIT_MOCKED
// PROVES: immediate-export policy 분기와 retry 결정
// DOES_NOT_PROVE: disk의 실제 .luie file durability

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  listProjectsNeedingExport: vi.fn(async (): Promise<string[]> => []),
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
    listProjectsNeedingExport: mocked.listProjectsNeedingExport,
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
    mocked.attachmentPath
      .mockReset()
      .mockResolvedValue("/tmp/project-1.luie");
    mocked.exportProjectPackage.mockReset().mockResolvedValue(true);
    mocked.getProjectRevisionState.mockReset().mockResolvedValue({
      revision: 1,
      exportedRevision: 0,
    });
    mocked.markProjectExported.mockReset().mockResolvedValue(undefined);
    mocked.listProjectsNeedingExport.mockReset().mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("does not queue a timer retry when immediate export throws", async () => {
    vi.useFakeTimers();
    const service = new ProjectService();
    const diskError = new Error("disk failure");
    mocked.exportProjectPackage
      .mockRejectedValueOnce(diskError)
      .mockResolvedValueOnce(true);
    const scheduleSpy = vi.spyOn(service, "schedulePackageExport");

    const result = await service.attemptImmediatePackageExport(
      "project-1",
      "chapter:update",
    );

    expect(result).toMatchObject({
      exported: false,
      error: expect.any(Error),
    });
    expect(result.error).toBe(diskError);
    expect(scheduleSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(mocked.exportProjectPackage).toHaveBeenCalledOnce();

    await expect(service.flushPendingExports()).resolves.toMatchObject({
      total: 1,
      flushed: 1,
      failed: 0,
    });
    expect(mocked.exportProjectPackage).toHaveBeenCalledTimes(2);
  });

  it("does not queue a timer retry when immediate export returns false", async () => {
    vi.useFakeTimers();
    const service = new ProjectService();
    mocked.exportProjectPackage
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const scheduleSpy = vi.spyOn(service, "schedulePackageExport");

    await expect(
      service.attemptImmediatePackageExport("project-1", "chapter:update"),
    ).resolves.toMatchObject({ exported: false, error: expect.any(Error) });

    expect(scheduleSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(mocked.exportProjectPackage).toHaveBeenCalledOnce();

    await expect(service.flushPendingExports()).resolves.toMatchObject({
      total: 1,
      flushed: 1,
      failed: 0,
    });
    expect(mocked.exportProjectPackage).toHaveBeenCalledTimes(2);
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

    expect(scheduleSpy).not.toHaveBeenCalled();
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

  it("retries failed startup recovery only through an explicit flush", async () => {
    vi.useFakeTimers();
    mocked.listProjectsNeedingExport.mockResolvedValue(["project-1"]);
    mocked.exportProjectPackage
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const service = new ProjectService();

    await expect(service.scheduleStalePackageExports()).resolves.toBe(1);
    expect(mocked.exportProjectPackage).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1_500);
    expect(mocked.exportProjectPackage).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(mocked.exportProjectPackage).toHaveBeenCalledOnce();
    expect(mocked.markProjectExported).not.toHaveBeenCalled();

    await expect(service.flushPendingExports()).resolves.toMatchObject({
      total: 1,
      flushed: 1,
      failed: 0,
      timedOut: false,
    });
    expect(mocked.exportProjectPackage).toHaveBeenCalledTimes(2);
    expect(mocked.markProjectExported).toHaveBeenCalledWith("project-1", 1);
  });

  it("returns local-save success for a missing project before revision lookup", async () => {
    mocked.attachmentPath.mockResolvedValue(null);
    mocked.getProjectRevisionState.mockRejectedValue(
      new Error("project not found"),
    );
    const service = new ProjectService();

    await expect(
      service.exportProjectPackageNow("missing-project", "manual-save"),
    ).resolves.toBe(true);
    expect(mocked.getProjectRevisionState).not.toHaveBeenCalled();
    expect(mocked.exportProjectPackage).not.toHaveBeenCalled();
    expect(mocked.markProjectExported).not.toHaveBeenCalled();
    await expect(service.flushPendingExports()).resolves.toMatchObject({
      total: 0,
    });
  });
});
