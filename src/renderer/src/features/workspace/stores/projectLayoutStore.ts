import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  PROJECT_LAYOUT_SCHEMA_VERSION,
  STORAGE_KEY_PROJECT_LAYOUT,
} from "@shared/constants";
import {
  type ProjectLayoutPersistedState,
  projectLayoutPersistedStateSchema,
} from "@shared/schemas";
import type { DocsRightTab, ScrivenerSectionId, ScrivenerSectionsState } from "./uiStore";
import {
  buildMigrationEventData,
  buildRecoveryEventData,
  buildValidationFailureData,
  createPerformanceTimer,
  emitOperationalLog,
} from "@shared/logger";
import type { ZodError } from "zod";

export type PersistedDocsRightTab =
  | "character"
  | "event"
  | "faction"
  | "world"
  | "scrap"
  | "analysis"
  | "snapshot"
  | "trash"
  | "editor"
  | "export"
  | null;

const PERSISTABLE_DOCS_TABS = new Set<Exclude<PersistedDocsRightTab, null>>([
  "character",
  "event",
  "faction",
  "world",
  "scrap",
  "analysis",
  "snapshot",
  "trash",
  "editor",
  "export",
]);

const DEFAULT_SCRIVENER_SECTIONS: ScrivenerSectionsState = {
  manuscript: true,
  characters: true,
  events: false,
  factions: false,
  world: false,
  scrap: false,
  snapshots: false,
  analysis: false,
  trash: false,
};

export type ProjectLayoutState = {
  main: {
    sidebarOpen: boolean;
    contextOpen: boolean;
  };
  docs: {
    sidebarOpen: boolean;
    binderBarOpen: boolean;
    rightTab: PersistedDocsRightTab;
  };
  scrivener: {
    sidebarOpen: boolean;
    inspectorOpen: boolean;
    sections: ScrivenerSectionsState;
  };
};

const createDefaultProjectLayoutState = (): ProjectLayoutState => ({
  main: {
    sidebarOpen: true,
    contextOpen: true,
  },
  docs: {
    sidebarOpen: true,
    binderBarOpen: true,
    rightTab: null,
  },
  scrivener: {
    sidebarOpen: true,
    inspectorOpen: true,
    sections: { ...DEFAULT_SCRIVENER_SECTIONS },
  },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getBrowserLogger = () =>
  typeof window === "undefined" ? null : (window.api?.logger ?? null);

const resetPersistedProjectLayoutStorage = (
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

const sanitizeScrivenerSections = (input: unknown): ScrivenerSectionsState => {
  const next = { ...DEFAULT_SCRIVENER_SECTIONS };
  if (!isRecord(input)) return next;

  (Object.keys(DEFAULT_SCRIVENER_SECTIONS) as ScrivenerSectionId[]).forEach((section) => {
    if (typeof input[section] === "boolean") {
      next[section] = input[section] as boolean;
    }
  });
  return next;
};

export const sanitizePersistedDocsRightTab = (
  tab: DocsRightTab | PersistedDocsRightTab | null | undefined,
): PersistedDocsRightTab => {
  if (!tab || typeof tab !== "string") return null;
  return PERSISTABLE_DOCS_TABS.has(tab as Exclude<PersistedDocsRightTab, null>)
    ? (tab as PersistedDocsRightTab)
    : null;
};

const sanitizeProjectLayoutState = (input: unknown): ProjectLayoutState => {
  const defaults = createDefaultProjectLayoutState();
  if (!isRecord(input)) return defaults;

  const mainInput = isRecord(input.main) ? input.main : {};
  const docsInput = isRecord(input.docs) ? input.docs : {};
  const scrivenerInput = isRecord(input.scrivener) ? input.scrivener : {};

  return {
    main: {
      sidebarOpen:
        typeof mainInput.sidebarOpen === "boolean"
          ? mainInput.sidebarOpen
          : defaults.main.sidebarOpen,
      contextOpen:
        typeof mainInput.contextOpen === "boolean"
          ? mainInput.contextOpen
          : defaults.main.contextOpen,
    },
    docs: {
      sidebarOpen:
        typeof docsInput.sidebarOpen === "boolean"
          ? docsInput.sidebarOpen
          : defaults.docs.sidebarOpen,
      binderBarOpen:
        typeof docsInput.binderBarOpen === "boolean"
          ? docsInput.binderBarOpen
          : defaults.docs.binderBarOpen,
      rightTab: sanitizePersistedDocsRightTab(docsInput.rightTab as DocsRightTab | null | undefined),
    },
    scrivener: {
      sidebarOpen:
        typeof scrivenerInput.sidebarOpen === "boolean"
          ? scrivenerInput.sidebarOpen
          : defaults.scrivener.sidebarOpen,
      inspectorOpen:
        typeof scrivenerInput.inspectorOpen === "boolean"
          ? scrivenerInput.inspectorOpen
          : defaults.scrivener.inspectorOpen,
      sections: sanitizeScrivenerSections(scrivenerInput.sections),
    },
  };
};

const migrateProjectLayoutPersistedState = (
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

interface ProjectLayoutStore {
  byProject: Record<string, ProjectLayoutState>;
  upsertProjectLayout: (
    projectId: string,
    patch: Partial<ProjectLayoutState>,
  ) => void;
  getProjectLayout: (projectId: string) => ProjectLayoutState;
  clearProjectLayout: (projectId: string) => void;
}

const mergeProjectLayoutState = (
  previous: ProjectLayoutState,
  patch: Partial<ProjectLayoutState>,
): ProjectLayoutState => {
  const patchedSections = patch.scrivener?.sections;
  return {
    main: {
      ...previous.main,
      ...(patch.main ?? {}),
    },
    docs: {
      ...previous.docs,
      ...(patch.docs
        ? {
            ...patch.docs,
            rightTab: sanitizePersistedDocsRightTab(patch.docs.rightTab),
          }
        : {}),
    },
    scrivener: {
      ...previous.scrivener,
      ...(patch.scrivener ?? {}),
      sections: patchedSections
        ? {
            ...previous.scrivener.sections,
            ...patchedSections,
          }
        : previous.scrivener.sections,
    },
  };
};

export const useProjectLayoutStore = create<ProjectLayoutStore>()(
  persist(
    (set, get) => ({
      byProject: {},
      upsertProjectLayout: (projectId, patch) =>
        set((state) => {
          if (!projectId) return state;
          const previous = state.byProject[projectId] ?? createDefaultProjectLayoutState();
          const next = mergeProjectLayoutState(previous, patch);
          return {
            byProject: {
              ...state.byProject,
              [projectId]: next,
            },
          };
        }),
      getProjectLayout: (projectId) => {
        if (!projectId) return createDefaultProjectLayoutState();
        return get().byProject[projectId] ?? createDefaultProjectLayoutState();
      },
      clearProjectLayout: (projectId) =>
        set((state) => {
          if (!state.byProject[projectId]) return state;
          const next = { ...state.byProject };
          delete next[projectId];
          return { byProject: next };
        }),
    }),
    {
      name: STORAGE_KEY_PROJECT_LAYOUT,
      version: PROJECT_LAYOUT_SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) =>
        migrateProjectLayoutPersistedState(persistedState, version),
      partialize: (state) => ({
        schemaVersion: PROJECT_LAYOUT_SCHEMA_VERSION,
        byProject: state.byProject,
      }),
      merge: (persistedState, currentState) => {
        if (!isRecord(persistedState)) {
          resetPersistedProjectLayoutStorage(
            "drop_corrupt_payload",
            "persisted_state_not_object",
          );
          return currentState;
        }

        const parsedPersisted = projectLayoutPersistedStateSchema.safeParse(persistedState);
        if (!parsedPersisted.success) {
          const version =
            typeof persistedState.schemaVersion === "number"
              ? persistedState.schemaVersion
              : undefined;
          warnPersistValidation(
            "Invalid project layout persisted state",
            parsedPersisted.error,
            version,
          );
          resetPersistedProjectLayoutStorage(
            "drop_invalid_payload",
            "schema_validation_failed",
            version,
          );
          return currentState;
        }

        const normalizedByProject: Record<string, ProjectLayoutState> = {};
        Object.entries(parsedPersisted.data.byProject).forEach(([projectId, value]) => {
          normalizedByProject[projectId] = sanitizeProjectLayoutState(value);
        });

        return {
          ...currentState,
          byProject: normalizedByProject,
        };
      },
      onRehydrateStorage: () => {
        const timer = createPerformanceTimer({
          scope: "project-layout-store",
          event: "persist.rehydrate.project-layout-store",
          meta: {
            storageKey: STORAGE_KEY_PROJECT_LAYOUT,
            targetVersion: PROJECT_LAYOUT_SCHEMA_VERSION,
          },
        });

        return (_state, error) => {
          if (error) {
            timer.fail(getBrowserLogger(), error, {
              action: "rehydrate_failed",
            });
            resetPersistedProjectLayoutStorage(
              "drop_rehydrate_failure",
              error instanceof Error ? error.message : String(error),
            );
            return;
          }

          timer.complete(getBrowserLogger(), {
            action: "rehydrate_completed",
          });
        };
      },
    },
  ),
);
