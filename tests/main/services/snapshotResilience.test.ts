import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "node:path";
import { promises as fs } from "node:fs";
import { app } from "electron";
import { db } from "../../../src/main/database/index.js";
import { projectService } from "../../../src/main/services/core/projectService.js";
import { chapterService } from "../../../src/main/services/core/chapterService.js";
import { snapshotService } from "../../../src/main/services/features/snapshotService.js";
import { autoSaveManager } from "../../../src/main/manager/autoSaveManager.js";
import { readFullSnapshotArtifact } from "../../../src/main/services/features/snapshotArtifacts.js";
import {
  SNAPSHOT_MIRROR_DIR,
  SNAPSHOT_BACKUP_DIR,
  LUIE_SNAPSHOTS_DIR,
} from "../../../src/shared/constants/index.js";

const makeContent = (length: number) => "가".repeat(length);

const createProject = async (title = "Test Project") => {
  const projectPath = path.join(app.getPath("userData"), `${title}.luie`);
  const project = await projectService.createProject({
    title,
    description: "",
    projectPath,
  });
  return { project, projectPath };
};

describe("Snapshot resilience", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("creates autosave mirrors for 200..1000 chars and blocks empty overwrite", async () => {
    const { project } = await createProject("Mirror Project");

    const chapters = [] as Array<{ id: string; len: number }>;
    for (const len of [200, 400, 600, 800, 1000]) {
      const chapter = await chapterService.createChapter({
        projectId: project.id,
        title: `Chapter ${len}`,
      });
      chapters.push({ id: chapter.id, len });
    }

    autoSaveManager.setConfig(project.id, {
      enabled: true,
      interval: 1000,
      debounceMs: 1,
    });

    vi.useFakeTimers();
    for (const ch of chapters) {
      await autoSaveManager.triggerSave(ch.id, makeContent(ch.len), project.id);
    }
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    for (const ch of chapters) {
      const latestPath = path.join(
        app.getPath("userData"),
        SNAPSHOT_MIRROR_DIR,
        project.id,
        ch.id,
        "latest.snap",
      );
      const stat = await fs.stat(latestPath);
      expect(stat.isFile()).toBe(true);
    }

    await expect(
      chapterService.updateChapter({ id: chapters[0].id, content: "" }),
    ).rejects.toBeTruthy();
  });

  it("flushCritical writes mirrors and snapshots on forced quit", async () => {
    const { project } = await createProject("Forced Quit Project");
    const chapter = await chapterService.createChapter({
      projectId: project.id,
      title: "Crash Chapter",
    });

    autoSaveManager.setConfig(project.id, {
      enabled: true,
      interval: 1000,
      debounceMs: 1000,
    });

    await autoSaveManager.triggerSave(chapter.id, makeContent(800), project.id);

    const result = await autoSaveManager.flushCritical();
    expect(result.mirrored).toBeGreaterThan(0);
    expect(result.snapshots).toBeGreaterThan(0);

    const latestPath = path.join(
      app.getPath("userData"),
      SNAPSHOT_MIRROR_DIR,
      project.id,
      chapter.id,
      "latest.snap",
    );
    const stat = await fs.stat(latestPath);
    expect(stat.isFile()).toBe(true);

    const snapshots = await snapshotService.getSnapshotsByProject(project.id);
    expect(snapshots.length).toBeGreaterThan(0);
  });

  it("enables WAL mode", async () => {
    const client = db.getClient() as {
      $queryRawUnsafe?: (query: string) => Promise<Array<{ journal_mode?: string }>>;
      $executeRawUnsafe?: (query: string) => Promise<unknown>;
    };

    if (client.$queryRawUnsafe) {
      const result = await client.$queryRawUnsafe("PRAGMA journal_mode;");
      const mode = result?.[0]?.journal_mode;
      expect(String(mode).toLowerCase()).toBe("wal");
      return;
    }

    if (client.$executeRawUnsafe) {
      const result = await client.$executeRawUnsafe("PRAGMA journal_mode;");
      expect(result).toBeTruthy();
      return;
    }

    throw new Error("PRAGMA not available");
  });

  it("creates periodic project snapshots every 10 minutes", async () => {
    const { project } = await createProject("Scheduled Project");

    autoSaveManager.setConfig(project.id, {
      enabled: true,
      interval: 1000,
      debounceMs: 1,
    });

    vi.useFakeTimers();
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    vi.useRealTimers();

    const snapshots = await snapshotService.getSnapshotsByProject(project.id);
    expect(snapshots.length).toBeGreaterThan(0);
  });

  it("handles snapshot writes while chapter updates are racing", async () => {
    const { project } = await createProject("Race Project");
    const chapter = await chapterService.createChapter({
      projectId: project.id,
      title: "Race Chapter",
    });

    const updatePromises = Array.from({ length: 10 }).map((_, idx) =>
      chapterService.updateChapter({
        id: chapter.id,
        content: makeContent(600 + idx),
      }),
    );

    const snapshotPromise = snapshotService.createSnapshot({
      projectId: project.id,
      chapterId: chapter.id,
      content: makeContent(650),
      description: "Race snapshot",
    });

    await Promise.all([...updatePromises, snapshotPromise]);

    const safeProjectName = "Race Project";
    const backupDir = path.join(app.getPath("userData"), SNAPSHOT_BACKUP_DIR, safeProjectName);
    const files = (await fs.readdir(backupDir)).filter((name) => name.endsWith(".snap"));
    expect(files.length).toBeGreaterThan(0);

    const targetPath = path.join(backupDir, files.sort().pop() as string);
    const parsed = await readFullSnapshotArtifact(targetPath);
    expect(parsed.meta.projectId).toBe(project.id);
  });

  it("recreates snapshot folders after deletion", async () => {
    const { project, projectPath } = await createProject("Sabotage Project");
    const chapter = await chapterService.createChapter({
      projectId: project.id,
      title: "Sabotage Chapter",
    });

    const baseDir = path.dirname(projectPath);
    const snapshotsDir = path.join(baseDir, ".luie", LUIE_SNAPSHOTS_DIR);
    await fs.rm(snapshotsDir, { recursive: true, force: true });

    await snapshotService.createSnapshot({
      projectId: project.id,
      chapterId: chapter.id,
      content: makeContent(600),
      description: "Recreate folder",
    });

    const stat = await fs.stat(snapshotsDir);
    expect(stat.isDirectory()).toBe(true);
  });

  it("rejects corrupted snapshot restore", async () => {
    const { project } = await createProject("Corrupt Project");
    const chapter = await chapterService.createChapter({
      projectId: project.id,
      title: "Corrupt Chapter",
    });

    await snapshotService.createSnapshot({
      projectId: project.id,
      chapterId: chapter.id,
      content: makeContent(600),
      description: "Corrupt snapshot",
    });

    const backupDir = path.join(app.getPath("userData"), SNAPSHOT_BACKUP_DIR, "Corrupt Project");
    const files = (await fs.readdir(backupDir)).filter((name) => name.endsWith(".snap"));
    const targetPath = path.join(backupDir, files.sort().pop() as string);
    const raw = await fs.readFile(targetPath);

    raw[raw.length - 5] = 0x00;
    await fs.writeFile(targetPath, raw);

    await expect(snapshotService.importSnapshotFile(targetPath)).rejects.toBeTruthy();
  });

  it("survives disk-full/permission errors during snapshot write", async () => {
    const { project } = await createProject("Disk Project");
    const chapter = await chapterService.createChapter({
      projectId: project.id,
      title: "Disk Chapter",
    });

    const writeSpy = vi
      .spyOn(fs, "writeFile")
      .mockRejectedValueOnce(Object.assign(new Error("EACCES"), { code: "EACCES" }));

    await expect(
      snapshotService.createSnapshot({
        projectId: project.id,
        chapterId: chapter.id,
        content: makeContent(600),
        description: "Disk fail",
      }),
    ).rejects.toBeTruthy();

    writeSpy.mockRestore();
  });

  it("handles double instance snapshot writes", async () => {
    const { project } = await createProject("Double Project");
    const chapter = await chapterService.createChapter({
      projectId: project.id,
      title: "Double Chapter",
    });

    await Promise.all([
      snapshotService.createSnapshot({
        projectId: project.id,
        chapterId: chapter.id,
        content: "철수는 밥을 먹었다",
        description: "A",
      }),
      snapshotService.createSnapshot({
        projectId: project.id,
        chapterId: chapter.id,
        content: "철수는 빵을 먹었다",
        description: "B",
      }),
    ]);

    const snapshots = await snapshotService.getSnapshotsByProject(project.id);
    expect(snapshots.length).toBeGreaterThanOrEqual(2);
  });
});
