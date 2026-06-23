import {
  PROJECT_LAYOUT_SCHEMA_VERSION,
  STORAGE_KEY_PROJECT_LAYOUT,
} from "@shared/constants";
import { buildMigrationEventData, emitOperationalLog } from "@shared/logger";
import type { ProjectLayoutPersistedState } from "@shared/schemas";
import {
  getBrowserLogger,
  resetPersistedProjectLayoutStorage,
} from "./persistLogging";
import { isRecord } from "./sanitize";

export const migrateProjectLayoutPersistedState = (
  persistedState: unknown,
  persistedVersion: number,
): ProjectLayoutPersistedState => {
  if (!isRecord(persistedState)) {
    resetPersistedProjectLayoutStorage(
      "drop_corrupt_payload",
      "persisted_state_not_object",
      persistedVersion,
    );
    return {
      schemaVersion: PROJECT_LAYOUT_SCHEMA_VERSION,
      byProject: {},
    };
  }

  if (persistedVersion > PROJECT_LAYOUT_SCHEMA_VERSION) {
    resetPersistedProjectLayoutStorage(
      "drop_future_version",
      "persisted_state_version_is_newer_than_runtime",
      persistedVersion,
    );
    return {
      schemaVersion: PROJECT_LAYOUT_SCHEMA_VERSION,
      byProject: {},
    };
  }

  if (persistedVersion < PROJECT_LAYOUT_SCHEMA_VERSION) {
    emitOperationalLog(
      getBrowserLogger(),
      "info",
      "Project layout persisted state migrated",
      buildMigrationEventData({
        scope: "project-layout-store",
        storageKey: STORAGE_KEY_PROJECT_LAYOUT,
        source: "localStorage",
        fromVersion: persistedVersion,
        toVersion: PROJECT_LAYOUT_SCHEMA_VERSION,
        status: "migrated",
      }),
    );
  }

  return {
    ...(persistedState as ProjectLayoutPersistedState),
    schemaVersion: PROJECT_LAYOUT_SCHEMA_VERSION,
  };
};
