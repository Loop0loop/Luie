import {
  PROJECT_LAYOUT_SCHEMA_VERSION,
  STORAGE_KEY_PROJECT_LAYOUT,
} from "@shared/constants";
import {
  buildRecoveryEventData,
  buildValidationFailureData,
  emitOperationalLog,
} from "@shared/logger";
import type { ZodError } from "zod";

export const getBrowserLogger = () =>
  typeof window === "undefined" ? null : (window.api?.logger ?? null);

export const resetPersistedProjectLayoutStorage = (
  action: string,
  reason: string,
  persistedVersion?: number,
): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_PROJECT_LAYOUT);
  } catch {
    // Best effort recovery only.
  }

  emitOperationalLog(
    getBrowserLogger(),
    "info",
    "Project layout persisted state reset",
    buildRecoveryEventData({
      scope: "project-layout-store",
      event: "persist.reset",
      storageKey: STORAGE_KEY_PROJECT_LAYOUT,
      source: "localStorage",
      action,
      reason,
      persistedVersion,
      targetVersion: PROJECT_LAYOUT_SCHEMA_VERSION,
    }),
  );
};

export const warnPersistValidation = (
  message: string,
  error: ZodError,
  persistedVersion?: number,
): void => {
  emitOperationalLog(
    getBrowserLogger(),
    "warn",
    message,
    buildValidationFailureData({
      scope: "project-layout-store",
      domain: "persist",
      source: "localStorage",
      storageKey: STORAGE_KEY_PROJECT_LAYOUT,
      fallback: "reset_to_defaults",
      persistedVersion,
      targetVersion: PROJECT_LAYOUT_SCHEMA_VERSION,
      error,
    }),
  );
};
