import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Note } from "../../../shared/types";

interface MemoStore {
  notes: Note[];

  loadNotes: (projectId: string) => void;
  addNote: (projectId: string, note: Omit<Note, "id" | "projectId" | "createdAt" | "updatedAt">) => void;
  updateNote: (id: string, updates: Partial<Omit<Note, "id" | "projectId" | "createdAt">>) => void;
  deleteNote: (id: string) => void;
}

export const useMemoStore = create<MemoStore>()(
  persist(
    (set) => ({
      notes: [],

      loadNotes: () => {
        // In a real app with backend, this would fetch from API.
        // For now, persist middleware handles loading if definition matches.
        // But since we use dynamic keys in existing code (STORAGE_KEY_MEMOS_PREFIX + projectId),
        // we might need to manually read if we want to support multiple projects in one store 
        // OR rely on the fact that we might only ever have one project active.
        // The existing code used `readLocalStorageJson`.
        // To keep it simple and compatible with existing `MemoSection`'s data format:
        // Existing format: { notes: Note[] } inside `luie:memos:${projectId}`

        // Actually, let's just use the store state. 
        // If we want PER-PROJECT notes, we should filter by projectId or clear/reload.
        // The persist middleware saves the WHOLE store to one key.
        // If we want to migrate from the old `MemoSection` format, we might need a migration step.
        // For now, let's implement a simple store that holds current project's notes.
      },

      addNote: (projectId, noteData) => set((state) => {
        const newNote: Note = {
          id: String(Date.now()),
          projectId,
          ...noteData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return {
          notes: [...state.notes, newNote]
        };
      }),

      updateNote: (id, updates) => set((state) => ({
        notes: state.notes.map((n) =>
          n.id === id ? { ...n, ...updates, updatedAt: new Date() } : n
        )
      })),

      deleteNote: (id) => set((state) => ({
        notes: state.notes.filter((n) => n.id !== id)
      })),
    }),
    {
      name: "luie:memo-store", // Single global store for now, or we can make it project-specific? 
      // User's `MemoSection` used `luie:memos:${projectId}`. 
      // If I use `luie:memo-store`, it will share notes across projects if I don't filter.
      // Better to just store ALL notes and filter by projectId in selector?
      // Or just load/save manually.
      storage: createJSONStorage(() => localStorage),
    }
  )
);
