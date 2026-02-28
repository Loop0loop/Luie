import { promises as fs } from "fs";
import path from "path";
import { app } from "electron";
import Database from "better-sqlite3";
import { createLogger } from "../../../shared/logger/index.js";
import { SNAPSHOT_BACKUP_DIR } from "../../../shared/constants/paths.js";
import { db } from "../../database/index.js";

const logger = createLogger("DbRecoveryService");

export type DbRecoveryResult = {
  success: boolean;
  message: string;
  backupDir?: string;
  checkpoint?: unknown;
  integrity?: unknown;
};

export class DbRecoveryService {
  async recoverFromWal(options?: { dryRun?: boolean }): Promise<DbRecoveryResult> {
    let backupDir: string | undefined;
    let dbPath: string | null = null;
    let disconnected = false;
    try {
      const resolvedPath = db.getDatabasePath();
      dbPath = resolvedPath;
      const walPath = `${resolvedPath}-wal`;
      const shmPath = `${resolvedPath}-shm`;

      const walExists = await this.exists(walPath);
      if (!walExists) {
        return {
          success: false,
          message: "WAL file not found. Recovery is not available.",
        };
      }

      backupDir = await this.createBackup(resolvedPath, walPath, shmPath);

      if (options?.dryRun) {
        return {
          success: true,
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

      await db.initialize();
      disconnected = false;

      logger.info("DB recovery completed", { dbPath, backupDir });

      return {
        success: true,
        message: "Recovery completed successfully.",
        backupDir,
        checkpoint,
        integrity,
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
          logger.error("Failed to reinitialize database after recovery failure", {
            reinitializeError,
            dbPath,
          });
        }
      }
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        backupDir,
      };
    }
  }

  private async createBackup(dbPath: string, walPath: string, shmPath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "");
    const backupDir = path.join(app.getPath("userData"), SNAPSHOT_BACKUP_DIR, "db-recovery", timestamp);
    await fs.mkdir(backupDir, { recursive: true });

    await fs.copyFile(dbPath, path.join(backupDir, path.basename(dbPath)));
    await fs.copyFile(walPath, path.join(backupDir, path.basename(walPath)));

    if (await this.exists(shmPath)) {
      await fs.copyFile(shmPath, path.join(backupDir, path.basename(shmPath)));
    }

    return backupDir;
  }

  private async restoreBackup(backupDir: string, dbPath: string): Promise<void> {
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
