// TEST_LEVEL: REAL_DB_INTEGRATION
// PROVES: project service behavior against real SQLite/Drizzle state and attached .luie files
// DOES_NOT_PROVE: pure end-to-end app startup or renderer-side behavior

import { describe, it, expect, vi, beforeAll } from "vitest";
import path from "node:path";
import { promises as fs } from "node:fs";
import { app } from "electron";
import { eq } from "drizzle-orm";
import {
  ProjectService,
  projectService,
} from "../../../src/main/services/core/projectService.js";
import { db } from "../../../src/main/database/index.js";
import * as schema from "../../../src/main/database/schema/index.js";
import { ErrorCode } from "../../../src/shared/constants/errorCode.js";
import {
  probeLuieContainer,
  readLuieContainerEntry,
  writeLuieContainer,
} from "../../../src/main/services/io/luieContainer.js";
import {
  makeExactMixedByteText,
  makeMixedNarrativeText,
} from "../luieFixtures.js";

const localProjectService = new ProjectService();

beforeAll(() => {
  vi.spyOn(projectService, "schedulePackageExport").mockImplementation(
    () => {},
  );
  vi.spyOn(localProjectService, "schedulePackageExport").mockImplementation(
    () => {},
  );
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
    await expect(
      localProjectService.getProject(created.id as string),
    ).rejects.toBeDefined();
  });

  it("reuses drizzle client (db cache)", async () => {
    const clientA = db.getClient();
    const clientB = db.getClient();
    expect(clientA).toBe(clientB);
  });

  it("reinitializes drizzle client after disconnect", async () => {
    const clientBeforeDisconnect = db.getClient();

    await db.disconnect();
    await db.initialize();

    const clientAfterReconnect = db.getClient();
    expect(clientAfterReconnect).not.toBe(clientBeforeDisconnect);
    const projectCount = await clientAfterReconnect
      .select({ id: schema.project.id })
      .from(schema.project);
    expect(typeof projectCount.length).toBe("number");
  });

  it("recovers .luie from db when package is corrupted", async () => {
    const projectPath = path.join(
      app.getPath("userData"),
      "Recovery Project.luie",
    );
    const created = await localProjectService.createProject({
      title: "Recovery Project",
      description: "test",
      projectPath,
    });

    await fs.writeFile(projectPath, "not-a-sqlite", "utf-8");

    const result = await localProjectService.openLuieProject(projectPath);
    expect(result.recovery).toBe(true);
    expect((result.project as { id: string }).id).toBe(created.id);
  });

  it("fails open when a legacy .luie directory package is attached without deleting existing db data", async () => {
    const projectPath = path.join(
      app.getPath("userData"),
      "Invalid Import Project.luie",
    );
    await fs.rm(projectPath, { recursive: true, force: true });

    const created = await localProjectService.createProject({
      title: "Invalid Import Project",
      description: "test",
      projectPath,
    });
    const projectId = String(created.id);

    const protectedCharacterId = `protected-char-${Date.now()}`;
    await db.getClient().insert(schema.character).values({
      id: protectedCharacterId,
      projectId,
      name: "Protected Character",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
    await fs.writeFile(
      path.join(projectPath, "manuscript", "chapter-1.md"),
      "# chapter",
      "utf-8",
    );
    await fs.writeFile(
      path.join(projectPath, "world", "characters.json"),
      "{ invalid json",
      "utf-8",
    );
    await fs.writeFile(
      path.join(projectPath, "world", "terms.json"),
      JSON.stringify({ terms: [] }),
      "utf-8",
    );
    await fs.writeFile(
      path.join(projectPath, "world", "synopsis.json"),
      JSON.stringify({ synopsis: "", status: "draft" }),
      "utf-8",
    );
    await fs.writeFile(
      path.join(projectPath, "world", "graph.json"),
      JSON.stringify({ nodes: [], edges: [] }),
      "utf-8",
    );
    await fs.writeFile(
      path.join(projectPath, "snapshots", "index.json"),
      JSON.stringify({ snapshots: [] }),
      "utf-8",
    );

    await expect(
      localProjectService.openLuieProject(projectPath),
    ).rejects.toBeDefined();

    const protectedCharacter = await db
      .getClient()
      .select({ id: schema.character.id })
      .from(schema.character)
      .where(eq(schema.character.id, protectedCharacterId))
      .limit(1);
    expect(protectedCharacter[0]?.id).toBe(protectedCharacterId);

    await localProjectService.deleteProject(projectId);
    await fs.rm(projectPath, { recursive: true, force: true });
  });

  it.each([5_000, 100_000, 1_000_000, 2_000_000, 5_000_000])(
    "keeps readable world docs when one sqlite-backed .luie world file read fails during export for %i chars",
    async (length) => {
      const projectPath = path.join(
        app.getPath("userData"),
        `Partial World Export ${length}.luie`,
      );
      await fs.rm(projectPath, { recursive: true, force: true });

      const created = await localProjectService.createProject({
        title: `Partial World Export ${length}`,
        projectPath,
      });
      const projectId = String(created.id);
      const synopsis = makeMixedNarrativeText(length, 0);
      const unreadablePlot = makeExactMixedByteText(5 * 1024 * 1024 + 1);
      const logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      await writeLuieContainer({
        targetPath: projectPath,
        payload: {
          meta: {
            projectId,
            title: `Partial World Export ${length}`,
          },
          chapters: [],
          characters: [],
          terms: [],
          synopsis: {
            synopsis,
            status: "working",
          },
          plot: {
            columns: [
              {
                id: "plot-col",
                title: unreadablePlot,
                cards: [],
              },
            ],
          },
          drawing: { paths: [] },
          mindmap: { nodes: [], edges: [] },
          memos: { memos: [] },
          graph: { nodes: [], edges: [] },
          snapshots: [],
        },
        logger,
      });

      await localProjectService.exportProjectPackage(projectId);

      const probe = await probeLuieContainer(projectPath);
      expect(probe).toMatchObject({
        exists: true,
        kind: "sqlite-v2",
        layout: "file",
      });

      const synopsisRaw = await readLuieContainerEntry(
        projectPath,
        "world/synopsis.json",
        logger,
      );
      expect(synopsisRaw).not.toBeNull();
      expect(JSON.parse(synopsisRaw ?? "{}")).toMatchObject({
        synopsis,
        status: "working",
      });

      await expect(fs.access(`${projectPath}-wal`)).rejects.toThrow();
      await expect(fs.access(`${projectPath}-shm`)).rejects.toThrow();

      await localProjectService.deleteProject(projectId);
      await fs.rm(projectPath, { recursive: true, force: true });
    },
  );

  it("rejects invalid projectPath on create and update", async () => {
    await expect(
      localProjectService.createProject({
        title: "Invalid Path",
        description: "test",
        projectPath: "relative/path.luie",
      }),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_INPUT });

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
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_INPUT });

    await expect(
      localProjectService.openLuieProject("relative/open-target.luie"),
    ).rejects.toBeDefined();

    await localProjectService.deleteProject(created.id as string);
  });

  it("skips package export when projectPath in DB is a relative .luie path", async () => {
    const validPath = path.join(
      app.getPath("userData"),
      "relative-export-skip.luie",
    );
    const created = await localProjectService.createProject({
      title: "Relative Export Skip",
      description: "test",
      projectPath: validPath,
    });

    await db
      .getClient()
      .update(schema.project)
      .set({ projectPath: null })
      .where(eq(schema.project.id, created.id as string));
    const now1 = new Date().toISOString();
    await db
      .getClient()
      .insert(schema.projectAttachment)
      .values({
        projectId: created.id as string,
        projectPath: "relative/unsafe.luie",
        updatedAt: now1,
      })
      .onConflictDoUpdate({
        target: schema.projectAttachment.projectId,
        set: {
          projectPath: "relative/unsafe.luie",
          updatedAt: now1,
        },
      });

    await expect(
      localProjectService.exportProjectPackage(created.id as string),
    ).resolves.toBe(false);

    await localProjectService.deleteProject(created.id as string);
  });

  it("marks invalid attachment state when DB has relative .luie projectPath", async () => {
    const validPath = path.join(
      app.getPath("userData"),
      "relative-path-missing.luie",
    );
    const created = await localProjectService.createProject({
      title: "Relative Path Missing",
      description: "test",
      projectPath: validPath,
    });

    await db
      .getClient()
      .update(schema.project)
      .set({ projectPath: null })
      .where(eq(schema.project.id, created.id as string));
    const now2 = new Date().toISOString();
    await db
      .getClient()
      .insert(schema.projectAttachment)
      .values({
        projectId: created.id as string,
        projectPath: "relative/unsafe.luie",
        updatedAt: now2,
      })
      .onConflictDoUpdate({
        target: schema.projectAttachment.projectId,
        set: {
          projectPath: "relative/unsafe.luie",
          updatedAt: now2,
        },
      });

    const all = await localProjectService.getAllProjects();
    const target = all.find((project) => project.id === created.id);
    expect(target).toBeDefined();
    expect(target?.attachmentStatus).toBe("invalid-attachment");
    expect(target?.pathMissing).toBe(true);

    await localProjectService.deleteProject(created.id as string);
  });

  it("marks detached when project has no local attachment", async () => {
    const created = await localProjectService.createProject({
      title: "Detached Project",
      description: "test",
    });

    const all = await localProjectService.getAllProjects();
    const target = all.find((project) => project.id === created.id);
    expect(target).toBeDefined();
    expect(target?.attachmentStatus).toBe("detached");
    expect(target?.pathMissing).toBe(false);

    await localProjectService.deleteProject(created.id as string);
  });

  it("reconciles duplicate absolute project paths and leaves one survivor", async () => {
    const sharedPath = path.join(
      app.getPath("userData"),
      "duplicate-path-target.luie",
    );
    const first = await localProjectService.createProject({
      title: "Duplicate Path A",
      projectPath: path.join(app.getPath("userData"), "duplicate-path-a.luie"),
    });
    const second = await localProjectService.createProject({
      title: "Duplicate Path B",
      projectPath: path.join(app.getPath("userData"), "duplicate-path-b.luie"),
    });
    const third = await localProjectService.createProject({
      title: "Duplicate Path C",
      projectPath: path.join(app.getPath("userData"), "duplicate-path-c.luie"),
    });

    await db
      .getClient()
      .delete(schema.projectAttachment)
      .where(eq(schema.projectAttachment.projectId, String(first.id)));
    await db
      .getClient()
      .delete(schema.projectAttachment)
      .where(eq(schema.projectAttachment.projectId, String(second.id)));
    await db
      .getClient()
      .delete(schema.projectAttachment)
      .where(eq(schema.projectAttachment.projectId, String(third.id)));
    const now3 = new Date().toISOString();
    await db
      .getClient()
      .update(schema.project)
      .set({ projectPath: sharedPath, updatedAt: now3 })
      .where(eq(schema.project.id, String(first.id)));
    await db
      .getClient()
      .update(schema.project)
      .set({ projectPath: sharedPath, updatedAt: now3 })
      .where(eq(schema.project.id, String(second.id)));
    await db
      .getClient()
      .update(schema.project)
      .set({ projectPath: sharedPath, updatedAt: now3 })
      .where(eq(schema.project.id, String(third.id)));

    const reconciliation =
      await localProjectService.reconcileProjectPathDuplicates();
    expect(reconciliation.duplicateGroups).toBe(1);
    expect(reconciliation.clearedRecords).toBe(2);

    const survivors = (await localProjectService.getAllProjects()).filter(
      (project) =>
        [String(first.id), String(second.id), String(third.id)].includes(
          String(project.id),
        ),
    );

    expect(
      survivors.filter((project) => project.projectPath === sharedPath),
    ).toHaveLength(1);
    expect(
      survivors.filter((project) => project.projectPath === null),
    ).toHaveLength(2);

    await Promise.all([
      localProjectService.deleteProject(String(first.id)),
      localProjectService.deleteProject(String(second.id)),
      localProjectService.deleteProject(String(third.id)),
    ]);
  });
});
