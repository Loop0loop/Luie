import { describe, expect, it, vi } from "vitest";
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
      service.ensureImmediatePackageExport("project-1", "chapter:update"),
    ).rejects.toMatchObject({
      code: "FS_2002",
      message: "Failed to persist canonical .luie after mutation",
    });

    expect(scheduleSpy).toHaveBeenCalledWith(
      "project-1",
      "chapter:update:retry",
    );
  });
});
