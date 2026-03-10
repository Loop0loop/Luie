import { create } from "zustand";
import { api } from "@shared/api";
import { DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS } from "@shared/constants";
import { createPerformanceTimer } from "@shared/logger";
import type { ScrapMemo } from "@shared/types";
import { worldPackageStorage } from "@renderer/features/research/services/worldPackageStorage";

export type MemoNote = ScrapMemo;
export type MemoNoteInput = Omit<MemoNote, "id" | "updatedAt">;

type MemoStore = {
  activeProjectId: string | null;
  activeProjectPath: string | null;
  notes: MemoNote[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  loadNotes: (
    projectId: string,
    projectPath?: string | null,
    fallbackNotes?: MemoNote[],
  ) => Promise<void>;
  addNote: (projectId: string, note: MemoNoteInput) => MemoNote | null;
  updateNote: (id: string, updates: Partial<Omit<MemoNote, "id">>) => void;
  deleteNote: (id: string) => void;
  flushSave: () => Promise<void>;
  reset: () => void;
};

const buildMemoId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const cloneNotes = (notes: MemoNote[]): MemoNote[] =>
  notes.map((note) => ({
    ...note,
    tags: [...note.tags],
  }));

const normalizeErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const useMemoStore = create<MemoStore>((set, get) => {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingSave: Promise<void> | null = null;

  const clearSaveTimer = (): void => {
    if (!saveTimer) return;
    clearTimeout(saveTimer);
    saveTimer = null;
  };

  const persistNotes = async (): Promise<void> => {
    const { activeProjectId, activeProjectPath, notes } = get();
    if (!activeProjectId) return;

    set((state) =>
      state.isSaving && state.error === null
        ? state
        : { isSaving: true, error: null },
    );

    try {
      await worldPackageStorage.saveScrapMemos(
        activeProjectId,
        activeProjectPath,
        {
          memos: cloneNotes(notes),
        },
      );
    } catch (error) {
      const message = normalizeErrorMessage(error);
      void api.logger.warn("Failed to save memo store state", {
        projectId: activeProjectId,
        error: message,
      });
      if (get().activeProjectId === activeProjectId) {
        set({ error: message });
      }
    } finally {
      if (get().activeProjectId === activeProjectId) {
        set({ isSaving: false });
      }
    }
  };

  const schedulePersist = (): void => {
    const { activeProjectId } = get();
    if (!activeProjectId) return;

    clearSaveTimer();
    saveTimer = setTimeout(() => {
      saveTimer = null;
      pendingSave = persistNotes();
      void pendingSave;
    }, DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS);
  };

  return {
    activeProjectId: null,
    activeProjectPath: null,
    notes: [],
    isLoading: false,
    isSaving: false,
    error: null,
    loadNotes: async (projectId, projectPath, fallbackNotes = []) => {
      clearSaveTimer();

      if (!projectId) {
        set({
          activeProjectId: null,
          activeProjectPath: null,
          notes: [],
          isLoading: false,
          isSaving: false,
          error: null,
        });
        return;
      }

      set({
        activeProjectId: projectId,
        activeProjectPath: projectPath ?? null,
        isLoading: true,
        error: null,
      });
      const timer = createPerformanceTimer({
        scope: "memo-store",
        event: "memo-store.load-notes",
        meta: {
          projectId,
        },
      });

      try {
        const loaded = await worldPackageStorage.loadScrapMemos(
          projectId,
          projectPath,
        );
        if (get().activeProjectId !== projectId) return;

        const nextNotes =
          loaded.memos.length > 0
            ? cloneNotes(loaded.memos)
            : cloneNotes(fallbackNotes);
        set({
          activeProjectId: projectId,
          activeProjectPath: projectPath ?? null,
          notes: nextNotes,
          isLoading: false,
          isSaving: false,
          error: null,
        });
        timer.complete(api.logger, {
          projectId,
          noteCount: nextNotes.length,
        });
      } catch (error) {
        const message = normalizeErrorMessage(error);
        void api.logger.warn("Failed to load memo store state", {
          projectId,
          error: message,
        });
        if (get().activeProjectId !== projectId) return;
        set({
          activeProjectId: projectId,
          activeProjectPath: projectPath ?? null,
          notes: cloneNotes(fallbackNotes),
          isLoading: false,
          isSaving: false,
          error: message,
        });
        timer.fail(api.logger, error, {
          projectId,
          fallbackNoteCount: fallbackNotes.length,
        });
      }
    },
    addNote: (projectId, note) => {
      if (!projectId) return null;

      const nextNote: MemoNote = {
        id: buildMemoId(),
        title: note.title,
        content: note.content,
        tags: [...note.tags],
        updatedAt: new Date().toISOString(),
      };

      let added = false;
      set((state) => {
        if (state.activeProjectId !== projectId) {
          return state;
        }
        added = true;
        return {
          notes: [...state.notes, nextNote],
          error: null,
        };
      });
      if (!added) {
        return null;
      }
      schedulePersist();
      return nextNote;
    },
    updateNote: (id, updates) => {
      let changed = false;
      set((state) => {
        const nextNotes = state.notes.map((note) => {
          if (note.id !== id) return note;
          changed = true;
          return {
            ...note,
            ...updates,
            tags: updates.tags ? [...updates.tags] : note.tags,
            updatedAt: updates.updatedAt ?? new Date().toISOString(),
          };
        });

        return changed
          ? {
              notes: nextNotes,
              error: null,
            }
          : state;
      });

      if (changed) {
        schedulePersist();
      }
    },
    deleteNote: (id) => {
      let changed = false;
      set((state) => {
        const nextNotes = state.notes.filter((note) => note.id !== id);
        changed = nextNotes.length !== state.notes.length;
        return changed
          ? {
              notes: nextNotes,
              error: null,
            }
          : state;
      });

      if (changed) {
        schedulePersist();
      }
    },
    flushSave: async () => {
      clearSaveTimer();
      await pendingSave;
      pendingSave = persistNotes();
      await pendingSave;
    },
    reset: () => {
      clearSaveTimer();
      pendingSave = null;
      set({
        activeProjectId: null,
        activeProjectPath: null,
        notes: [],
        isLoading: false,
        isSaving: false,
        error: null,
      });
    },
  };
});
