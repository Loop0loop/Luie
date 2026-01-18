import { create } from "zustand";
import type { Term } from "@prisma/client";

interface TermStore {
  terms: Term[];
  currentTerm: Term | null;
  isLoading: boolean;

  loadTerms: (projectId: string) => Promise<void>;
  loadTerm: (id: string) => Promise<void>;
  createTerm: (
    projectId: string,
    term: string,
    definition?: string,
    category?: string,
  ) => Promise<void>;
  updateTerm: (
    id: string,
    term?: string,
    definition?: string,
    category?: string,
  ) => Promise<void>;
  deleteTerm: (id: string) => Promise<void>;
  setCurrentTerm: (term: Term | null) => void;
}

export const useTermStore = create<TermStore>((set) => ({
  terms: [],
  currentTerm: null,
  isLoading: false,

  loadTerms: async (projectId: string) => {
    set({ isLoading: true });
    try {
      const response = await window.api.term.getAll(projectId);
      if (response.success && response.data) {
        set({ terms: response.data });
      } else {
        set({ terms: [] });
      }
    } catch (error) {
      console.error("Failed to load terms:", error);
      set({ terms: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  loadTerm: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await window.api.term.get(id);
      if (response.success && response.data) {
        set({ currentTerm: response.data });
      } else {
        set({ currentTerm: null });
      }
    } catch (error) {
      console.error("Failed to load term:", error);
      set({ currentTerm: null });
    } finally {
      set({ isLoading: false });
    }
  },

  createTerm: async (
    projectId: string,
    term: string,
    definition?: string,
    category?: string,
  ) => {
    try {
      const response = await window.api.term.create({
        projectId,
        term,
        definition,
        category,
      });
      if (response.success && response.data) {
        const newTerm: Term = response.data;
        set((state) => ({
          terms: [...state.terms, newTerm],
        }));
      }
    } catch (error) {
      console.error("Failed to create term:", error);
    }
  },

  updateTerm: async (
    id: string,
    term?: string,
    definition?: string,
    category?: string,
  ) => {
    try {
      const response = await window.api.term.update({
        id,
        term,
        definition,
        category,
      });
      if (response.success && response.data) {
        const updatedTerm: Term = response.data;
        set((state) => ({
          terms: state.terms.map((t) => (t.id === id ? updatedTerm : t)),
          currentTerm:
            state.currentTerm?.id === id ? updatedTerm : state.currentTerm,
        }));
      }
    } catch (error) {
      console.error("Failed to update term:", error);
    }
  },

  deleteTerm: async (id: string) => {
    try {
      const response = await window.api.term.delete(id);
      if (response.success) {
        set((state) => ({
          terms: state.terms.filter((t) => t.id !== id),
          currentTerm: state.currentTerm?.id === id ? null : state.currentTerm,
        }));
      }
    } catch (error) {
      console.error("Failed to delete term:", error);
    }
  },

  setCurrentTerm: (term: Term | null) => {
    set({ currentTerm: term });
  },
}));
