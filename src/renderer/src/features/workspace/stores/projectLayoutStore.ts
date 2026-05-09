import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  PROJECT_LAYOUT_SCHEMA_VERSION,
  STORAGE_KEY_PROJECT_LAYOUT,
} from "@shared/constants";
import {
  buildDefaultLayoutSurfaceRatios,
  normalizeLayoutSurfaceRatiosWithMigrations,
  type LayoutSurfaceId,
} from "@shared/constants/layoutSizing";
import {
  buildDefaultSidebarWidths,
  normalizeSidebarWidthsWithMigrations,
} from "@shared/constants/sidebarSizing";
import {
  type ProjectLayoutPersistedState,
  projectLayoutPersistedStateSchema,
} from "@shared/schemas";
import type {
  DocsRightTab,
  ResearchTab,
  ResizablePanelData,
  ScrivenerSectionId,
  ScrivenerSectionsState,
} from "./uiStore";
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

const PERSISTABLE_RESEARCH_TABS = new Set<ResearchTab>([
  "character",
  "world",
  "event",
  "faction",
  "scrap",
  "analysis",
]);

const WORKSPACE_PANEL_MIN_SIZE = 15;
const WORKSPACE_PANEL_MAX_SIZE = 90;

export type ProjectWorkspaceLayoutState = {
  panels: ResizablePanelData[];
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
  editor: {
    activeChapterId: string | null;
    scrollYByChapter: Record<string, number>;
  };
  workspace: ProjectWorkspaceLayoutState;
  sidebarWidths: Record<string, number>;
  layoutSurfaceRatios: Record<LayoutSurfaceId, number>;
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
  editor: {
    activeChapterId: null,
    scrollYByChapter: {},
  },
  workspace: {
    panels: [],
  },
  sidebarWidths: buildDefaultSidebarWidths(),
  layoutSurfaceRatios: buildDefaultLayoutSurfaceRatios(),
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

const normalizeWorkspacePanelSize = (size: unknown): number | null => {
  if (typeof size !== "number" || !Number.isFinite(size)) return null;
  return Math.min(
    WORKSPACE_PANEL_MAX_SIZE,
    Math.max(WORKSPACE_PANEL_MIN_SIZE, size),
  );
};

export const sanitizeWorkspacePanels = (
  input: unknown,
): ResizablePanelData[] => {
  if (!Array.isArray(input)) return [];

  const panels: ResizablePanelData[] = [];
  const seenIds = new Set<string>();

  for (const candidate of input) {
    if (!isRecord(candidate) || typeof candidate.id !== "string") continue;
    if (seenIds.has(candidate.id)) continue;

    const size = normalizeWorkspacePanelSize(candidate.size);
    if (size === null) continue;

    const content = isRecord(candidate.content) ? candidate.content : {};
    if (content.type === "research") {
      const tab = content.tab;
      if (typeof tab !== "string" || !PERSISTABLE_RESEARCH_TABS.has(tab as ResearchTab)) {
        continue;
      }
      panels.push({
        id: candidate.id,
        content: {
          type: "research",
          ...(typeof content.id === "string" ? { id: content.id } : {}),
          tab: tab as ResearchTab,
        },
        size,
      });
      seenIds.add(candidate.id);
      continue;
    }

    if (content.type === "editor" && typeof content.id === "string") {
      panels.push({
        id: candidate.id,
        content: { type: "editor", id: content.id },
        size,
      });
      seenIds.add(candidate.id);
      continue;
    }

    if (content.type === "export") {
      panels.push({
        id: candidate.id,
        content: { type: "export" },
        size,
      });
      seenIds.add(candidate.id);
    }
  }

  return panels.slice(0, 3);
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
  const editorInput = isRecord(input.editor) ? input.editor : {};
  const workspaceInput = isRecord(input.workspace) ? input.workspace : {};

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
    editor: {
      activeChapterId:
        typeof editorInput.activeChapterId === "string" || editorInput.activeChapterId === null
          ? editorInput.activeChapterId
          : defaults.editor.activeChapterId,
      scrollYByChapter: isRecord(editorInput.scrollYByChapter)
        ? (Object.fromEntries(
            Object.entries(editorInput.scrollYByChapter).filter(([, v]) => typeof v === "number")
          ) as Record<string, number>)
        : defaults.editor.scrollYByChapter,
    },
    workspace: {
      panels: sanitizeWorkspacePanels(workspaceInput.panels),
    },
    sidebarWidths: normalizeSidebarWidthsWithMigrations(input.sidebarWidths),
    layoutSurfaceRatios: normalizeLayoutSurfaceRatiosWithMigrations(
      input.layoutSurfaceRatios,
      input.sidebarWidths,
    ),
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
  hasHydrated: boolean;
  byProject: Record<string, ProjectLayoutState>;
  upsertProjectLayout: (
    projectId: string,
    patch: Partial<ProjectLayoutState>,
  ) => void;
  getProjectLayout: (projectId: string) => ProjectLayoutState;
  clearProjectLayout: (projectId: string) => void;
  setHasHydrated: (value: boolean) => void;
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
    editor: {
      ...previous.editor,
      ...(patch.editor ?? {}),
      scrollYByChapter: {
        ...previous.editor?.scrollYByChapter,
        ...(patch.editor?.scrollYByChapter ?? {}),
      },
    },
    workspace: patch.workspace
      ? {
          ...previous.workspace,
          panels: sanitizeWorkspacePanels(patch.workspace.panels),
        }
      : previous.workspace,
    sidebarWidths: patch.sidebarWidths
      ? normalizeSidebarWidthsWithMigrations({
          ...previous.sidebarWidths,
          ...patch.sidebarWidths,
        })
      : previous.sidebarWidths,
    layoutSurfaceRatios: patch.layoutSurfaceRatios
      ? normalizeLayoutSurfaceRatiosWithMigrations(
          {
            ...previous.layoutSurfaceRatios,
            ...patch.layoutSurfaceRatios,
          },
          patch.sidebarWidths ?? previous.sidebarWidths,
        )
      : previous.layoutSurfaceRatios,
  };
};

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
