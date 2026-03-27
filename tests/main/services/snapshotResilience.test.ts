// TEST_LEVEL: REAL_DB_INTEGRATION
// PROVES: snapshot workflows through real DB, filesystem mirrors, and attached .luie persistence
// DOES_NOT_PROVE: isolated service branches without timing/state coupling

import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "node:path";
import { promises as fs } from "node:fs";
import { app } from "electron";
import { db } from "../../../src/main/database/index.js";
import { projectService } from "../../../src/main/services/core/projectService.js";
import { chapterService } from "../../../src/main/services/core/chapterService.js";
import { snapshotService } from "../../../src/main/services/features/snapshot/snapshotService.js";
import { autoSaveManager } from "../../../src/main/manager/autoSaveManager.js";
import * as snapshotArtifacts from "../../../src/main/services/features/snapshot/snapshotArtifacts.js";
import { probeLuieContainer } from "../../../src/main/services/io/luieContainer.js";
import {
  SNAPSHOT_MIRROR_DIR,
  SNAPSHOT_BACKUP_DIR,
  LUIE_SNAPSHOTS_DIR,
} from "../../../src/shared/constants/index.js";
import { makeMixedNarrativeText } from "../luieFixtures.js";

const expectNoWalSidecars = async (packagePath: string): Promise<void> => {
  await expect(fs.access(`${packagePath}-wal`)).rejects.toThrow();
  await expect(fs.access(`${packagePath}-shm`)).rejects.toThrow();
};

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

    const chapters = await Promise.all(
      [200, 400, 600, 800, 1000].map(async (len) => {
      const chapter = await chapterService.createChapter({
        projectId: project.id,
        title: `Chapter ${len}`,
      });
      await chapterService.updateChapter({
        id: chapter.id,
        content: makeMixedNarrativeText(len, len),
      });
      return { id: chapter.id, len };
    }),
  );

    autoSaveManager.setConfig(project.id, {
      enabled: true,
      interval: 1000,
      debounceMs: 1,
    });

    vi.useFakeTimers();
    await Promise.all(
      chapters.map((ch) =>
        autoSaveManager.triggerSave(
          ch.id,
          makeMixedNarrativeText(ch.len, ch.len),
          project.id,
        ),
      ),
    );
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    const stats = await Promise.all(
      chapters.map(async (ch) => {
        const latestPath = path.join(
          app.getPath("userData"),
          SNAPSHOT_MIRROR_DIR,
          project.id,
          ch.id,
          "latest.snap",
        );
        return fs.stat(latestPath);
      }),
    );
    for (const stat of stats) {
      expect(stat.isFile()).toBe(true);
    }

    await expect(
      chapterService.updateChapter({
        id: chapters[0].id,
        content: "",
      }),
    ).rejects.toMatchObject({
      code: "VAL_3001",
    });
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

    await autoSaveManager.triggerSave(
      chapter.id,
      makeMixedNarrativeText(800, 0),
      project.id,
    );

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

  it.each([5_000, 100_000, 1_000_000, 2_000_000, 5_000_000])(
    "keeps large snapshot artifacts recoverable for %i characters",
    async (length) => {
      const { project, projectPath } = await createProject(
        `Large Snapshot ${length}`,
      );
      const chapter = await chapterService.createChapter({
        projectId: project.id,
        title: `Large Chapter ${length}`,
      });
      const content = makeMixedNarrativeText(length, 1);

      const created = await snapshotService.createSnapshot({
        projectId: project.id,
        chapterId: chapter.id,
        content,
        description: `Large snapshot ${length}`,
      });

      const probe = await probeLuieContainer(projectPath);
      expect(probe).toMatchObject({
        exists: true,
        kind: "sqlite-v2",
        layout: "file",
      });

      const candidates = await snapshotService.listRestoreCandidates();
      const candidate = candidates.find(
        (entry) => entry.projectId === project.id,
      );
      expect(candidate).toBeDefined();

      const parsed = await snapshotArtifacts.readFullSnapshotArtifact(
        candidate?.filePath ?? "",
      );
      expect(parsed.meta.projectId).toBe(project.id);
      expect(parsed.meta.snapshotId).toBe(created.id);
      expect(parsed.data.focus?.content).toBe(content);
      expect(parsed.data.focus?.content?.length).toBe(length);
      await expectNoWalSidecars(projectPath);
    },
  );

  it("enables WAL mode", async () => {
    const client = db.getClient() as {
      $queryRawUnsafe?: (
        query: string,
      ) => Promise<Array<{ journal_mode?: string }>>;
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
    const chapter = await chapterService.createChapter({
      projectId: project.id,
      title: "Scheduled Chapter",
    });
    await autoSaveManager.triggerSave(
      chapter.id,
      makeMixedNarrativeText(900, 2),
      project.id,
    );
    const createSnapshotSpy = vi
      .spyOn(snapshotService, "createSnapshot")
      .mockResolvedValue(undefined as never);

    autoSaveManager.setConfig(project.id, {
      enabled: true,
      interval: 1000,
      debounceMs: 1,
    });

    vi.useFakeTimers();
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    expect(createSnapshotSpy).toHaveBeenCalled();
    createSnapshotSpy.mockRestore();
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
        content: makeMixedNarrativeText(600 + idx, idx),
      }),
    );

    const snapshotPromise = snapshotService.createSnapshot({
      projectId: project.id,
      chapterId: chapter.id,
      content: makeMixedNarrativeText(650, 5),
      description: "Race snapshot",
    });

    await Promise.all([...updatePromises, snapshotPromise]);

    const safeProjectName = "Race Project";
    const backupDir = path.join(
      app.getPath("userData"),
      SNAPSHOT_BACKUP_DIR,
      safeProjectName,
    );
    const files = (await fs.readdir(backupDir)).filter((name) =>
      name.endsWith(".snap"),
    );
    expect(files.length).toBeGreaterThan(0);

    const targetPath = path.join(backupDir, files.sort().pop() as string);
    const parsed = await snapshotArtifacts.readFullSnapshotArtifact(targetPath);
    expect(parsed.meta.projectId).toBe(project.id);
  });

  it("lists restore candidates with project and saved-time metadata", async () => {
    const { project } = await createProject("Restore Candidate Project");
    const chapter = await chapterService.createChapter({
      projectId: project.id,
      title: "Restore Chapter",
    });
    const content =
      "이 문단은 복원 후보 목록에서 어떤 저장분인지 확인하기 위한 테스트 문장입니다.";

    await snapshotService.createSnapshot({
      projectId: project.id,
      chapterId: chapter.id,
      content,
      description: "Restore candidate snapshot",
    });

    const candidates = await snapshotService.listRestoreCandidates();
    const matches = candidates.filter(
      (candidate) => candidate.projectId === project.id,
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      projectTitle: "Restore Candidate Project",
      chapterTitle: "Restore Chapter",
    });
    expect(matches[0]?.savedAt).toBeTruthy();
    expect(matches[0]?.excerpt).toContain(
      "어떤 저장분인지 확인하기 위한 테스트 문장",
    );
    await expect(fs.stat(matches[0]?.filePath as string)).resolves.toBeTruthy();
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
      content: makeMixedNarrativeText(600, 6),
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
      content: makeMixedNarrativeText(600, 7),
      description: "Corrupt snapshot",
    });

    const backupDir = path.join(
      app.getPath("userData"),
      SNAPSHOT_BACKUP_DIR,
      "Corrupt Project",
    );
    const files = (await fs.readdir(backupDir)).filter((name) =>
      name.endsWith(".snap"),
    );
    const targetPath = path.join(backupDir, files.sort().pop() as string);
    const raw = await fs.readFile(targetPath);

    raw[raw.length - 5] = 0x00;
    await fs.writeFile(targetPath, raw);

    await expect(
      snapshotService.importSnapshotFile(targetPath),
    ).rejects.toBeTruthy();
  });

  it("survives disk-full/permission errors during snapshot write", async () => {
    const { project } = await createProject("Disk Project");
    const chapter = await chapterService.createChapter({
      projectId: project.id,
      title: "Disk Chapter",
    });

    const writeSpy = vi
      .spyOn(snapshotArtifacts, "writeFullSnapshotArtifact")
      .mockRejectedValueOnce(
        Object.assign(new Error("EACCES"), { code: "EACCES" }),
      );

    await expect(
      snapshotService.createSnapshot({
        projectId: project.id,
        chapterId: chapter.id,
        content: makeMixedNarrativeText(600, 8),
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
