import { describe, it, expect, vi, beforeAll } from "vitest";
import { ProjectService, projectService } from "../../../src/main/services/projectService.js";
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
});
