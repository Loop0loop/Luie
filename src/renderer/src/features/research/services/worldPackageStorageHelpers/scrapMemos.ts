import { api } from "@shared/api";
import { WORLD_SCRAP_MEMOS_SCHEMA_VERSION } from "@shared/constants/persistence";
import {
  buildMigrationEventData,
  buildRecoveryEventData,
  buildValidationFailureData,
  emitOperationalLog,
} from "@shared/logger";
import type { WorldScrapMemosPersistedData } from "@shared/schemas";
import { worldScrapMemosDataSchema } from "@shared/schemas";
import type { ZodError } from "zod";

import { buildLocalStorageKey } from "./localStorage";

const toScrapMemosSourceLabel = (
  source: "localStorage" | "luie-package",
): string => (source === "luie-package" ? ".luie package" : "local storage");

export const logScrapMemosValidationFailure = (
  message: string,
  error: ZodError,
  input: {
    source: "localStorage" | "luie-package";
    projectId: string;
    projectPath?: string | null;
    persistedVersion?: number;
  },
) => {
  emitOperationalLog(api.logger, "warn", message, {
    ...buildValidationFailureData({
      scope: "world-scrap-memos",
      domain: "persist",
      source: input.source,
      storageKey:
        input.source === "localStorage"
          ? buildLocalStorageKey(input.projectId, "scrap-memos")
          : undefined,
      fallback: "default_world_scrap_memos",
      persistedVersion: input.persistedVersion,
      targetVersion: WORLD_SCRAP_MEMOS_SCHEMA_VERSION,
      error,
    }),
    projectId: input.projectId,
    ...(input.projectPath ? { projectPath: input.projectPath } : {}),
  });
};

export const logScrapMemosRecovery = (input: {
  event: string;
  action: string;
  source: "localStorage" | "luie-package";
  projectId: string;
  projectPath?: string | null;
  persistedVersion?: number;
  reason: string;
}) => {
  emitOperationalLog(api.logger, "info", "World scrap memos recovery applied", {
    ...buildRecoveryEventData({
      scope: "world-scrap-memos",
      event: input.event,
      storageKey:
        input.source === "localStorage"
          ? buildLocalStorageKey(input.projectId, "scrap-memos")
          : undefined,
      source: input.source,
      action: input.action,
      persistedVersion: input.persistedVersion,
      targetVersion: WORLD_SCRAP_MEMOS_SCHEMA_VERSION,
      reason: input.reason,
    }),
    projectId: input.projectId,
    ...(input.projectPath ? { projectPath: input.projectPath } : {}),
  });
};

export const parseScrapMemosPayload = async (
  payload: unknown,
  input: {
    source: "localStorage" | "luie-package";
    projectId: string;
    projectPath?: string | null;
  },
): Promise<WorldScrapMemosPersistedData | null> => {
  if (payload === null || payload === undefined) {
    return null;
  }

  const parsed = worldScrapMemosDataSchema.safeParse(payload);
  if (!parsed.success) {
    const persistedVersion =
      payload &&
      typeof payload === "object" &&
      typeof (payload as Record<string, unknown>).schemaVersion === "number"
        ? ((payload as Record<string, unknown>).schemaVersion as number)
        : undefined;
    logScrapMemosValidationFailure(
      `Invalid scrap memos payload in ${toScrapMemosSourceLabel(input.source)}`,
      parsed.error,
      {
        ...input,
        persistedVersion,
      },
    );
    return null;
  }

  const persistedVersion = parsed.data.schemaVersion ?? 1;
  if (persistedVersion < WORLD_SCRAP_MEMOS_SCHEMA_VERSION) {
    emitOperationalLog(api.logger, "info", "World scrap memos payload migrated", {
      ...buildMigrationEventData({
        scope: "world-scrap-memos",
        source: input.source,
        fromVersion: persistedVersion,
        toVersion: WORLD_SCRAP_MEMOS_SCHEMA_VERSION,
        status: "migrated",
      }),
      projectId: input.projectId,
      ...(input.projectPath ? { projectPath: input.projectPath } : {}),
    });
  }

  return {
    ...parsed.data,
    schemaVersion: WORLD_SCRAP_MEMOS_SCHEMA_VERSION,
  };
};
