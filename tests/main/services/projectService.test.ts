import { describe, it, expect, vi, beforeAll } from "vitest";
import path from "node:path";
import { promises as fs } from "node:fs";
import { app } from "electron";
import { ProjectService, projectService } from "../../../src/main/services/core/projectService.js";
import { db } from "../../../src/main/database/index.js";
import { readLuieEntry } from "../../../src/main/utils/luiePackage.js";

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

  it("reinitializes prisma client after disconnect", async () => {
    const clientBeforeDisconnect = db.getClient();

    await db.disconnect();
    await db.initialize();

    const clientAfterReconnect = db.getClient();
    expect(clientAfterReconnect).not.toBe(clientBeforeDisconnect);
    const projectCount = await clientAfterReconnect.project.count();
    expect(typeof projectCount).toBe("number");
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

  it("fails open when .luie world documents are invalid without deleting existing db data", async () => {
    const projectPath = path.join(app.getPath("userData"), "Invalid Import Project.luie");
    await fs.rm(projectPath, { recursive: true, force: true });

    const created = await localProjectService.createProject({
      title: "Invalid Import Project",
      description: "test",
      projectPath,
    });
    const projectId = String(created.id);

    const protectedCharacterId = `protected-char-${Date.now()}`;
    await db.getClient().character.create({
      data: {
        id: protectedCharacterId,
        projectId,
        name: "Protected Character",
      },
    });

    await fs.mkdir(path.join(projectPath, "manuscript"), { recursive: true });
    await fs.mkdir(path.join(projectPath, "world"), { recursive: true });
    await fs.mkdir(path.join(projectPath, "snapshots"), { recursive: true });

    await fs.writeFile(
      path.join(projectPath, "meta.json"),
      JSON.stringify(
        {
          format: "luie",
          version: 1,
          projectId,
          title: "Invalid Import Project",
          chapters: [
            {
              id: "chapter-1",
              title: "Chapter 1",
              order: 1,
              file: "manuscript/chapter-1.md",
            },
          ],
        },
        null,
        2,
      ),
      "utf-8",
    );
    await fs.writeFile(path.join(projectPath, "manuscript", "chapter-1.md"), "# chapter", "utf-8");
    await fs.writeFile(path.join(projectPath, "world", "characters.json"), "{ invalid json", "utf-8");
    await fs.writeFile(path.join(projectPath, "world", "terms.json"), JSON.stringify({ terms: [] }), "utf-8");
    await fs.writeFile(
      path.join(projectPath, "world", "synopsis.json"),
      JSON.stringify({ synopsis: "", status: "draft" }),
      "utf-8",
    );
    await fs.writeFile(path.join(projectPath, "world", "graph.json"), JSON.stringify({ nodes: [], edges: [] }), "utf-8");
    await fs.writeFile(path.join(projectPath, "snapshots", "index.json"), JSON.stringify({ snapshots: [] }), "utf-8");

    await expect(localProjectService.openLuieProject(projectPath)).rejects.toBeDefined();

    const protectedCharacter = await db.getClient().character.findUnique({
      where: { id: protectedCharacterId },
      select: { id: true },
    });
    expect(protectedCharacter?.id).toBe(protectedCharacterId);

    await localProjectService.deleteProject(projectId);
    await fs.rm(projectPath, { recursive: true, force: true });
  });

  it("keeps readable world docs when one .luie world file read fails during export", async () => {
    const projectPath = path.join(app.getPath("userData"), "Partial World Export.luie");
    await fs.rm(projectPath, { recursive: true, force: true });

    const created = await localProjectService.createProject({
      title: "Partial World Export",
      projectPath,
    });
    const projectId = String(created.id);

    await fs.mkdir(path.join(projectPath, "world"), { recursive: true });
    await fs.writeFile(
      path.join(projectPath, "world", "synopsis.json"),
      JSON.stringify({ synopsis: "keep this synopsis", status: "working" }, null, 2),
      "utf-8",
    );
    await fs.writeFile(
      path.join(projectPath, "world", "plot.json"),
      "x".repeat(5 * 1024 * 1024 + 16),
      "utf-8",
    );

    await localProjectService.exportProjectPackage(projectId);

    const synopsisRaw = await readLuieEntry(projectPath, "world/synopsis.json");
    expect(synopsisRaw).not.toBeNull();
    expect(JSON.parse(synopsisRaw ?? "{}")).toMatchObject({
      synopsis: "keep this synopsis",
      status: "working",
    });

    await localProjectService.deleteProject(projectId);
    await fs.rm(projectPath, { recursive: true, force: true });
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

    await expect(localProjectService.openLuieProject("relative/open-target.luie")).rejects.toBeDefined();

    await localProjectService.deleteProject(created.id as string);
  });

  it("skips package export when projectPath in DB is a relative .luie path", async () => {
    const validPath = path.join(app.getPath("userData"), "relative-export-skip.luie");
    const created = await localProjectService.createProject({
      title: "Relative Export Skip",
      description: "test",
      projectPath: validPath,
    });

    await db.getClient().project.update({
      where: { id: created.id as string },
      data: { projectPath: "relative/unsafe.luie" },
    });

    await expect(
      localProjectService.exportProjectPackage(created.id as string),
    ).resolves.toBeUndefined();

    await localProjectService.deleteProject(created.id as string);
  });

  it("marks pathMissing when DB has relative .luie projectPath", async () => {
    const validPath = path.join(app.getPath("userData"), "relative-path-missing.luie");
    const created = await localProjectService.createProject({
      title: "Relative Path Missing",
      description: "test",
      projectPath: validPath,
    });

    await db.getClient().project.update({
      where: { id: created.id as string },
      data: { projectPath: "relative/unsafe.luie" },
    });

    const all = await localProjectService.getAllProjects();
    const target = all.find((project) => project.id === created.id);
    expect(target).toBeDefined();
    expect(target?.pathMissing).toBe(true);

    await localProjectService.deleteProject(created.id as string);
  });
});
