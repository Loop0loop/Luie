import path from "node:path";
import { ErrorCode } from "../../shared/constants/errorCode.js";
import { ServiceError } from "./serviceError.js";

const MAX_PATH_LENGTH = 4096;
const RESTRICTED_ROOTS =
  process.platform === "win32"
    ? [path.resolve(process.env.WINDIR ?? "C:\\Windows")]
    : ["/etc", "/bin", "/sbin", "/System", "/private/etc"];

const normalizeForComparison = (value: string): string =>
  process.platform === "win32" ? value.toLowerCase() : value;

const isPathWithinRoot = (targetPath: string, rootPath: string): boolean => {
  const normalizedTarget = normalizeForComparison(path.resolve(targetPath));
  const normalizedRoot = normalizeForComparison(path.resolve(rootPath));
  return (
    normalizedTarget === normalizedRoot ||
    normalizedTarget.startsWith(`${normalizedRoot}${path.sep}`)
  );
};

function assertBasePathInput(input: string, fieldName: string): string {
  if (typeof input !== "string") {
    throw new ServiceError(
      ErrorCode.INVALID_INPUT,
      `${fieldName} must be a string`,
      { fieldName, receivedType: typeof input },
    );
  }

  const trimmed = input.trim();
  if (!trimmed) {
    throw new ServiceError(
      ErrorCode.REQUIRED_FIELD_MISSING,
      `${fieldName} is required`,
      { fieldName },
    );
  }

  if (trimmed.length > MAX_PATH_LENGTH) {
    throw new ServiceError(
      ErrorCode.INVALID_INPUT,
      `${fieldName} is too long`,
      { fieldName, length: trimmed.length, maxLength: MAX_PATH_LENGTH },
    );
  }

  if (trimmed.includes("\0")) {
    throw new ServiceError(
      ErrorCode.INVALID_INPUT,
      `${fieldName} contains invalid null bytes`,
      { fieldName },
    );
  }

  return trimmed;
}

export function ensureSafeAbsolutePath(input: string, fieldName = "path"): string {
  const normalized = assertBasePathInput(input, fieldName);
  if (!path.isAbsolute(normalized)) {
    throw new ServiceError(
      ErrorCode.INVALID_INPUT,
      `${fieldName} must be an absolute path`,
      { fieldName, input: normalized },
    );
  }

  const resolved = path.resolve(normalized);
  for (const restrictedRoot of RESTRICTED_ROOTS) {
    if (isPathWithinRoot(resolved, restrictedRoot)) {
      throw new ServiceError(
        ErrorCode.FS_PERMISSION_DENIED,
        `${fieldName} points to a restricted system path`,
        { fieldName, input: resolved, restrictedRoot: path.resolve(restrictedRoot) },
      );
    }
  }
  return resolved;
}
