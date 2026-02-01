import type { ErrorCodeType } from "../../shared/constants/index.js";

export class ServiceError extends Error {
  code: ErrorCodeType;
  details?: Record<string, unknown>;

  constructor(
    code: ErrorCodeType,
    message: string,
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super(message);
    this.code = code;
    this.details = details;
    if (cause) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  );
}
