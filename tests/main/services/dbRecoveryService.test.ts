import os from "node:os";
import path from "node:path";
import * as fsp from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const cleanupClient = {
    snapshot: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    termAppearance: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    characterAppearance: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    term: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    character: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    chapter: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    project: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    projectSettings: { deleteMany: vi.fn(async () => ({ count: 0 })) },
  };
  const db = {
    getDatabasePath: vi.fn(),
    disconnect: vi.fn(),
    initialize: vi.fn(),
    getClient: vi.fn(() => cleanupClient),
  };
  const sqliteInstance = {
    pragma: vi.fn(),
    close: vi.fn(),
  };
  const BetterSqlite3 = vi.fn();

  return {
    db,
    cleanupClient,
    sqliteInstance,
    BetterSqlite3,
    userDataPath: "",
  };
});

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => mocked.userDataPath),
  },
}));

vi.mock("better-sqlite3", () => ({
  default: mocked.BetterSqlite3,
}));

vi.mock("../../../src/main/database/index.js", () => ({
  db: mocked.db,
}));

describe("DbRecoveryService", () => {
  let tempRoot = "";

  beforeEach(async () => {
    mocked.db.getDatabasePath.mockReset();
    mocked.db.disconnect.mockReset();
    mocked.db.initialize.mockReset();
    mocked.db.getClient.mockClear();
    mocked.cleanupClient.snapshot.deleteMany.mockClear();
    mocked.cleanupClient.termAppearance.deleteMany.mockClear();
    mocked.cleanupClient.characterAppearance.deleteMany.mockClear();
    mocked.cleanupClient.term.deleteMany.mockClear();
    mocked.cleanupClient.character.deleteMany.mockClear();
    mocked.cleanupClient.chapter.deleteMany.mockClear();
    mocked.cleanupClient.project.deleteMany.mockClear();
    mocked.cleanupClient.projectSettings.deleteMany.mockClear();
    mocked.sqliteInstance.pragma.mockReset();
    mocked.sqliteInstance.close.mockReset();
    mocked.BetterSqlite3.mockReset();

    mocked.db.disconnect.mockResolvedValue(undefined);
    mocked.db.initialize.mockResolvedValue(undefined);
    mocked.sqliteInstance.pragma.mockImplementation((query: string) => {
      if (query === "wal_checkpoint(FULL)") return [{ busy: 0, log: 0, checkpointed: 0 }];
      if (query === "integrity_check") return [{ integrity_check: "ok" }];
      return [];
    });
    mocked.BetterSqlite3.mockImplementation(function MockDatabase() {
      return mocked.sqliteInstance;
    });

    tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-db-recovery-"));
    mocked.userDataPath = tempRoot;
  });

  afterEach(async () => {
    if (tempRoot) {
      await fsp.rm(tempRoot, { recursive: true, force: true });
      tempRoot = "";
    }
  });

  it("reinitializes database after successful wal recovery", async () => {
    const dbPath = path.join(tempRoot, "project.sqlite");
    await fsp.writeFile(dbPath, "db-v1", "utf-8");
    await fsp.writeFile(`${dbPath}-wal`, "wal-v1", "utf-8");
    await fsp.writeFile(`${dbPath}-shm`, "shm-v1", "utf-8");
    mocked.db.getDatabasePath.mockReturnValue(dbPath);

    const { DbRecoveryService } = await import(
      "../../../src/main/services/features/dbRecoveryService.js"
    );
    const service = new DbRecoveryService();

    const result = await service.recoverFromWal();
    expect(result.success).toBe(true);
    expect(mocked.db.disconnect).toHaveBeenCalledTimes(1);
    expect(mocked.db.initialize).toHaveBeenCalledTimes(1);
    expect(mocked.BetterSqlite3).toHaveBeenCalledWith(dbPath, { fileMustExist: true });
    expect(mocked.sqliteInstance.close).toHaveBeenCalledTimes(1);
  });

  it("restores sqlite backup files on recovery failure after disconnect", async () => {
    const dbPath = path.join(tempRoot, "project.sqlite");
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;
    await fsp.writeFile(dbPath, "db-v1", "utf-8");
    await fsp.writeFile(walPath, "wal-v1", "utf-8");
    await fsp.writeFile(shmPath, "shm-v1", "utf-8");
    mocked.db.getDatabasePath.mockReturnValue(dbPath);

    mocked.db.disconnect.mockImplementation(async () => {
      await fsp.mkdir(path.dirname(dbPath), { recursive: true });
      await fsp.writeFile(dbPath, "db-corrupt", "utf-8");
      await fsp.writeFile(walPath, "wal-corrupt", "utf-8");
      await fsp.writeFile(shmPath, "shm-corrupt", "utf-8");
    });
    mocked.BetterSqlite3.mockImplementation(function ThrowingDatabase() {
      throw new Error("open failed");
    });

    const { DbRecoveryService } = await import(
      "../../../src/main/services/features/dbRecoveryService.js"
    );
    const service = new DbRecoveryService();

    const result = await service.recoverFromWal();
    expect(result.success).toBe(false);
    expect(result.message).toContain("open failed");
    expect(await fsp.readFile(dbPath, "utf-8")).toBe("db-v1");
    expect(await fsp.readFile(walPath, "utf-8")).toBe("wal-v1");
    expect(await fsp.readFile(shmPath, "utf-8")).toBe("shm-v1");
    expect(mocked.db.initialize).toHaveBeenCalledTimes(1);
  });
});
