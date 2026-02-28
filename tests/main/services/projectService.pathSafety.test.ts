import { promises as fs } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const project = {
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  const db = {
    getClient: vi.fn(() => ({ project })),
  };
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
    db,
    project,
    logger,
    settingsManager,
  };
});

vi.mock("../../../src/main/database/index.js", () => ({
  db: mocked.db,
}));

vi.mock("../../../src/main/handler/system/ipcFsHandlers.js", () => ({
  writeLuiePackage: vi.fn(),
}));

vi.mock("../../../src/main/manager/settingsManager.js", () => ({
  settingsManager: mocked.settingsManager,
}));

vi.mock("../../../src/shared/logger/index.js", () => ({
  createLogger: vi.fn(() => mocked.logger),
}));

describe("ProjectService path safety", () => {
  beforeEach(() => {
    mocked.db.getClient.mockClear();
    mocked.project.findUnique.mockReset();
    mocked.project.update.mockReset();
    mocked.logger.info.mockClear();
    mocked.logger.warn.mockClear();
    mocked.logger.error.mockClear();
    mocked.logger.debug.mockClear();
    mocked.settingsManager.getSyncSettings.mockClear();
    mocked.settingsManager.setSyncSettings.mockClear();
    mocked.settingsManager.getAll.mockClear();
  });

  it("skips snapshot directory rename when DB projectPath is relative .luie path", async () => {
    mocked.project.findUnique.mockResolvedValue({
      title: "Old Project",
      projectPath: "/tmp/old-project.luie",
    });
    mocked.project.update.mockResolvedValue({
      id: "project-1",
      title: "New Project",
      description: null,
      projectPath: "relative/unsafe-path.luie",
    });

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
    expect(statSpy).not.toHaveBeenCalled();
    expect(mkdirSpy).not.toHaveBeenCalled();
    expect(renameSpy).not.toHaveBeenCalled();
    expect(scheduleSpy).toHaveBeenCalledWith("project-1", "project:update");
    expect(mocked.logger.warn).toHaveBeenCalled();
  });
});
