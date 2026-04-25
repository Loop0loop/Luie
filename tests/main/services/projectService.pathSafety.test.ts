// TEST_LEVEL: UNIT_MOCKED
// PROVES: path-safety branching in project update logic with mocked DB/logger/settings dependencies
// DOES_NOT_PROVE: real database persistence or filesystem durability

import { promises as fs } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
  const settingsManager = {
    getSyncSettings: vi.fn(() => ({})),
    setSyncSettings: vi.fn(),
    getAll: vi.fn(() => ({ snapshotExportLimit: 10 })),
  };

  return {
    logger,
    settingsManager,
  };
});

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    getDrizzleClient: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(async () => [{ title: "Old Project", projectPath: "/tmp/old-project.luie" }]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      returning: vi.fn(async () => [{ id: "project-1", title: "New Project", projectPath: "relative/unsafe-path.luie" }]),
    })),
  },
}));

vi.mock("../../../src/main/manager/settingsManager.js", () => ({
  settingsManager: mocked.settingsManager,
}));

vi.mock("../../../src/shared/logger/index.js", () => ({
  createLogger: vi.fn(() => mocked.logger),
}));

describe("ProjectService path safety", () => {
  beforeEach(() => {
    mocked.logger.info.mockClear();
    mocked.logger.warn.mockClear();
    mocked.logger.error.mockClear();
    mocked.logger.debug.mockClear();
    mocked.settingsManager.getSyncSettings.mockClear();
    mocked.settingsManager.setSyncSettings.mockClear();
    mocked.settingsManager.getAll.mockClear();
  });

  it("checks snapshot directory existence but skips rename for relative .luie path", async () => {
    const statSpy = vi.spyOn(fs, "stat");
    const mkdirSpy = vi.spyOn(fs, "mkdir");
    const renameSpy = vi.spyOn(fs, "rename");

    const { ProjectService } = await import("../../../src/main/services/core/projectService.js");
    const service = new ProjectService();
    const scheduleSpy = vi.spyOn(service, "schedulePackageExport").mockImplementation(() => {});

    const updated = await service.updateProject({
      id: "project-1",
      title: "New Project",
    });

    expect(updated.title).toBe("New Project");
    expect(statSpy).toHaveBeenCalledTimes(1);
    expect(mkdirSpy).not.toHaveBeenCalled();
    expect(renameSpy).not.toHaveBeenCalled();
    expect(scheduleSpy).toHaveBeenCalledWith("project-1", "project:update");
  });
});
