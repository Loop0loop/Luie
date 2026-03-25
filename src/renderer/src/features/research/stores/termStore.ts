import { create } from "zustand";
import type { Term } from "@shared/types";
import {
  createAliasSetter,
  createCRUDSlice,
  withProjectScopedGetAll,
} from "@renderer/shared/store/createCRUDStore";
import type { CRUDStore } from "@renderer/shared/store/createCRUDStore";
import type { TermCreateInput, TermUpdateInput } from "@shared/types";
import { api } from "@shared/api";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { refreshWorldGraph } from "@renderer/features/research/utils/worldGraphRefresh";
import { runWithProjectLock } from "@renderer/features/research/utils/projectMutationLock";

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

export const useTermStore = create<TermStore>((set, _get, store) => {
  const setWithAlias = createAliasSetter<TermStore, Term>(
    set,
    "terms",
    "currentTerm",
  );
  const mutationLocks = new Set<string>();

  const apiClient = withProjectScopedGetAll(api.term);

  const crudSlice = createCRUDSlice<Term, TermCreateInput, TermUpdateInput>(
    apiClient,
    "Term",
  )(setWithAlias, _get, store);

  const reloadCurrentGraph = async (projectId?: string | null) => {
    await refreshWorldGraph(
      projectId ?? useProjectStore.getState().currentItem?.id,
    );
  };

  const createTermWithSync = async (input: TermCreateInput) => {
    const projectId =
      input.projectId ?? useProjectStore.getState().currentItem?.id;
    if (!projectId) {
      return null;
    }

    return await runWithProjectLock(mutationLocks, projectId, async () => {
      const created = await crudSlice.create({
        ...input,
        projectId,
      });
      if (!created) {
        return null;
      }
      await reloadCurrentGraph(projectId);
      return created;
    });
  };

  const updateTermWithSync = async (input: TermUpdateInput) => {
    const projectId = useProjectStore.getState().currentItem?.id;
    if (!projectId) {
      return;
    }

    await runWithProjectLock(mutationLocks, projectId, async () => {
      await crudSlice.update(input);
      await reloadCurrentGraph(projectId);
    });
  };

  const deleteTermWithSync = async (id: string) => {
    const projectId = useProjectStore.getState().currentItem?.id;
    if (!projectId) {
      return;
    }

    await runWithProjectLock(mutationLocks, projectId, async () => {
      await crudSlice.delete(id);
      await reloadCurrentGraph(projectId);
    });
  };

  return {
    ...crudSlice,
    create: createTermWithSync,
    update: updateTermWithSync,
    delete: deleteTermWithSync,
    loadTerms: (projectId: string) => crudSlice.loadAll(projectId),
    loadTerm: (id: string) => crudSlice.loadOne(id),
    createTerm: async (input: TermCreateInput) => {
      await createTermWithSync(input);
    },
    updateTerm: async (input: TermUpdateInput) => {
      await updateTermWithSync(input);
    },
    deleteTerm: async (id: string) => {
      await deleteTermWithSync(id);
    },
    setCurrentTerm: (term: Term | null) => crudSlice.setCurrent(term),

    // 호환성을 위한 속성 매핑 (초기값)
    terms: crudSlice.items,
    currentTerm: crudSlice.currentItem,
  };
});
