// TEST_LEVEL: UNIT_MOCKED
// PROVES: immediate-export policy branching and retry decisions
// DOES_NOT_PROVE: actual .luie file durability on disk

import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/main/services/core/project/projectAttachmentStore.js", () => ({
  getProjectAttachmentPath: vi.fn(async () => "/tmp/project-1.luie"),
}));

import { ProjectService } from "../../../src/main/services/core/projectService.js";

describe("ProjectService immediate package durability", () => {
  it("returns exported=true without queueing a retry when immediate export succeeds", async () => {
    const service = new ProjectService();
    const exportSpy = vi
      .spyOn(service, "exportProjectPackageNow")
      .mockResolvedValue(true);
    const scheduleSpy = vi
      .spyOn(service, "schedulePackageExport")
      .mockImplementation(() => {});

    await expect(
      service.attemptImmediatePackageExport("project-1", "chapter:update"),
    ).resolves.toEqual({ exported: true });

    expect(exportSpy).toHaveBeenCalledWith("project-1", "chapter:update");
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
      service.ensureImmediatePackageExport("project-1", "chapter:create"),
    ).rejects.toMatchObject({
      code: "FS_2002",
      message: "Failed to persist canonical .luie after mutation",
    });

    expect(scheduleSpy).toHaveBeenCalledWith(
      "project-1",
      "chapter:create:retry",
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

    await service.persistPackageAfterMutation("project-1", "chapter:create");
    await service.persistPackageAfterMutation("project-1", "chapter:update");

    expect(immediateSpy).toHaveBeenCalledWith("project-1", "chapter:create");
    expect(scheduleSpy).toHaveBeenCalledWith(
      "project-1",
      "chapter:update:debounced",
    );
  });

  it("skips immediate export when the project is not attached to a .luie package", async () => {
    vi.mocked(
      await import("../../../src/main/services/core/project/projectAttachmentStore.js"),
    ).getProjectAttachmentPath.mockResolvedValueOnce(null);

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
});
