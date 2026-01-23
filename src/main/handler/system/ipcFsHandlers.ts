import { dialog } from "electron";
import * as fs from "fs/promises";
import * as path from "path";
import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import {
  DEFAULT_PROJECT_DIR_NAME,
  DEFAULT_PROJECT_FILE_BASENAME,
  LUIE_PACKAGE_EXTENSION,
  LUIE_PACKAGE_EXTENSION_NO_DOT,
  LUIE_PACKAGE_FILTER_NAME,
  LUIE_PACKAGE_FORMAT,
  LUIE_PACKAGE_CONTAINER_DIR,
  LUIE_PACKAGE_VERSION,
  LUIE_PACKAGE_META_FILENAME,
  LUIE_MANUSCRIPT_DIR,
  LUIE_WORLD_DIR,
  LUIE_SNAPSHOTS_DIR,
  LUIE_ASSETS_DIR,
  LUIE_WORLD_CHARACTERS_FILE,
  LUIE_WORLD_TERMS_FILE,
} from "../../../shared/constants/index.js";
import { registerIpcHandler } from "../core/ipcHandler.js";

type LoggerLike = {
  error: (message: string, data?: unknown) => void;
};

export function registerFsIPCHandlers(logger: LoggerLike): void {
  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.FS_SELECT_DIRECTORY,
    logTag: "FS_SELECT_DIRECTORY",
    failMessage: "Failed to select directory",
    handler: async () => {
      const result = await dialog.showOpenDialog({
        properties: ["openDirectory", "createDirectory"],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      return result.filePaths[0];
    },
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.FS_SELECT_SAVE_LOCATION,
    logTag: "FS_SELECT_SAVE_LOCATION",
    failMessage: "Failed to select save location",
    handler: async (
      options?: {
        filters?: { name: string; extensions: string[] }[];
        defaultPath?: string;
        title?: string;
      },
    ) => {
      const result = await dialog.showSaveDialog({
        title: options?.title,
        defaultPath: options?.defaultPath,
        filters: options?.filters ?? [
          { name: LUIE_PACKAGE_FILTER_NAME, extensions: [LUIE_PACKAGE_EXTENSION_NO_DOT] },
        ],
      });
      if (result.canceled || !result.filePath) {
        return null;
      }
      return result.filePath;
    },
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.FS_SAVE_PROJECT,
    logTag: "FS_SAVE_PROJECT",
    failMessage: "Failed to save project",
    handler: async (projectName: string, projectPath: string, content: string) => {
      const safeName = projectName
        .replace(/[\\/:*?"<>|]/g, "-")
        .replace(/\s+/g, " ")
        .trim();

      const projectDir = path.join(projectPath, safeName || DEFAULT_PROJECT_DIR_NAME);
      await fs.mkdir(projectDir, { recursive: true });

      const fullPath = path.join(
        projectDir,
        `${safeName || DEFAULT_PROJECT_FILE_BASENAME}${LUIE_PACKAGE_EXTENSION}`,
      );
      await fs.writeFile(fullPath, content, "utf-8");
      return { path: fullPath, projectDir };
    },
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.FS_READ_FILE,
    logTag: "FS_READ_FILE",
    failMessage: "Failed to read file",
    handler: async (filePath: string) => {
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        return null;
      }
      const content = await fs.readFile(filePath, "utf-8");
      return content;
    },
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.FS_WRITE_FILE,
    logTag: "FS_WRITE_FILE",
    failMessage: "Failed to write file",
    handler: async (filePath: string, content: string) => {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, content, "utf-8");
      return { path: filePath };
    },
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.FS_CREATE_LUIE_PACKAGE,
    logTag: "FS_CREATE_LUIE_PACKAGE",
    failMessage: "Failed to create Luie package",
    handler: async (packagePath: string, meta: unknown) => {
      const targetPath = packagePath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)
        ? packagePath
        : `${packagePath}${LUIE_PACKAGE_EXTENSION}`;

      // If legacy single-file .luie exists, migrate it out of the way.
      try {
        const stat = await fs.stat(targetPath);
        if (stat.isFile()) {
          const backupPath = `${targetPath}.legacy-${Date.now()}`;
          await fs.rename(targetPath, backupPath);
        }
      } catch (e) {
        // ignore ENOENT
        const err = e as NodeJS.ErrnoException;
        if (err?.code !== "ENOENT") throw e;
      }

      // Ensure directory exists
      await fs.mkdir(targetPath, { recursive: true });

      // Create standard sub-structure
      await Promise.all([
        fs.mkdir(path.join(targetPath, LUIE_MANUSCRIPT_DIR), { recursive: true }),
        fs.mkdir(path.join(targetPath, LUIE_WORLD_DIR), { recursive: true }),
        fs.mkdir(path.join(targetPath, LUIE_SNAPSHOTS_DIR), { recursive: true }),
        fs.mkdir(path.join(targetPath, LUIE_ASSETS_DIR), { recursive: true }),
      ]);

      // Write meta.json (best-effort)
      await fs.writeFile(
        path.join(targetPath, LUIE_PACKAGE_META_FILENAME),
        JSON.stringify(meta ?? {}, null, 2),
        "utf-8",
      );

      // Initialize world defaults if missing
      const worldCharactersPath = path.join(
        targetPath,
        LUIE_WORLD_DIR,
        LUIE_WORLD_CHARACTERS_FILE,
      );
      const worldTermsPath = path.join(
        targetPath,
        LUIE_WORLD_DIR,
        LUIE_WORLD_TERMS_FILE,
      );
      try {
        await fs.access(worldCharactersPath);
      } catch {
        await fs.writeFile(worldCharactersPath, JSON.stringify({ characters: [] }, null, 2), "utf-8");
      }
      try {
        await fs.access(worldTermsPath);
      } catch {
        await fs.writeFile(worldTermsPath, JSON.stringify({ terms: [] }, null, 2), "utf-8");
      }

      return { path: targetPath };
    },
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.FS_WRITE_PROJECT_FILE,
    logTag: "FS_WRITE_PROJECT_FILE",
    failMessage: "Failed to write project file",
    handler: async (projectRoot: string, relativePath: string, content: string) => {
      const normalized = path.normalize(relativePath).replace(/^([/\\])+/, "");
      if (!normalized || normalized.startsWith("..") || path.isAbsolute(normalized)) {
        throw new Error("INVALID_RELATIVE_PATH");
      }

      // Ensure projectRoot is a directory. If a legacy single-file .luie exists, migrate it.
      try {
        const stat = await fs.stat(projectRoot);
        if (stat.isFile()) {
          if (!projectRoot.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
            throw new Error("PROJECT_ROOT_NOT_DIRECTORY");
          }

          const backupPath = `${projectRoot}.legacy-${Date.now()}`;
          await fs.rename(projectRoot, backupPath);
          await fs.mkdir(projectRoot, { recursive: true });

          // Best-effort: write a minimal meta.json so the package is self-describing.
          const metaPath = path.join(projectRoot, LUIE_PACKAGE_META_FILENAME);
          try {
            await fs.access(metaPath);
          } catch {
            await fs.writeFile(
              metaPath,
              JSON.stringify(
                {
                  format: LUIE_PACKAGE_FORMAT,
                  container: LUIE_PACKAGE_CONTAINER_DIR,
                  version: LUIE_PACKAGE_VERSION,
                  migratedAt: new Date().toISOString(),
                  legacyBackupPath: backupPath,
                },
                null,
                2,
              ),
              "utf-8",
            );
          }

          // Create standard sub-structure (best-effort)
          await Promise.all([
            fs.mkdir(path.join(projectRoot, LUIE_MANUSCRIPT_DIR), { recursive: true }),
            fs.mkdir(path.join(projectRoot, LUIE_WORLD_DIR), { recursive: true }),
            fs.mkdir(path.join(projectRoot, LUIE_SNAPSHOTS_DIR), { recursive: true }),
            fs.mkdir(path.join(projectRoot, LUIE_ASSETS_DIR), { recursive: true }),
          ]);

          const worldCharactersPath = path.join(
            projectRoot,
            LUIE_WORLD_DIR,
            LUIE_WORLD_CHARACTERS_FILE,
          );
          const worldTermsPath = path.join(
            projectRoot,
            LUIE_WORLD_DIR,
            LUIE_WORLD_TERMS_FILE,
          );
          try {
            await fs.access(worldCharactersPath);
          } catch {
            await fs.writeFile(
              worldCharactersPath,
              JSON.stringify({ characters: [] }, null, 2),
              "utf-8",
            );
          }
          try {
            await fs.access(worldTermsPath);
          } catch {
            await fs.writeFile(
              worldTermsPath,
              JSON.stringify({ terms: [] }, null, 2),
              "utf-8",
            );
          }
        }
      } catch (e) {
        const err = e as NodeJS.ErrnoException;
        if (err?.code === "ENOENT") {
          await fs.mkdir(projectRoot, { recursive: true });
        } else {
          throw e;
        }
      }

      const fullPath = path.join(projectRoot, normalized);
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, content, "utf-8");
      return { path: fullPath };
    },
  });
}
