import { create } from "zustand";
import type { Character } from "@shared/types";
import {
  createAliasSetter,
  createCRUDSlice,
  withProjectScopedGetAll,
} from "@renderer/shared/store/createCRUDStore";
import type { CRUDStore } from "@renderer/shared/store/createCRUDStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { refreshWorldGraph } from "@renderer/features/research/utils/worldGraphRefresh";
import { runWithProjectLock } from "@renderer/features/research/utils/projectMutationLock";
import {
  type CharacterCreateInput,
  type CharacterUpdateInput,
} from "@shared/types";
import { api } from "@shared/api";

type BaseCharacterStore = CRUDStore<
  Character,
  CharacterCreateInput,
  CharacterUpdateInput
>;

interface CharacterStore extends BaseCharacterStore {
  // 별칭 메서드들
  loadCharacters: (projectId: string) => Promise<void>;
  loadCharacter: (id: string) => Promise<void>;
  createCharacter: (input: CharacterCreateInput) => Promise<void>;
  updateCharacter: (input: CharacterUpdateInput) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  setCurrentCharacter: (character: Character | null) => void;

  // 호환성 필드
  characters: Character[];
  currentCharacter: Character | null;
}

export const useCharacterStore = create<CharacterStore>((set, _get, store) => {
  const setWithAlias = createAliasSetter<CharacterStore, Character>(
    set,
    "characters",
    "currentCharacter",
  );
  const mutationLocks = new Set<string>();

  const apiClient = withProjectScopedGetAll(api.character);

  const crudSlice = createCRUDSlice<
    Character,
    CharacterCreateInput,
    CharacterUpdateInput
  >(apiClient, "Character")(setWithAlias, _get, store);

  const reloadCurrentGraph = async (projectId?: string | null) => {
    await refreshWorldGraph(
      projectId ?? useProjectStore.getState().currentItem?.id,
    );
  };

  const createCharacterWithSync = async (input: CharacterCreateInput) => {
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

  const updateCharacterWithSync = async (input: CharacterUpdateInput) => {
    const projectId = useProjectStore.getState().currentItem?.id;
    if (!projectId) {
      return;
    }

    await runWithProjectLock(mutationLocks, projectId, async () => {
      await crudSlice.update(input);
      await reloadCurrentGraph(projectId);
    });
  };

  const deleteCharacterWithSync = async (id: string) => {
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
    create: createCharacterWithSync,
    update: updateCharacterWithSync,
    delete: deleteCharacterWithSync,
    loadCharacters: (projectId: string) => crudSlice.loadAll(projectId),
    loadCharacter: (id: string) => crudSlice.loadOne(id),
    createCharacter: async (input: CharacterCreateInput) => {
      await createCharacterWithSync(input);
    },
    updateCharacter: async (input: CharacterUpdateInput) => {
      await updateCharacterWithSync(input);
    },
    deleteCharacter: async (id: string) => {
      await deleteCharacterWithSync(id);
    },
    setCurrentCharacter: (character: Character | null) =>
      crudSlice.setCurrent(character),

    // 호환성을 위한 속성 매핑 (초기값)
    characters: crudSlice.items,
    currentCharacter: crudSlice.currentItem,
  };
});
