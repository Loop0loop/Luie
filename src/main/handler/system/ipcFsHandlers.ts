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
}
