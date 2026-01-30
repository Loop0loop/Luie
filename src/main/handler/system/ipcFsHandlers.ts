import { dialog } from "electron";
import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
import yauzl from "yauzl";
import yazl from "yazl";
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

type ZipEntryPayload = {
  name: string;
  content?: string;
  isDirectory?: boolean;
  fromFilePath?: string;
};

const ZIP_TEMP_SUFFIX = ".tmp";

const normalizeZipPath = (inputPath: string) =>
  path.posix
    .normalize(inputPath.replace(/\\/g, "/"))
    .replace(/^\.(\/|\\)/, "")
    .replace(/^\//, "");

const isSafeZipPath = (inputPath: string) => {
  const normalized = normalizeZipPath(inputPath);
  if (!normalized) return false;
  if (normalized.startsWith("../") || normalized.startsWith("..\\")) return false;
  if (normalized.includes("../") || normalized.includes("..\\")) return false;
  return !path.isAbsolute(normalized);
};

const ensureLuieExtension = (targetPath: string) =>
  targetPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)
    ? targetPath
    : `${targetPath}${LUIE_PACKAGE_EXTENSION}`;

const ensureParentDir = async (targetPath: string) => {
  const dir = path.dirname(targetPath);
  await fsp.mkdir(dir, { recursive: true });
};

const buildZipFile = async (
  outputPath: string,
  buildEntries: (zip: yazl.ZipFile) => Promise<void> | void,
) => {
  const zip = new yazl.ZipFile();
  const output = fs.createWriteStream(outputPath);

  const completion = new Promise<void>((resolve, reject) => {
    output.on("close", () => resolve());
    output.on("error", reject);
    zip.outputStream.on("error", reject);
  });

  zip.outputStream.pipe(output);
  await buildEntries(zip);
  zip.end();
  await completion;
};

const atomicReplace = async (tempPath: string, targetPath: string, logger: LoggerLike) => {
  const backupPath = `${targetPath}.bak-${Date.now()}`;
  let backedUp = false;

  try {
    await fsp.rename(tempPath, targetPath);
    return;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code !== "EEXIST" && err?.code !== "ENOTEMPTY" && err?.code !== "EPERM") {
      throw error;
    }
  }

  try {
    await fsp.rename(targetPath, backupPath);
    backedUp = true;
    await fsp.rename(tempPath, targetPath);
    await fsp.rm(backupPath, { force: true, recursive: true });
  } catch (error) {
    logger.error("Atomic replace failed", { error, targetPath });
    if (backedUp) {
      try {
        await fsp.rename(backupPath, targetPath);
      } catch (restoreError) {
        logger.error("Failed to restore backup", { restoreError, targetPath, backupPath });
      }
    }
    throw error;
  }
};

const addEntriesToZip = async (zip: yazl.ZipFile, entries: ZipEntryPayload[]) => {
  for (const entry of entries) {
    const normalized = normalizeZipPath(entry.name);
    if (!normalized || !isSafeZipPath(normalized)) {
      throw new Error("INVALID_ZIP_ENTRY_PATH");
    }

    if (entry.isDirectory) {
      zip.addEmptyDirectory(normalized.endsWith("/") ? normalized : `${normalized}/`);
      continue;
    }

    if (entry.fromFilePath) {
      zip.addFile(entry.fromFilePath, normalized);
      continue;
    }

    const buffer = Buffer.from(entry.content ?? "", "utf-8");
    zip.addBuffer(buffer, normalized);
  }
};

const collectDirectoryEntries = async (sourceDir: string, baseDir = sourceDir) => {
  const entries: ZipEntryPayload[] = [];
  const items = await fsp.readdir(sourceDir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(sourceDir, item.name);
    const relative = normalizeZipPath(path.relative(baseDir, fullPath));
    if (!relative || !isSafeZipPath(relative)) {
      continue;
    }

    if (item.isDirectory()) {
      entries.push({ name: `${relative}/`, isDirectory: true });
      entries.push(...(await collectDirectoryEntries(fullPath, baseDir)));
      continue;
    }

    entries.push({ name: relative, fromFilePath: fullPath });
  }

  return entries;
};

const migrateDirectoryPackageToZip = async (
  legacyDir: string,
  targetZip: string,
  logger: LoggerLike,
) => {
  const backupPath = `${legacyDir}.dir-legacy-${Date.now()}`;
  await fsp.rename(legacyDir, backupPath);
  const entries = await collectDirectoryEntries(backupPath);
  const tempZip = `${targetZip}${ZIP_TEMP_SUFFIX}-${Date.now()}`;

  await buildZipFile(tempZip, (zip) => addEntriesToZip(zip, entries));
  await atomicReplace(tempZip, targetZip, logger);
  return backupPath;
};

const rebuildZipWithReplacement = async (
  sourceZip: string,
  targetZip: string,
  replacementPath: string,
  replacementContent: string,
  logger: LoggerLike,
) => {
  const safeReplacement = normalizeZipPath(replacementPath);
  if (!safeReplacement || !isSafeZipPath(safeReplacement)) {
    throw new Error("INVALID_RELATIVE_PATH");
  }

  await buildZipFile(targetZip, async (zip) => {
    let replaced = false;

    await new Promise<void>((resolve, reject) => {
      yauzl.open(sourceZip, { lazyEntries: true }, (openErr: Error | null, zipfile?: yauzl.ZipFile) => {
        if (openErr || !zipfile) {
          reject(openErr ?? new Error("FAILED_TO_OPEN_ZIP"));
          return;
        }

        const handleEntry = (entry: yauzl.Entry) => {
          const entryName = normalizeZipPath(entry.fileName);
          if (!entryName || !isSafeZipPath(entryName)) {
            logger.error("Unsafe zip entry skipped", { entry: entry.fileName, sourceZip });
            zipfile.readEntry();
            return;
          }

          if (entryName === safeReplacement) {
            replaced = true;
            zipfile.readEntry();
            return;
          }

          if (entry.fileName.endsWith("/")) {
            zip.addEmptyDirectory(entryName.endsWith("/") ? entryName : `${entryName}/`);
            zipfile.readEntry();
            return;
          }

          zipfile.openReadStream(entry, (streamErr: Error | null, stream?: NodeJS.ReadableStream) => {
            if (streamErr || !stream) {
              reject(streamErr ?? new Error("FAILED_TO_READ_ZIP_ENTRY"));
              return;
            }

            zip.addReadStream(stream, entryName);
            stream.on("end", () => zipfile.readEntry());
            stream.on("error", reject);
          });
        };

        zipfile.on("entry", handleEntry);
        zipfile.on("error", reject);
        zipfile.on("end", resolve);
        zipfile.readEntry();
      });
    });

    if (!replaced) {
      zip.addBuffer(Buffer.from(replacementContent, "utf-8"), safeReplacement);
    }
  });
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
      await fsp.mkdir(projectDir, { recursive: true });

      const fullPath = path.join(
        projectDir,
        `${safeName || DEFAULT_PROJECT_FILE_BASENAME}${LUIE_PACKAGE_EXTENSION}`,
      );
      await fsp.writeFile(fullPath, content, "utf-8");
      return { path: fullPath, projectDir };
    },
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.FS_READ_FILE,
    logTag: "FS_READ_FILE",
    failMessage: "Failed to read file",
    handler: async (filePath: string) => {
      const stat = await fsp.stat(filePath);
      if (stat.isDirectory()) {
        return null;
      }
      const content = await fsp.readFile(filePath, "utf-8");
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
      await fsp.mkdir(dir, { recursive: true });
      await fsp.writeFile(filePath, content, "utf-8");
      return { path: filePath };
    },
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.FS_CREATE_LUIE_PACKAGE,
    logTag: "FS_CREATE_LUIE_PACKAGE",
    failMessage: "Failed to create Luie package",
    handler: async (packagePath: string, meta: unknown) => {
      const targetPath = ensureLuieExtension(packagePath);

      await ensureParentDir(targetPath);

      try {
        const existing = await fsp.stat(targetPath);
        if (existing.isDirectory()) {
          await migrateDirectoryPackageToZip(targetPath, targetPath, logger);
        } else if (existing.isFile()) {
          const backupPath = `${targetPath}.legacy-${Date.now()}`;
          await fsp.rename(targetPath, backupPath);
        }
      } catch (e) {
        const err = e as NodeJS.ErrnoException;
        if (err?.code !== "ENOENT") throw e;
      }

      const tempZip = `${targetPath}${ZIP_TEMP_SUFFIX}-${Date.now()}`;

      await buildZipFile(tempZip, (zip) =>
        addEntriesToZip(zip, [
          { name: `${LUIE_MANUSCRIPT_DIR}/`, isDirectory: true },
          { name: `${LUIE_WORLD_DIR}/`, isDirectory: true },
          { name: `${LUIE_SNAPSHOTS_DIR}/`, isDirectory: true },
          { name: `${LUIE_ASSETS_DIR}/`, isDirectory: true },
          {
            name: LUIE_PACKAGE_META_FILENAME,
            content: JSON.stringify(meta ?? {}, null, 2),
          },
          {
            name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_CHARACTERS_FILE}`,
            content: JSON.stringify({ characters: [] }, null, 2),
          },
          {
            name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_TERMS_FILE}`,
            content: JSON.stringify({ terms: [] }, null, 2),
          },
        ]),
      );

      await atomicReplace(tempZip, targetPath, logger);
      return { path: targetPath };
    },
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.FS_WRITE_PROJECT_FILE,
    logTag: "FS_WRITE_PROJECT_FILE",
    failMessage: "Failed to write project file",
    handler: async (projectRoot: string, relativePath: string, content: string) => {
      const normalized = normalizeZipPath(relativePath);
      if (!normalized || !isSafeZipPath(normalized)) {
        throw new Error("INVALID_RELATIVE_PATH");
      }
      if (!projectRoot.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
        throw new Error("PROJECT_ROOT_NOT_LUIE_PACKAGE");
      }

      try {
        const stat = await fsp.stat(projectRoot);
        if (stat.isDirectory()) {
          await migrateDirectoryPackageToZip(projectRoot, projectRoot, logger);
        }
      } catch (e) {
        const err = e as NodeJS.ErrnoException;
        if (err?.code === "ENOENT") {
          await ensureParentDir(projectRoot);
          const tempZip = `${projectRoot}${ZIP_TEMP_SUFFIX}-${Date.now()}`;
          await buildZipFile(tempZip, (zip) =>
            addEntriesToZip(zip, [
              { name: `${LUIE_MANUSCRIPT_DIR}/`, isDirectory: true },
              { name: `${LUIE_WORLD_DIR}/`, isDirectory: true },
              { name: `${LUIE_SNAPSHOTS_DIR}/`, isDirectory: true },
              { name: `${LUIE_ASSETS_DIR}/`, isDirectory: true },
              {
                name: LUIE_PACKAGE_META_FILENAME,
                content: JSON.stringify(
                  {
                    format: LUIE_PACKAGE_FORMAT,
                    container: LUIE_PACKAGE_CONTAINER_DIR,
                    version: LUIE_PACKAGE_VERSION,
                    createdAt: new Date().toISOString(),
                  },
                  null,
                  2,
                ),
              },
            ]),
          );
          await atomicReplace(tempZip, projectRoot, logger);
        } else {
          throw e;
        }
      }

      const tempZip = `${projectRoot}${ZIP_TEMP_SUFFIX}-${Date.now()}`;
      await rebuildZipWithReplacement(projectRoot, tempZip, normalized, content, logger);
      await atomicReplace(tempZip, projectRoot, logger);
      return { path: `${projectRoot}:${normalized}` };
    },
  });
}
