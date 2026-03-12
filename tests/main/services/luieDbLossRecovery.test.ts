import path from "node:path";
import { promises as fs } from "node:fs";
import { app } from "electron";
import { describe, expect, it } from "vitest";
import { db } from "../../../src/main/database/index.js";
import { projectService } from "../../../src/main/services/core/projectService.js";
import { chapterService } from "../../../src/main/services/core/chapterService.js";
import { snapshotService } from "../../../src/main/services/features/snapshot/snapshotService.js";
import { readLuieContainerEntry } from "../../../src/main/services/io/luieContainer.js";

describe("`.luie` recovery after local DB loss", () => {
  it("reimports project content and snapshots from `.luie` after the sqlite replica is deleted", async () => {
    const projectPath = path.join(app.getPath("userData"), "db-loss-recovery.luie");
    await fs.rm(projectPath, { recursive: true, force: true });

    const project = await projectService.createProject({
      title: "DB Loss Recovery",
      description: "phase-6",
      projectPath,
    });

    const chapter = await chapterService.createChapter({
      projectId: project.id,
      title: "Recovered Chapter",
    });

    const chapterContent = "폭우가 내리던 밤, 기록은 .luie에 남았다.";
    await chapterService.updateChapter({
      id: chapter.id,
      content: chapterContent,
    });

    await snapshotService.createSnapshot({
      projectId: project.id,
      chapterId: chapter.id,
      content: chapterContent,
      description: "pre-loss snapshot",
    });

    await projectService.flushPendingExports();

    const snapshotIndexRaw = await readLuieContainerEntry(
      projectPath,
      "snapshots/index.json",
    );
    const snapshotIndex = JSON.parse(snapshotIndexRaw ?? "{}") as {
      snapshots?: Array<{ content?: string }>;
    };
    expect(snapshotIndex.snapshots?.length).toBeGreaterThan(0);
    expect(snapshotIndex.snapshots?.[0]?.content).toBe(chapterContent);

    const dbPath = db.getDatabasePath();
    await db.disconnect();
    await fs.rm(dbPath, { force: true });
    await fs.rm(`${dbPath}-wal`, { force: true });
    await fs.rm(`${dbPath}-shm`, { force: true });
    await db.initialize();

    const reopened = await projectService.openLuieProject(projectPath);
    const restoredProjectId = reopened.project.id;

    const restoredChapters = await chapterService.getAllChapters(restoredProjectId);
    expect(restoredChapters).toHaveLength(1);
    expect(restoredChapters[0]?.content).toBe(chapterContent);

    const restoredSnapshots = await snapshotService.getSnapshotsByProject(restoredProjectId);
    expect(restoredSnapshots).toHaveLength(1);
    expect(restoredSnapshots[0]?.content).toBe(chapterContent);

    await projectService.deleteProject(restoredProjectId);
    await fs.rm(projectPath, { recursive: true, force: true });
  });
});
