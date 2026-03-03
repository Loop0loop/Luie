import * as fsp from "fs/promises";
import * as path from "path";
import { LUIE_PACKAGE_EXTENSION } from "../../../shared/constants/index.js";
import { ErrorCode } from "../../../shared/constants/errorCode.js";
import { ensureLuieExtension } from "../../utils/luiePackage.js";
import { ensureSafeAbsolutePath } from "../../utils/pathValidation.js";
import { ServiceError } from "../../utils/serviceError.js";

const APPROVED_ROOT_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_APPROVED_ROOTS = 128;

export type FsPathPermission = "read" | "write" | "package";

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

export const approvePathForSession = async (
  inputPath: string,
  permissions: FsPathPermission[],
  treatAs: "file" | "directory" = "file",
): Promise<void> => {
  const safePath = ensureSafeAbsolutePath(inputPath, "path");
  const rootPath = treatAs === "directory" ? safePath : path.dirname(safePath);
  const canonicalRoot = await resolveCanonicalPath(rootPath, "write");
  upsertApprovedRoot(canonicalRoot, permissions);
};

export const resolveApprovedProjectPath = async (projectPath: string): Promise<string> => {
  const safeProjectPath = ensureSafeAbsolutePath(projectPath, "projectPath");
  if (safeProjectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
    return ensureLuieExtension(safeProjectPath);
  }
  const luieCandidate = ensureLuieExtension(safeProjectPath);
  if (luieCandidate === safeProjectPath) {
    return safeProjectPath;
  }
  try {
    await fsp.access(luieCandidate);
    return luieCandidate;
  } catch {
    return safeProjectPath;
  }
};

export const assertAllowedFsPath = async (
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

