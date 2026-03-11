import { createJSONStorage, type PersistOptions } from "zustand/middleware";
import {
  STORAGE_KEY_UI,
  UI_STORE_SCHEMA_VERSION,
} from "@shared/constants";
import {
  buildDefaultLayoutSurfaceRatios,
  normalizeLayoutSurfaceRatiosWithMigrations,
} from "@shared/constants/layoutSizing";
import {
  buildDefaultSidebarWidths,
  normalizeSidebarWidthsWithMigrations,
} from "@shared/constants/sidebarSizing";
import {
  type UiStorePersistedState,
  uiStorePersistedStateSchema,
} from "@shared/schemas";
import {
  buildMigrationEventData,
  buildRecoveryEventData,
  buildValidationFailureData,
  createPerformanceTimer,
  emitOperationalLog,
} from "@shared/logger";
import type { ZodError } from "zod";
import {
  buildRegionsFromLegacyState,
  cloneRegions,
  DEFAULT_REGIONS,
  isRecord,
  mergeScrivenerSections,
  normalizeRightPanelTab,
} from "./uiStore.regions";
import { DEFAULT_SCRIVENER_SECTIONS, type UIStore } from "./uiStore.types";

const DEFAULT_SIDEBAR_WIDTHS: Record<string, number> = buildDefaultSidebarWidths();
const DEFAULT_LAYOUT_SURFACE_RATIOS = buildDefaultLayoutSurfaceRatios();

const getBrowserLogger = () =>
  typeof window === "undefined" ? null : (window.api?.logger ?? null);

const resetPersistedUiStorage = (
  action: string,
  reason: string,
  persistedVersion?: number,
): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_UI);
  } catch {
    // Best effort recovery only.
  }

  emitOperationalLog(
    getBrowserLogger(),
    "info",
    "UI store persisted state reset",
    buildRecoveryEventData({
      scope: "ui-store",
      event: "persist.reset",
      storageKey: STORAGE_KEY_UI,
      source: "localStorage",
      action,
      reason,
      persistedVersion,
      targetVersion: UI_STORE_SCHEMA_VERSION,
    }),
  );
};

const warnPersistValidation = (
  message: string,
  error: ZodError,
  persistedVersion?: number,
): void => {
  emitOperationalLog(
    getBrowserLogger(),
    "warn",
    message,
    buildValidationFailureData({
      scope: "ui-store",
      domain: "persist",
      source: "localStorage",
      storageKey: STORAGE_KEY_UI,
      fallback: "reset_to_defaults",
      persistedVersion,
      targetVersion: UI_STORE_SCHEMA_VERSION,
      error,
    }),
  );
};

const migrateUiPersistedState = (
  persistedState: unknown,
  persistedVersion: number,
): UiStorePersistedState => {
  if (!isRecord(persistedState)) {
    resetPersistedUiStorage(
      "drop_corrupt_payload",
      "persisted_state_not_object",
      persistedVersion,
    );
    return { schemaVersion: UI_STORE_SCHEMA_VERSION };
  }

  if (persistedVersion > UI_STORE_SCHEMA_VERSION) {
    resetPersistedUiStorage(
      "drop_future_version",
      "persisted_state_version_is_newer_than_runtime",
      persistedVersion,
    );
    return { schemaVersion: UI_STORE_SCHEMA_VERSION };
  }

  if (persistedVersion < UI_STORE_SCHEMA_VERSION) {
    emitOperationalLog(
      getBrowserLogger(),
      "info",
      "UI store persisted state migrated",
      buildMigrationEventData({
        scope: "ui-store",
        storageKey: STORAGE_KEY_UI,
        source: "localStorage",
        fromVersion: persistedVersion,
        toVersion: UI_STORE_SCHEMA_VERSION,
        status: "migrated",
      }),
    );
  }

  return {
    ...(persistedState as UiStorePersistedState),
    schemaVersion: UI_STORE_SCHEMA_VERSION,
  };
};

export const buildUiStorePersistOptions = (): PersistOptions<
  UIStore,
  UiStorePersistedState
> => ({
  name: STORAGE_KEY_UI,
  version: UI_STORE_SCHEMA_VERSION,
  storage: createJSONStorage(() => localStorage),
  migrate: (persistedState, version) =>
    migrateUiPersistedState(persistedState, version),
  partialize: (state) => ({
    schemaVersion: UI_STORE_SCHEMA_VERSION,
    view: state.view,
    contextTab: state.contextTab,
    worldTab: state.worldTab,
    isSidebarOpen: state.isSidebarOpen,
    isContextOpen: state.isContextOpen,
    isManuscriptMenuOpen: state.isManuscriptMenuOpen,
    isBinderBarOpen: state.isBinderBarOpen,
    scrivenerSidebarOpen: state.scrivenerSidebarOpen,
    scrivenerInspectorOpen: state.scrivenerInspectorOpen,
    scrivenerSections: state.scrivenerSections,
    sidebarWidths: normalizeSidebarWidthsWithMigrations(state.sidebarWidths),
    layoutSurfaceRatios: normalizeLayoutSurfaceRatiosWithMigrations(
      state.layoutSurfaceRatios,
      state.sidebarWidths,
    ),
    regions: cloneRegions(state.regions),
  }),
  merge: (persistedState, currentState) => {
    if (!isRecord(persistedState)) {
      resetPersistedUiStorage(
        "drop_corrupt_payload",
        "persisted_state_not_object",
      );
      return currentState;
    }

    const parsedPersisted = uiStorePersistedStateSchema.safeParse(persistedState);
    if (!parsedPersisted.success) {
      const version =
        typeof persistedState.schemaVersion === "number"
          ? persistedState.schemaVersion
          : undefined;
      warnPersistValidation(
        "Invalid UI store persisted state",
        parsedPersisted.error,
        version,
      );
      resetPersistedUiStorage(
        "drop_invalid_payload",
        "schema_validation_failed",
        version,
      );
      return currentState;
    }

    const typedPersisted = parsedPersisted.data as Partial<UIStore>;
    const normalizedSidebarWidths = normalizeSidebarWidthsWithMigrations(
      typedPersisted.sidebarWidths ?? DEFAULT_SIDEBAR_WIDTHS,
    );
    const normalizedLayoutSurfaceRatios = normalizeLayoutSurfaceRatiosWithMigrations(
      typedPersisted.layoutSurfaceRatios ?? DEFAULT_LAYOUT_SURFACE_RATIOS,
      normalizedSidebarWidths,
    );
    const migratedRegions = buildRegionsFromLegacyState({
      isSidebarOpen:
        typeof typedPersisted.isSidebarOpen === "boolean"
          ? typedPersisted.isSidebarOpen
          : undefined,
      isContextOpen:
        typeof typedPersisted.isContextOpen === "boolean"
          ? typedPersisted.isContextOpen
          : undefined,
      docsRightTab: normalizeRightPanelTab(typedPersisted.docsRightTab),
      isBinderBarOpen:
        typeof typedPersisted.isBinderBarOpen === "boolean"
          ? typedPersisted.isBinderBarOpen
          : undefined,
      scrivenerSidebarOpen:
        typeof typedPersisted.scrivenerSidebarOpen === "boolean"
          ? typedPersisted.scrivenerSidebarOpen
          : undefined,
      scrivenerInspectorOpen:
        typeof typedPersisted.scrivenerInspectorOpen === "boolean"
          ? typedPersisted.scrivenerInspectorOpen
          : undefined,
      sidebarWidths: normalizedSidebarWidths,
      regions: typedPersisted.regions ?? DEFAULT_REGIONS,
    });

    const docsRightTab =
      normalizeRightPanelTab(typedPersisted.docsRightTab) ??
      migratedRegions.rightPanel.activeTab;

    return {
      ...currentState,
      ...typedPersisted,
      isSidebarOpen: migratedRegions.leftSidebar.open,
      isContextOpen: migratedRegions.rightPanel.open,
      docsRightTab,
      isBinderBarOpen: migratedRegions.rightRail.open,
      scrivenerSidebarOpen: migratedRegions.leftSidebar.open,
      scrivenerInspectorOpen: migratedRegions.rightPanel.open,
      scrivenerSections:
        typedPersisted.scrivenerSections === undefined
          ? { ...DEFAULT_SCRIVENER_SECTIONS }
          : mergeScrivenerSections(typedPersisted.scrivenerSections),
      sidebarWidths: normalizedSidebarWidths,
      layoutSurfaceRatios: normalizedLayoutSurfaceRatios,
      regions: migratedRegions,
    };
  },
  onRehydrateStorage: () => {
    const timer = createPerformanceTimer({
      scope: "ui-store",
      event: "persist.rehydrate.ui-store",
      meta: {
        storageKey: STORAGE_KEY_UI,
        targetVersion: UI_STORE_SCHEMA_VERSION,
      },
    });

    return (state, error) => {
      if (error) {
        timer.fail(getBrowserLogger(), error, {
          action: "rehydrate_failed",
        });
        resetPersistedUiStorage(
          "drop_rehydrate_failure",
          error instanceof Error ? error.message : String(error),
        );
      } else {
        timer.complete(getBrowserLogger(), {
          action: "rehydrate_completed",
        });
      }
      state?.setHasHydrated(true);
    };
  },
});
