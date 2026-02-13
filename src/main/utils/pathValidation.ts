import path from "node:path";
import { ErrorCode } from "../../shared/constants/errorCode.js";
import { ServiceError } from "./serviceError.js";

const MAX_PATH_LENGTH = 4096;

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
  return resolved;
}
