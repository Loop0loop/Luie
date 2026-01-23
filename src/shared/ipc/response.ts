/**
 * IPC Response types
 */

import { APP_VERSION } from "../constants/app.js";

export interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp?: string;
  };
  meta?: {
    timestamp: string;
    duration?: number;
    version?: string;
  };
}

export function createSuccessResponse<T>(
  data: T,
  meta?: IPCResponse<T>["meta"],
): IPCResponse<T> {
  return {
    success: true,
    data,
    meta: meta ?? {
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
    },
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  meta?: IPCResponse<never>["meta"],
): IPCResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
    meta: meta ?? {
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
    },
  };
}
