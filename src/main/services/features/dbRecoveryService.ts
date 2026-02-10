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

      const sqlite = new Database(resolvedPath, { fileMustExist: true });
      const checkpoint = sqlite.pragma("wal_checkpoint(FULL)");
      const integrity = sqlite.pragma("integrity_check");
      sqlite.close();

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
      const files = await fs.readdir(backupDir);
      const dbFile = files.find((name) => name.endsWith(".db"));
      const walFile = files.find((name) => name.endsWith(".db-wal"));
      const shmFile = files.find((name) => name.endsWith(".db-shm"));

      if (!dbFile) return;
      const targetDir = path.dirname(dbPath);

      await fs.copyFile(path.join(backupDir, dbFile), path.join(targetDir, dbFile));
      if (walFile) {
        await fs.copyFile(path.join(backupDir, walFile), path.join(targetDir, walFile));
      }
      if (shmFile) {
        await fs.copyFile(path.join(backupDir, shmFile), path.join(targetDir, shmFile));
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
