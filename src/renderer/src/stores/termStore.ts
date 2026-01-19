import { create } from "zustand";
import type { Term } from "../../../shared/types";
import { createCRUDSlice, CRUDStore } from "./createCRUDStore";
import { TermCreateInput, TermUpdateInput } from "../../../shared/types";

type BaseTermStore = CRUDStore<Term, TermCreateInput, TermUpdateInput>;

interface TermStore extends BaseTermStore {
  // 별칭 메서드들
  loadTerms: (projectId: string) => Promise<void>;
  loadTerm: (id: string) => Promise<void>;
  createTerm: (input: TermCreateInput) => Promise<void>;
  updateTerm: (input: TermUpdateInput) => Promise<void>;
  deleteTerm: (id: string) => Promise<void>;
  setCurrentTerm: (term: Term | null) => void;

  // 호환성 필드
  terms: Term[];
  currentTerm: Term | null;
}

export const useTermStore = create<TermStore>((set, get) => {
  const apiClient = {
    ...window.api.term,
    getAll: (parentId?: string) => window.api.term.getAll(parentId || ""),
  };

  const crudSlice = createCRUDSlice<Term, TermCreateInput, TermUpdateInput>(
    apiClient,
    "Term",
  )(set, get, {
    getState: get,
    setState: set,
    subscribe: () => () => {},
  } as any);

  return {
    ...crudSlice,
    loadTerms: (projectId: string) => crudSlice.loadAll(projectId),
    loadTerm: (id: string) => crudSlice.loadOne(id),
    createTerm: async (input: TermCreateInput) => {
      await crudSlice.create(input);
    },
    updateTerm: async (input: TermUpdateInput) => {
      await crudSlice.update(input);
    },
    deleteTerm: (id: string) => crudSlice.delete(id),
    setCurrentTerm: (term: Term | null) => crudSlice.setCurrent(term),

    // 호환성을 위한 속성 매핑 (초기값)
    terms: crudSlice.items,
    currentTerm: crudSlice.currentItem,
  };
});
