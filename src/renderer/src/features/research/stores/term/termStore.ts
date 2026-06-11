import { create } from "zustand";
import type { Term, TermCreateInput, TermUpdateInput } from "@shared/types";
import { withProjectScopedGetAll } from "@renderer/shared/store/createCRUDStore";
import { createWorldEntityCRUDStore } from "@renderer/shared/store/createWorldEntityCRUDStore";
import { api } from "@shared/api";

interface TermAliases {
  loadTerms: (projectId: string) => Promise<void>;
  loadTerm: (id: string) => Promise<void>;
  createTerm: (input: TermCreateInput) => Promise<void>;
  updateTerm: (input: TermUpdateInput) => Promise<void>;
  deleteTerm: (id: string) => Promise<boolean>;
  setCurrentTerm: (term: Term | null) => void;
  terms: Term[];
  currentTerm: Term | null;
}

export const useTermStore = create(
  createWorldEntityCRUDStore<Term, TermCreateInput, TermUpdateInput, TermAliases>({
    apiClient: withProjectScopedGetAll(api.term),
    entityName: "Term",
    methodPrefix: "Term",
    aliasItemsKey: "terms",
    aliasCurrentKey: "currentTerm",
  }),
);
