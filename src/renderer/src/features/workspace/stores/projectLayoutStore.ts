import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEY_PROJECT_LAYOUT } from "@shared/constants";
import { projectLayoutPersistedStateSchema } from "@shared/schemas";
import type { DocsRightTab, ScrivenerSectionId, ScrivenerSectionsState } from "./uiStore";
import { z } from "zod";

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

const warnPersistValidation = (message: string, error: z.ZodError): void => {
  if (typeof window === "undefined") return;
  void window.api?.logger?.warn?.(message, z.flattenError(error));
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
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ byProject: state.byProject }),
      merge: (persistedState, currentState) => {
        if (!isRecord(persistedState)) {
          return currentState;
        }

        const parsedPersisted = projectLayoutPersistedStateSchema.safeParse(persistedState);
        if (!parsedPersisted.success) {
          warnPersistValidation(
            "Invalid project layout persisted state",
            parsedPersisted.error,
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
    },
  ),
);
