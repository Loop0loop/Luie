// TEST_LEVEL: UNIT_MOCKED
// PROVES: startup recovery schedules only projects with stale attached checkpoints

import { beforeEach, describe, expect, it, vi } from "vitest";

const revisionMocks = vi.hoisted(() => ({
  getProjectRevisionState: vi.fn(async () => ({
    revision: 0,
    exportedRevision: 0,
  })),
  listProjectsNeedingExport: vi.fn(async () => ["project-stale"]),
  markProjectExported: vi.fn(async () => undefined),
}));

vi.mock(
  "../../../src/main/services/core/project/projectRevisionStore.js",
  () => revisionMocks,
);

import { ProjectService } from "../../../src/main/services/features/project/projectService.js";

describe("ProjectService checkpoint recovery", () => {
  beforeEach(() => {
    revisionMocks.listProjectsNeedingExport.mockReset().mockResolvedValue([
      "project-stale",
    ]);
  });

  it("schedules only attached projects whose checkpoint is stale", async () => {
    const service = new ProjectService();
    const schedule = vi
      .spyOn(service, "schedulePackageExport")
      .mockImplementation(() => undefined);

    await expect(service.scheduleStalePackageExports()).resolves.toBe(1);

    expect(revisionMocks.listProjectsNeedingExport).toHaveBeenCalledOnce();
    expect(schedule).toHaveBeenCalledOnce();
    expect(schedule).toHaveBeenCalledWith("project-stale", "startup-recovery");
  });
});
