import { create } from "zustand";
import type { Term } from "@prisma/client";

interface TermStore {
  terms: Term[];
  selectedTerm: Term | null;
  isLoading: boolean;

  setTerms: (terms: Term[]) => void;
  setSelectedTerm: (term: Term | null) => void;
  setIsLoading: (loading: boolean) => void;
  addTerm: (term: Term) => void;
  updateTerm: (id: string, term: Partial<Term>) => void;
  removeTerm: (id: string) => void;
}

export const useTermStore = create<TermStore>((set) => ({
  terms: [],
  selectedTerm: null,
  isLoading: false,

  setTerms: (terms) => set({ terms }),
  setSelectedTerm: (term) => set({ selectedTerm: term }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  addTerm: (term) =>
    set((state) => ({
      terms: [...state.terms, term],
    })),

  updateTerm: (id, updatedTerm) =>
    set((state) => ({
      terms: state.terms.map((t) =>
        t.id === id ? { ...t, ...updatedTerm } : t,
      ),
      selectedTerm:
        state.selectedTerm?.id === id
          ? { ...state.selectedTerm, ...updatedTerm }
          : state.selectedTerm,
    })),

  removeTerm: (id) =>
    set((state) => ({
      terms: state.terms.filter((t) => t.id !== id),
      selectedTerm: state.selectedTerm?.id === id ? null : state.selectedTerm,
    })),
}));
