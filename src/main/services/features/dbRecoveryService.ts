import { promises as fs } from "fs";
import path from "path";
import { app } from "electron";
import Database from "better-sqlite3";
import { createLogger } from "../../../shared/logger/index.js";
import { SNAPSHOT_BACKUP_DIR } from "../../../shared/constants/paths.js";
import type {
  DbRecoveryCheckpoint,
  DbRecoveryFileStatus,
  DbRecoveryResult,
  DbRecoveryStatus,
} from "../../../shared/types/index.js";
import { db } from "../../database/index.js";

const logger = createLogger("DbRecoveryService");
const getRecoveryBackupRootDir = () =>
  path.join(app.getPath("userData"), SNAPSHOT_BACKUP_DIR, "db-recovery");

const toCheckpointRows = (
  value: unknown,
): DbRecoveryCheckpoint[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const rows = value
    .filter((entry): entry is Record<string, unknown> =>
      Boolean(entry && typeof entry === "object"),
    )
    .map((entry) => ({
      busy:
        typeof entry.busy === "number" && Number.isFinite(entry.busy)
          ? entry.busy
          : 0,
      log:
        typeof entry.log === "number" && Number.isFinite(entry.log)
          ? entry.log
          : 0,
      checkpointed:
        typeof entry.checkpointed === "number" &&
        Number.isFinite(entry.checkpointed)
          ? entry.checkpointed
          : 0,
    }));
  return rows.length > 0 ? rows : undefined;
};

const toIntegrityRows = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const rows = value
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object") {
        const result = (entry as Record<string, unknown>).integrity_check;
        if (typeof result === "string") return result;
      }
      return null;
    })
    .filter(
      (entry): entry is string => typeof entry === "string" && entry.length > 0,
    );
  return rows.length > 0 ? rows : undefined;
};

export class DbRecoveryService {
  async getRecoveryStatus(): Promise<DbRecoveryStatus> {
    const resolvedPath = db.getDatabasePath();
    const walPath = `${resolvedPath}-wal`;
    const shmPath = `${resolvedPath}-shm`;
    const [databaseStatus, walStatus, shmStatus, latestBackupDir] =
      await Promise.all([
        this.readFileStatus(resolvedPath),
        this.readFileStatus(walPath),
        this.readFileStatus(shmPath),
        this.getLatestBackupDir(),
      ]);

    return {
      available: databaseStatus.exists && walStatus.exists,
      reason: !databaseStatus.exists
        ? "db-missing"
        : walStatus.exists
          ? "ready"
          : "wal-missing",
      checkedAt: new Date().toISOString(),
      backupRootDir: this.getBackupRootDir(),
      latestBackupDir,
      database: databaseStatus,
      wal: walStatus,
      shm: shmStatus,
    };
  }

  async recoverFromWal(options?: {
    dryRun?: boolean;
  }): Promise<DbRecoveryResult> {
    let backupDir: string | undefined;
    let dbPath: string | null = null;
    let disconnected = false;
    let checkpointRows: DbRecoveryCheckpoint[] | undefined;
    let integrityRows: string[] | undefined;
    const dryRun = Boolean(options?.dryRun);
    try {
      const resolvedPath = db.getDatabasePath();
      dbPath = resolvedPath;
      const walPath = `${resolvedPath}-wal`;
      const shmPath = `${resolvedPath}-shm`;

      const walExists = await this.exists(walPath);
      if (!walExists) {
        return {
          success: false,
          dryRun,
          message: "WAL file not found. Recovery is not available.",
        };
      }

      backupDir = await this.createBackup(resolvedPath, walPath, shmPath);

      if (dryRun) {
        return {
          success: true,
          dryRun,
          message: "Backup created. Run recovery to apply WAL.",
          backupDir,
        };
      }

      await db.disconnect();
      disconnected = true;

      const sqlite = new Database(resolvedPath, { fileMustExist: true });
      let checkpoint: unknown;
      let integrity: unknown;
      try {
        checkpoint = sqlite.pragma("wal_checkpoint(FULL)");
        integrity = sqlite.pragma("integrity_check");
      } finally {
        sqlite.close();
      }

      checkpointRows = toCheckpointRows(checkpoint);
      integrityRows = toIntegrityRows(integrity);
      const busyRows = (checkpointRows ?? []).filter((row) => row.busy > 0);
      if (busyRows.length > 0) {
        throw new Error(
          `DB_RECOVERY_WAL_BUSY:${busyRows.map((row) => row.busy).join(",")}`,
        );
      }
      const integrityFailures = (integrityRows ?? []).filter(
        (row) => row.trim().toLowerCase() !== "ok",
      );
      if (integrityFailures.length > 0) {
        throw new Error(`DB_RECOVERY_INTEGRITY_FAILED:${integrityFailures[0]}`);
      }

      await db.initialize();
      disconnected = false;

      logger.info("DB recovery completed", { dbPath, backupDir });

      return {
        success: true,
        dryRun,
        message: "Recovery completed successfully.",
        backupDir,
        checkpoint: checkpointRows,
        integrity: integrityRows,
      };
    } catch (error) {
      logger.error("DB recovery failed", { error });
      if (backupDir && dbPath) {
        await this.restoreBackup(backupDir, dbPath);
      }
      if (disconnected) {
        try {
          await db.initialize();
        } catch (reinitializeError) {
          logger.error(
            "Failed to reinitialize database after recovery failure",
            {
              reinitializeError,
              dbPath,
            },
          );
        }
      }
      return {
        success: false,
        dryRun,
        message: error instanceof Error ? error.message : String(error),
        backupDir,
        checkpoint: checkpointRows,
        integrity: integrityRows,
      };
    }
  }

  private async createBackup(
    dbPath: string,
    walPath: string,
    shmPath: string,
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "");
    const backupDir = path.join(this.getBackupRootDir(), timestamp);
    await fs.mkdir(backupDir, { recursive: true });

    await fs.copyFile(dbPath, path.join(backupDir, path.basename(dbPath)));
    await fs.copyFile(walPath, path.join(backupDir, path.basename(walPath)));

    if (await this.exists(shmPath)) {
      await fs.copyFile(shmPath, path.join(backupDir, path.basename(shmPath)));
    }

    return backupDir;
  }

  private async restoreBackup(
    backupDir: string,
    dbPath: string,
  ): Promise<void> {
    try {
      const dbFile = path.basename(dbPath);
      const walFile = path.basename(`${dbPath}-wal`);
      const shmFile = path.basename(`${dbPath}-shm`);
      const targetDir = path.dirname(dbPath);
      const backupDbPath = path.join(backupDir, dbFile);

      if (!(await this.exists(backupDbPath))) {
        return;
      }

      await fs.copyFile(backupDbPath, path.join(targetDir, dbFile));
      const backupWalPath = path.join(backupDir, walFile);
      const backupShmPath = path.join(backupDir, shmFile);
      if (await this.exists(backupWalPath)) {
        await fs.copyFile(backupWalPath, path.join(targetDir, walFile));
      }
      if (await this.exists(backupShmPath)) {
        await fs.copyFile(backupShmPath, path.join(targetDir, shmFile));
      }
    } catch (error) {
      logger.warn("Failed to restore backup", { error });
    }
  }

  private getBackupRootDir(): string {
    return getRecoveryBackupRootDir();
  }

  private async getLatestBackupDir(): Promise<string | undefined> {
    try {
      const entries = await fs.readdir(this.getBackupRootDir(), {
        withFileTypes: true,
      });
      const latest = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((left, right) => right.localeCompare(left))[0];

      return latest ? path.join(this.getBackupRootDir(), latest) : undefined;
    } catch {
      return undefined;
    }
  }

  private async readFileStatus(
    filePath: string,
  ): Promise<DbRecoveryFileStatus> {
    try {
      const stats = await fs.stat(filePath);
      return {
        path: filePath,
        exists: true,
        sizeBytes: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      };
    } catch {
      return {
        path: filePath,
        exists: false,
      };
    }
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export const dbRecoveryService = new DbRecoveryService();
