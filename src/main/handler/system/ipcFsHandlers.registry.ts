import { app, dialog } from "electron";
import type { OpenDialogReturnValue, SaveDialogReturnValue } from "electron";
import * as fsp from "fs/promises";
import * as path from "path";
import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import { ErrorCode } from "../../../shared/constants/errorCode.js";
import {
  LUIE_PACKAGE_EXTENSION,
  LUIE_PACKAGE_EXTENSION_NO_DOT,
  LUIE_PACKAGE_FILTER_NAME,
  MARKDOWN_EXTENSION,
} from "../../../shared/constants/index.js";
import { SNAPSHOT_BACKUP_DIR } from "../../../shared/constants/paths.js";
import { readLuieContainerEntry } from "../../services/io/luieContainer.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import type { LoggerLike } from "../core/types.js";
import {
  fsApproveProjectPathArgsSchema,
  fsCreateLuiePackageArgsSchema,
  fsReadFileArgsSchema,
  fsReadLuieEntryArgsSchema,
  fsSaveProjectArgsSchema,
  fsSelectDialogArgsSchema,
  fsWriteFileArgsSchema,
  fsWriteProjectFileArgsSchema,
} from "../../../shared/schemas/index.js";
import { ServiceError } from "../../utils/serviceError.js";
import {
  approvePathForSession,
  assertAllowedFsPath,
  resolveApprovedProjectPath,
  type FsPathPermission,
} from "./fsPathApproval.js";
import {
  createLuiePackage,
  saveProjectAsLuiePackage,
  writeProjectPackageEntry,
} from "./fsPackageOperations.js";

const MAX_READ_FILE_BYTES = 16 * 1024 * 1024;
const ALLOWED_TEXT_WRITE_EXTENSIONS = new Set([
  MARKDOWN_EXTENSION,
  ".txt",
]);

const assertLuiePackagePath = (packagePath: string, fieldName: string): void => {
  if (!packagePath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
    throw new ServiceError(
      ErrorCode.INVALID_INPUT,
      `${fieldName} must point to a ${LUIE_PACKAGE_EXTENSION} package`,
      { fieldName, packagePath },
    );
  }
};

const assertSupportedWriteFileExtension = (filePath: string): void => {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === LUIE_PACKAGE_EXTENSION) {
    throw new ServiceError(
      ErrorCode.INVALID_INPUT,
      "Direct .luie writes are blocked. Use fs.createLuiePackage or fs.writeProjectFile.",
      { filePath, extension },
    );
  }
  if (!ALLOWED_TEXT_WRITE_EXTENSIONS.has(extension)) {
    throw new ServiceError(
      ErrorCode.INVALID_INPUT,
      "Unsupported file extension for fs.writeFile",
      { filePath, extension, allowed: Array.from(ALLOWED_TEXT_WRITE_EXTENSIONS) },
    );
  }
};

const resolveOpenDialogPath = (result: OpenDialogReturnValue) => {
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
};

const resolveSaveDialogPath = (result: SaveDialogReturnValue) => {
  if (result.canceled || !result.filePath) {
    return null;
  }
  return result.filePath;
};

export function registerFsIPCHandlers(logger: LoggerLike): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.FS_APPROVE_PROJECT_PATH,
      logTag: "FS_APPROVE_PROJECT_PATH",
      failMessage: "Failed to approve project path",
      argsSchema: fsApproveProjectPathArgsSchema,
      handler: async (projectPath: string) => {
        const normalizedPath = await resolveApprovedProjectPath(projectPath);
        const isLuiePath = normalizedPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION);
        await approvePathForSession(
          normalizedPath,
          isLuiePath ? ["read", "package"] : ["read"],
          "file",
        );
        return {
          approved: true,
          normalizedPath,
        };
      },
    },
    {
      channel: IPC_CHANNELS.FS_SELECT_DIRECTORY,
      logTag: "FS_SELECT_DIRECTORY",
      failMessage: "Failed to select directory",
      handler: async () => {
        const result = await dialog.showOpenDialog({
          properties: ["openDirectory", "createDirectory"],
        });
        const selectedPath = resolveOpenDialogPath(result);
        if (!selectedPath) return null;
        await approvePathForSession(selectedPath, ["read", "write", "package"], "directory");
        return selectedPath;
      },
    },
    {
      channel: IPC_CHANNELS.FS_SELECT_SAVE_LOCATION,
      logTag: "FS_SELECT_SAVE_LOCATION",
      failMessage: "Failed to select save location",
      argsSchema: fsSelectDialogArgsSchema,
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
        const selectedPath = resolveSaveDialogPath(result);
        if (!selectedPath) return null;
        const isLuiePath = selectedPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION);
        const permissions: FsPathPermission[] = isLuiePath
          ? ["read", "write", "package"]
          : ["read", "write"];
        await approvePathForSession(selectedPath, permissions, "file");
        return selectedPath;
      },
    },
    {
      channel: IPC_CHANNELS.FS_SELECT_FILE,
      logTag: "FS_SELECT_FILE",
      failMessage: "Failed to select file",
      argsSchema: fsSelectDialogArgsSchema,
      handler: async (
        options?: {
          filters?: { name: string; extensions: string[] }[];
          defaultPath?: string;
          title?: string;
        },
      ) => {
        const result = await dialog.showOpenDialog({
          title: options?.title,
          defaultPath: options?.defaultPath,
          filters: options?.filters,
          properties: ["openFile"],
        });
        const selectedPath = resolveOpenDialogPath(result);
        if (!selectedPath) return null;
        const isLuiePath = selectedPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION);
        const permissions: FsPathPermission[] = isLuiePath
          ? ["read", "package"]
          : ["read"];
        await approvePathForSession(selectedPath, permissions, "file");
        return selectedPath;
      },
    },
    {
      channel: IPC_CHANNELS.FS_SELECT_SNAPSHOT_BACKUP,
      logTag: "FS_SELECT_SNAPSHOT_BACKUP",
      failMessage: "Failed to select restore backup",
      handler: async () => {
        const backupDir = path.join(app.getPath("userData"), SNAPSHOT_BACKUP_DIR);
        const result = await dialog.showOpenDialog({
          title: "복원할 백업 선택",
          defaultPath: backupDir,
          filters: [{ name: "Luie 백업", extensions: ["snap"] }],
          properties: ["openFile"],
        });
        const selectedPath = resolveOpenDialogPath(result);
        if (!selectedPath) return null;
        await approvePathForSession(selectedPath, ["read"], "file");
        return selectedPath;
      },
    },
    {
      channel: IPC_CHANNELS.FS_SAVE_PROJECT,
      logTag: "FS_SAVE_PROJECT",
      failMessage: "Failed to save project",
      argsSchema: fsSaveProjectArgsSchema,
      handler: async (projectName: string, projectPath: string, content: string) =>
        saveProjectAsLuiePackage(projectName, projectPath, content, logger),
    },
    {
      channel: IPC_CHANNELS.FS_READ_FILE,
      logTag: "FS_READ_FILE",
      failMessage: "Failed to read file",
      argsSchema: fsReadFileArgsSchema,
      handler: async (filePath: string) => {
        const safeFilePath = await assertAllowedFsPath(filePath, {
          fieldName: "filePath",
          mode: "read",
          permission: "read",
        });
        const stat = await fsp.stat(safeFilePath);
        if (stat.isDirectory()) {
          return null;
        }
        if (stat.size > MAX_READ_FILE_BYTES) {
          throw new ServiceError(
            ErrorCode.INVALID_INPUT,
            "File is too large to read through IPC",
            {
              filePath: safeFilePath,
              size: stat.size,
              maxSize: MAX_READ_FILE_BYTES,
            },
          );
        }
        const content = await fsp.readFile(safeFilePath, "utf-8");
        return content;
      },
    },
    {
      channel: IPC_CHANNELS.FS_READ_LUIE_ENTRY,
      logTag: "FS_READ_LUIE_ENTRY",
      failMessage: "Failed to read Luie package entry",
      argsSchema: fsReadLuieEntryArgsSchema,
      handler: async (packagePath: string, entryPath: string) => {
        const safePackagePath = await assertAllowedFsPath(packagePath, {
          fieldName: "packagePath",
          mode: "read",
          permission: "package",
        });
        assertLuiePackagePath(safePackagePath, "packagePath");
        return readLuieContainerEntry(
          safePackagePath,
          entryPath,
          logger,
        );
      },
    },
    {
      channel: IPC_CHANNELS.FS_WRITE_FILE,
      logTag: "FS_WRITE_FILE",
      failMessage: "Failed to write file",
      argsSchema: fsWriteFileArgsSchema,
      handler: async (filePath: string, content: string) => {
        const safeFilePath = await assertAllowedFsPath(filePath, {
          fieldName: "filePath",
          mode: "write",
          permission: "write",
        });
        assertSupportedWriteFileExtension(safeFilePath);
        const dir = path.dirname(safeFilePath);
        await fsp.mkdir(dir, { recursive: true });
        await fsp.writeFile(safeFilePath, content, "utf-8");
        return { path: safeFilePath };
      },
    },
    {
      channel: IPC_CHANNELS.FS_CREATE_LUIE_PACKAGE,
      logTag: "FS_CREATE_LUIE_PACKAGE",
      failMessage: "Failed to create Luie package",
      argsSchema: fsCreateLuiePackageArgsSchema,
      handler: async (packagePath: string, meta: unknown) =>
        createLuiePackage(packagePath, meta, logger),
    },
    {
      channel: IPC_CHANNELS.FS_WRITE_PROJECT_FILE,
      logTag: "FS_WRITE_PROJECT_FILE",
      failMessage: "Failed to write project file",
      argsSchema: fsWriteProjectFileArgsSchema,
      handler: async (projectRoot: string, relativePath: string, content: string) =>
        writeProjectPackageEntry(projectRoot, relativePath, content, logger),
    },
  ]);
}
