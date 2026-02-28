import { app, dialog } from "electron";
import type { OpenDialogReturnValue, SaveDialogReturnValue } from "electron";
import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
import yauzl from "yauzl";
import yazl from "yazl";
import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import { ErrorCode } from "../../../shared/constants/errorCode.js";
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
  MARKDOWN_EXTENSION,
  LUIE_WORLD_DIR,
  LUIE_SNAPSHOTS_DIR,
  LUIE_ASSETS_DIR,
  LUIE_WORLD_CHARACTERS_FILE,
  LUIE_WORLD_TERMS_FILE,
  LUIE_WORLD_SYNOPSIS_FILE,
  LUIE_WORLD_PLOT_FILE,
  LUIE_WORLD_DRAWING_FILE,
  LUIE_WORLD_MINDMAP_FILE,
  LUIE_WORLD_SCRAP_MEMOS_FILE,
  LUIE_WORLD_GRAPH_FILE,
} from "../../../shared/constants/index.js";
import { SNAPSHOT_BACKUP_DIR } from "../../../shared/constants/paths.js";
import {
  ensureLuieExtension,
  isSafeZipPath,
  normalizeZipPath,
  readLuieEntry,
} from "../../utils/luiePackage.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import type { LoggerLike } from "../core/types.js";
import { sanitizeName } from "../../../shared/utils/sanitize.js";
import {
  fsCreateLuiePackageArgsSchema,
  fsReadFileArgsSchema,
  fsReadLuieEntryArgsSchema,
  fsSaveProjectArgsSchema,
  fsSelectDialogArgsSchema,
  fsWriteFileArgsSchema,
  fsWriteProjectFileArgsSchema,
} from "../../../shared/schemas/index.js";
import { ensureSafeAbsolutePath } from "../../utils/pathValidation.js";
import { ServiceError } from "../../utils/serviceError.js";

export type LuiePackageExportData = {
  meta: Record<string, unknown>;
  chapters: Array<{ id: string; content?: string | null }>;
  characters: unknown[];
  terms: unknown[];
  synopsis?: unknown;
  plot?: unknown;
  drawing?: unknown;
  mindmap?: unknown;
  memos?: unknown;
  graph?: unknown;
  snapshots: Array<{
    id: string;
    chapterId?: string | null;
    content?: string | null;
    description?: string | null;
    createdAt?: string;
  }>;
};

type ZipEntryPayload = {
  name: string;
  content?: string;
  isDirectory?: boolean;
  fromFilePath?: string;
};

const ZIP_TEMP_SUFFIX = ".tmp";
const APPROVED_ROOT_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_APPROVED_ROOTS = 128;
const MAX_READ_FILE_BYTES = 16 * 1024 * 1024;
const ALLOWED_TEXT_WRITE_EXTENSIONS = new Set([
  MARKDOWN_EXTENSION,
  ".txt",
  LUIE_PACKAGE_EXTENSION,
]);

type FsPathPermission = "read" | "write" | "package";

type ApprovedRootEntry = {
  permissions: Set<FsPathPermission>;
  expiresAt: number;
  lastAccessedAt: number;
};

const approvedRoots = new Map<string, ApprovedRootEntry>();

const normalizeComparablePath = (input: string): string =>
  process.platform === "win32" ? input.toLowerCase() : input;

const isPathWithinRoot = (targetPath: string, rootPath: string): boolean => {
  const normalizedTarget = normalizeComparablePath(path.resolve(targetPath));
  const normalizedRoot = normalizeComparablePath(path.resolve(rootPath));
  return (
    normalizedTarget === normalizedRoot ||
    normalizedTarget.startsWith(`${normalizedRoot}${path.sep}`)
  );
};

const pruneApprovedRoots = (): void => {
  const now = Date.now();
  for (const [rootPath, entry] of approvedRoots.entries()) {
    if (entry.expiresAt <= now) {
      approvedRoots.delete(rootPath);
    }
  }
};

const enforceApprovedRootLimit = (): void => {
  if (approvedRoots.size <= MAX_APPROVED_ROOTS) return;
  const candidates = Array.from(approvedRoots.entries()).sort(
    (left, right) => left[1].lastAccessedAt - right[1].lastAccessedAt,
  );
  const overflowCount = approvedRoots.size - MAX_APPROVED_ROOTS;
  for (const [rootPath] of candidates.slice(0, overflowCount)) {
    approvedRoots.delete(rootPath);
  }
};

const upsertApprovedRoot = (rootPath: string, permissions: FsPathPermission[]): void => {
  const normalizedRootPath = path.resolve(rootPath);
  const existing = approvedRoots.get(normalizedRootPath);
  const now = Date.now();
  if (existing) {
    permissions.forEach((permission) => existing.permissions.add(permission));
    existing.expiresAt = now + APPROVED_ROOT_TTL_MS;
    existing.lastAccessedAt = now;
    return;
  }
  approvedRoots.set(normalizedRootPath, {
    permissions: new Set(permissions),
    expiresAt: now + APPROVED_ROOT_TTL_MS,
    lastAccessedAt: now,
  });
  enforceApprovedRootLimit();
};

const resolveCanonicalPath = async (
  inputPath: string,
  mode: "read" | "write",
): Promise<string> => {
  const resolved = path.resolve(inputPath);

  if (mode === "read") {
    try {
      return await fsp.realpath(resolved);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err?.code === "ENOENT") {
        return resolved;
      }
      throw error;
    }
  }

  let cursor = resolved;
  while (true) {
    try {
      await fsp.access(cursor);
      const canonicalCursor = await fsp.realpath(cursor);
      if (cursor === resolved) {
        return canonicalCursor;
      }
      const suffix = path.relative(cursor, resolved);
      return path.resolve(canonicalCursor, suffix);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err?.code === "ENOENT") {
        const parent = path.dirname(cursor);
        if (parent === cursor) {
          return resolved;
        }
        cursor = parent;
        continue;
      }
      throw error;
    }
  }
};

const approvePathForSession = async (
  inputPath: string,
  permissions: FsPathPermission[],
  treatAs: "file" | "directory" = "file",
): Promise<void> => {
  const safePath = ensureSafeAbsolutePath(inputPath, "path");
  const rootPath = treatAs === "directory" ? safePath : path.dirname(safePath);
  const canonicalRoot = await resolveCanonicalPath(rootPath, "write");
  upsertApprovedRoot(canonicalRoot, permissions);
};

const assertAllowedFsPath = async (
  inputPath: string,
  options: {
    fieldName: string;
    mode: "read" | "write";
    permission: FsPathPermission;
  },
): Promise<string> => {
  const safePath = ensureSafeAbsolutePath(inputPath, options.fieldName);
  const canonicalPath = await resolveCanonicalPath(safePath, options.mode);
  pruneApprovedRoots();

  for (const [rootPath, entry] of approvedRoots.entries()) {
    if (!entry.permissions.has(options.permission)) continue;
    if (!isPathWithinRoot(canonicalPath, rootPath)) continue;
    entry.lastAccessedAt = Date.now();
    return safePath;
  }

  throw new ServiceError(
    ErrorCode.FS_PERMISSION_DENIED,
    `${options.fieldName} is outside approved roots`,
    {
      fieldName: options.fieldName,
      path: safePath,
      permission: options.permission,
    },
  );
};

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
  if (!ALLOWED_TEXT_WRITE_EXTENSIONS.has(extension)) {
    throw new ServiceError(
      ErrorCode.INVALID_INPUT,
      "Unsupported file extension for fs.writeFile",
      { filePath, extension, allowed: Array.from(ALLOWED_TEXT_WRITE_EXTENSIONS) },
    );
  }
};

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

const baseLuieDirectoryEntries = () => [
  { name: `${LUIE_MANUSCRIPT_DIR}/`, isDirectory: true },
  { name: `${LUIE_WORLD_DIR}/`, isDirectory: true },
  { name: `${LUIE_SNAPSHOTS_DIR}/`, isDirectory: true },
  { name: `${LUIE_ASSETS_DIR}/`, isDirectory: true },
];

const metaEntry = (meta: unknown) => ({
  name: LUIE_PACKAGE_META_FILENAME,
  content: JSON.stringify(meta ?? {}, null, 2),
});

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


export const writeLuiePackage = async (
  targetPath: string,
  payload: LuiePackageExportData,
  logger: LoggerLike,
) => {
  const outputPath = ensureLuieExtension(targetPath);
  await ensureParentDir(outputPath);

  const tempZip = `${outputPath}${ZIP_TEMP_SUFFIX}-${Date.now()}`;
  const entries: ZipEntryPayload[] = [
    { name: `${LUIE_MANUSCRIPT_DIR}/`, isDirectory: true },
    { name: `${LUIE_WORLD_DIR}/`, isDirectory: true },
    { name: `${LUIE_SNAPSHOTS_DIR}/`, isDirectory: true },
    { name: `${LUIE_ASSETS_DIR}/`, isDirectory: true },
    {
      name: LUIE_PACKAGE_META_FILENAME,
      content: JSON.stringify(payload.meta ?? {}, null, 2),
    },
    {
      name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_CHARACTERS_FILE}`,
      content: JSON.stringify({ characters: payload.characters ?? [] }, null, 2),
    },
    {
      name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_TERMS_FILE}`,
      content: JSON.stringify({ terms: payload.terms ?? [] }, null, 2),
    },
    {
      name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_SYNOPSIS_FILE}`,
      content: JSON.stringify(payload.synopsis ?? { synopsis: "", status: "draft" }, null, 2),
    },
    {
      name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_PLOT_FILE}`,
      content: JSON.stringify(payload.plot ?? { columns: [] }, null, 2),
    },
    {
      name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_DRAWING_FILE}`,
      content: JSON.stringify(payload.drawing ?? { paths: [] }, null, 2),
    },
    {
      name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_MINDMAP_FILE}`,
      content: JSON.stringify(payload.mindmap ?? { nodes: [], edges: [] }, null, 2),
    },
    {
      name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_SCRAP_MEMOS_FILE}`,
      content: JSON.stringify(payload.memos ?? { memos: [] }, null, 2),
    },
    {
      name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_GRAPH_FILE}`,
      content: JSON.stringify(payload.graph ?? { nodes: [], edges: [] }, null, 2),
    },
    {
      name: `${LUIE_SNAPSHOTS_DIR}/index.json`,
      content: JSON.stringify({ snapshots: payload.snapshots ?? [] }, null, 2),
    },
  ];

  for (const chapter of payload.chapters ?? []) {
    if (!chapter.id) continue;
    entries.push({
      name: `${LUIE_MANUSCRIPT_DIR}/${chapter.id}${MARKDOWN_EXTENSION}`,
      content: chapter.content ?? "",
    });
  }

  if (payload.snapshots && payload.snapshots.length > 0) {
    for (const snapshot of payload.snapshots) {
      if (!snapshot.id) continue;
      entries.push({
        name: `${LUIE_SNAPSHOTS_DIR}/${snapshot.id}.snap`,
        content: JSON.stringify(snapshot, null, 2),
      });
    }
  }

  await buildZipFile(tempZip, (zip) => addEntriesToZip(zip, entries));
  await atomicReplace(tempZip, outputPath, logger);
};

const collectDirectoryEntries = async (sourceDir: string, baseDir = sourceDir) => {
  const entries: ZipEntryPayload[] = [];
  const items = await fsp.readdir(sourceDir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = `${sourceDir}${path.sep}${item.name}`;
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
  registerIpcHandlers(logger, [
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
        await approvePathForSession(selectedPath, ["read", "write", "package"], "file");
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
        await approvePathForSession(selectedPath, ["read", "write", "package"], "file");
        return selectedPath;
      },
    },
    {
      channel: IPC_CHANNELS.FS_SELECT_SNAPSHOT_BACKUP,
      logTag: "FS_SELECT_SNAPSHOT_BACKUP",
      failMessage: "Failed to select snapshot backup",
      handler: async () => {
        const backupDir = path.join(app.getPath("userData"), SNAPSHOT_BACKUP_DIR);
        const result = await dialog.showOpenDialog({
          title: "스냅샷 복원하기",
          defaultPath: backupDir,
          filters: [{ name: "Snapshot", extensions: ["snap"] }],
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
      handler: async (projectName: string, projectPath: string, content: string) => {
        const safeName = sanitizeName(projectName);
        const safeProjectPath = await assertAllowedFsPath(projectPath, {
          fieldName: "projectPath",
          mode: "write",
          permission: "write",
        });
        const projectDir = path.join(
          safeProjectPath,
          safeName || DEFAULT_PROJECT_DIR_NAME,
        );
        await fsp.mkdir(projectDir, { recursive: true });

        const fullPath = path.join(
          projectDir,
          `${safeName || DEFAULT_PROJECT_FILE_BASENAME}${LUIE_PACKAGE_EXTENSION}`,
        );
        await fsp.writeFile(fullPath, content, "utf-8");
        return { path: fullPath, projectDir };
      },
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
        return readLuieEntry(
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
      handler: async (packagePath: string, meta: unknown) => {
        const safePackagePath = await assertAllowedFsPath(packagePath, {
          fieldName: "packagePath",
          mode: "write",
          permission: "package",
        });
        const targetPath = ensureLuieExtension(safePackagePath);

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
            ...baseLuieDirectoryEntries(),
            metaEntry(meta),
            {
              name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_CHARACTERS_FILE}`,
              content: JSON.stringify({ characters: [] }, null, 2),
            },
            {
              name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_TERMS_FILE}`,
              content: JSON.stringify({ terms: [] }, null, 2),
            },
            {
              name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_SYNOPSIS_FILE}`,
              content: JSON.stringify({ synopsis: "", status: "draft" }, null, 2),
            },
            {
              name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_PLOT_FILE}`,
              content: JSON.stringify({ columns: [] }, null, 2),
            },
            {
              name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_DRAWING_FILE}`,
              content: JSON.stringify({ paths: [] }, null, 2),
            },
            {
              name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_MINDMAP_FILE}`,
              content: JSON.stringify({ nodes: [], edges: [] }, null, 2),
            },
            {
              name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_SCRAP_MEMOS_FILE}`,
              content: JSON.stringify({ memos: [] }, null, 2),
            },
            {
              name: `${LUIE_WORLD_DIR}/${LUIE_WORLD_GRAPH_FILE}`,
              content: JSON.stringify({ nodes: [], edges: [] }, null, 2),
            },
          ]),
        );

        await atomicReplace(tempZip, targetPath, logger);
        await approvePathForSession(targetPath, ["read", "write", "package"], "file");
        return { path: targetPath };
      },
    },
    {
      channel: IPC_CHANNELS.FS_WRITE_PROJECT_FILE,
      logTag: "FS_WRITE_PROJECT_FILE",
      failMessage: "Failed to write project file",
      argsSchema: fsWriteProjectFileArgsSchema,
      handler: async (projectRoot: string, relativePath: string, content: string) => {
        const normalized = normalizeZipPath(relativePath);
        if (!normalized || !isSafeZipPath(normalized)) {
          throw new Error("INVALID_RELATIVE_PATH");
        }
        const safeProjectRoot = await assertAllowedFsPath(projectRoot, {
          fieldName: "projectRoot",
          mode: "write",
          permission: "package",
        });
        assertLuiePackagePath(safeProjectRoot, "projectRoot");

        try {
          const stat = await fsp.stat(safeProjectRoot);
          if (stat.isDirectory()) {
            await migrateDirectoryPackageToZip(
              safeProjectRoot,
              safeProjectRoot,
              logger,
            );
          }
        } catch (e) {
          const err = e as NodeJS.ErrnoException;
          if (err?.code === "ENOENT") {
            await ensureParentDir(safeProjectRoot);
            const tempZip = `${safeProjectRoot}${ZIP_TEMP_SUFFIX}-${Date.now()}`;
            await buildZipFile(tempZip, (zip) =>
              addEntriesToZip(zip, [
                ...baseLuieDirectoryEntries(),
                metaEntry({
                  format: LUIE_PACKAGE_FORMAT,
                  container: LUIE_PACKAGE_CONTAINER_DIR,
                  version: LUIE_PACKAGE_VERSION,
                  createdAt: new Date().toISOString(),
                }),
              ]),
            );
            await atomicReplace(tempZip, safeProjectRoot, logger);
          } else {
            throw e;
          }
        }

        const tempZip = `${safeProjectRoot}${ZIP_TEMP_SUFFIX}-${Date.now()}`;
        await rebuildZipWithReplacement(
          safeProjectRoot,
          tempZip,
          normalized,
          content,
          logger,
        );
        await atomicReplace(tempZip, safeProjectRoot, logger);
        return { path: `${safeProjectRoot}:${normalized}` };
      },
    },
  ]);
}
