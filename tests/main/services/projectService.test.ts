import { describe, it, expect, vi, beforeAll } from "vitest";
import path from "node:path";
import { promises as fs } from "node:fs";
import { app } from "electron";
import { ProjectService, projectService } from "../../../src/main/services/core/projectService.js";
import { db } from "../../../src/main/database/index.js";

const localProjectService = new ProjectService();

beforeAll(() => {
  vi.spyOn(projectService, "schedulePackageExport").mockImplementation(() => {});
  vi.spyOn(localProjectService, "schedulePackageExport").mockImplementation(() => {});
});

describe("ProjectService", () => {
  it("supports CRUD", async () => {
    const created = await localProjectService.createProject({
      title: "CRUD Project",
      description: "test",
      projectPath: "/tmp/crud.luie",
    });

    const fetched = await localProjectService.getProject(created.id as string);
    expect(fetched.title).toBe("CRUD Project");

    const updated = await localProjectService.updateProject({
      id: created.id as string,
      title: "CRUD Project Updated",
    });
    expect(updated.title).toBe("CRUD Project Updated");

    await localProjectService.deleteProject(created.id as string);
    await expect(localProjectService.getProject(created.id as string)).rejects.toBeDefined();
  });

  it("reuses prisma client (db cache)", async () => {
    const clientA = db.getClient();
    const clientB = db.getClient();
    expect(clientA).toBe(clientB);
  });

  it("recovers .luie from db when package is corrupted", async () => {
    const projectPath = path.join(app.getPath("userData"), "Recovery Project.luie");
    const created = await localProjectService.createProject({
      title: "Recovery Project",
      description: "test",
      projectPath,
    });

    await fs.writeFile(projectPath, "not-a-zip", "utf-8");

    const result = await localProjectService.openLuieProject(projectPath);
    expect(result.recovery).toBe(true);
    expect(result.project.id).toBe(created.id);
  });

  it("rejects invalid projectPath on create and update", async () => {
    await expect(
      localProjectService.createProject({
        title: "Invalid Path",
        description: "test",
        projectPath: "relative/path.luie",
      }),
    ).rejects.toBeDefined();

    const created = await localProjectService.createProject({
      title: "Valid Path",
      description: "test",
      projectPath: path.join(app.getPath("userData"), "valid-path.luie"),
    });

    await expect(
      localProjectService.updateProject({
        id: created.id as string,
        projectPath: "relative/updated.luie",
      }),
    ).rejects.toBeDefined();

    await localProjectService.deleteProject(created.id as string);
  });
});
