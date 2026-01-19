import { dialog } from "electron";
import * as fs from "fs/promises";
import * as path from "path";
import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
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
        filters: options?.filters ?? [{ name: "Luie Project", extensions: ["luie"] }],
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

      const projectDir = path.join(projectPath, safeName || "New Project");
      await fs.mkdir(projectDir, { recursive: true });

      const fullPath = path.join(projectDir, `${safeName || "project"}.luie`);
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
      const targetPath = packagePath.toLowerCase().endsWith(".luie")
        ? packagePath
        : `${packagePath}.luie`;

      // Ensure directory exists
      await fs.mkdir(targetPath, { recursive: true });

      // Create standard sub-structure
      await Promise.all([
        fs.mkdir(path.join(targetPath, "manuscript"), { recursive: true }),
        fs.mkdir(path.join(targetPath, "world"), { recursive: true }),
        fs.mkdir(path.join(targetPath, "snapshots"), { recursive: true }),
        fs.mkdir(path.join(targetPath, "assets"), { recursive: true }),
      ]);

      // Write meta.json (best-effort)
      await fs.writeFile(
        path.join(targetPath, "meta.json"),
        JSON.stringify(meta ?? {}, null, 2),
        "utf-8",
      );

      // Initialize world defaults if missing
      const worldCharactersPath = path.join(targetPath, "world", "characters.json");
      const worldTermsPath = path.join(targetPath, "world", "terms.json");
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

      const fullPath = path.join(projectRoot, normalized);
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, content, "utf-8");
      return { path: fullPath };
    },
  });
}
