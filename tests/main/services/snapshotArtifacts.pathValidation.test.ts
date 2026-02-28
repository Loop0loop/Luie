import os from "node:os";
import path from "node:path";
import * as fsp from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SNAPSHOT_BACKUP_DIR } from "../../../src/shared/constants/index.js";

const mocked = vi.hoisted(() => {
  const dbClient = {
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    snapshot: {
      findMany: vi.fn(),
    },
  };
  const db = {
    getClient: vi.fn(() => dbClient),
  };

  return {
    db,
    dbClient,
    userDataPath: "",
  };
});

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => mocked.userDataPath),
  },
}));

vi.mock("../../../src/main/database/index.js", () => ({
  db: mocked.db,
}));

describe("snapshotArtifacts projectPath hardening", () => {
  let tempRoot = "";

  beforeEach(async () => {
    mocked.db.getClient.mockClear();
    mocked.dbClient.project.findMany.mockReset();
    mocked.dbClient.project.findUnique.mockReset();
    mocked.dbClient.snapshot.findMany.mockReset();

    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-snapshot-artifacts-"));
    mocked.userDataPath = path.join(tempRoot, "userdata");
    await fsp.mkdir(mocked.userDataPath, { recursive: true });
  });

  afterEach(async () => {
    if (tempRoot) {
      await fsp.rm(tempRoot, { recursive: true, force: true });
      tempRoot = "";
    }
  });

  it("keeps writing app backup snapshots when DB projectPath is invalid", async () => {
    const relativeProjectPath = path.relative(
      process.cwd(),
      path.join(tempRoot, "relative-project", "unsafe-project.luie"),
    );

    mocked.dbClient.project.findUnique.mockResolvedValue({
      id: "project-1",
      title: "UnsafeProject",
      description: null,
      projectPath: relativeProjectPath,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      settings: null,
      chapters: [],
      characters: [],
      terms: [],
    });

    const { writeFullSnapshotArtifact } = await import(
      "../../../src/main/services/features/snapshotArtifacts.js"
    );

    await writeFullSnapshotArtifact("11111111-1111-1111-1111-111111111111", {
      projectId: "project-1",
      chapterId: null,
      content: "payload",
      description: "manual",
      type: "MANUAL",
    });

    const backupDir = path.join(mocked.userDataPath, SNAPSHOT_BACKUP_DIR, "UnsafeProject");
    const backupFiles = (await fsp.readdir(backupDir)).filter((name) => name.endsWith(".snap"));
    expect(backupFiles.length).toBe(1);

    const relativeLocalDir = path.join(tempRoot, "relative-project", ".luie");
    await expect(fsp.access(relativeLocalDir)).rejects.toThrow();
  });

  it("ignores invalid projectPath roots during orphan cleanup", async () => {
    const relativeProjectPath = path.relative(
      process.cwd(),
      path.join(tempRoot, "relative-root", "legacy-project.luie"),
    );
    const relativeProjectName = "RelativeProject";
    const relativeOrphanDir = path.join(
      tempRoot,
      "relative-root",
      ".luie",
      "snapshots",
      relativeProjectName,
    );
    await fsp.mkdir(relativeOrphanDir, { recursive: true });

    const relativeOrphanPath = path.join(
      relativeOrphanDir,
      "2026-02-28T10-00-00-000Z-22222222-2222-2222-2222-222222222222.snap",
    );
    await fsp.writeFile(relativeOrphanPath, "orphan-relative", "utf-8");

    const appBackupDir = path.join(mocked.userDataPath, SNAPSHOT_BACKUP_DIR, "AppBackup");
    await fsp.mkdir(appBackupDir, { recursive: true });
    const appBackupOrphanPath = path.join(
      appBackupDir,
      "2026-02-28T10-00-00-000Z-33333333-3333-3333-3333-333333333333.snap",
    );
    await fsp.writeFile(appBackupOrphanPath, "orphan-backup", "utf-8");

    mocked.dbClient.project.findMany.mockResolvedValue([
      {
        id: "project-1",
        title: relativeProjectName,
        projectPath: relativeProjectPath,
      },
    ]);
    mocked.dbClient.snapshot.findMany.mockResolvedValue([]);

    const { cleanupOrphanSnapshotArtifacts } = await import(
      "../../../src/main/services/features/snapshotArtifacts.js"
    );

    const result = await cleanupOrphanSnapshotArtifacts();
    expect(result.scanned).toBe(1);
    expect(result.deleted).toBe(1);

    await expect(fsp.access(appBackupOrphanPath)).rejects.toThrow();
    await expect(fsp.access(relativeOrphanPath)).resolves.toBeUndefined();
  });
});
