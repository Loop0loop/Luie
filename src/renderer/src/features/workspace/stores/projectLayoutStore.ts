import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  PROJECT_LAYOUT_SCHEMA_VERSION,
  STORAGE_KEY_PROJECT_LAYOUT,
} from "@shared/constants";
import { projectLayoutPersistedStateSchema } from "@shared/schemas";
import { createPerformanceTimer } from "@shared/logger";
import {
  createDefaultProjectLayoutState,
  getBrowserLogger,
  isRecord,
  mergeProjectLayoutState,
  migrateProjectLayoutPersistedState,
  resetPersistedProjectLayoutStorage,
  sanitizePersistedDocsRightTab,
  sanitizeProjectLayoutState,
  sanitizeWorkspacePanels,
  warnPersistValidation,
} from "./projectLayout";
import type {
  PersistedDocsRightTab,
  ProjectLayoutState,
  ProjectLayoutStore,
  ProjectWorkspaceLayoutState,
} from "./projectLayout";

export type {
  PersistedDocsRightTab,
  ProjectLayoutState,
  ProjectWorkspaceLayoutState,
};
export { sanitizePersistedDocsRightTab, sanitizeWorkspacePanels };

export const useProjectLayoutStore = create<ProjectLayoutStore>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
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
      setHasHydrated: (hasHydrated) =>
        set((state) =>
          state.hasHydrated === hasHydrated ? state : { hasHydrated },
        ),
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

        return (state, error) => {
          if (error) {
            timer.fail(getBrowserLogger(), error, {
              action: "rehydrate_failed",
            });
            resetPersistedProjectLayoutStorage(
              "drop_rehydrate_failure",
              error instanceof Error ? error.message : String(error),
            );
            state?.setHasHydrated(true);
            return;
          }

          timer.complete(getBrowserLogger(), {
            action: "rehydrate_completed",
          });
          state?.setHasHydrated(true);
        };
      },
    },
  ),
);
