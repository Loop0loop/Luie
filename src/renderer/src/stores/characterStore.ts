import { create } from "zustand";
import type { Character } from "../../../shared/types";
import { createCRUDSlice } from "./createCRUDStore";
import type { CRUDStore } from "./createCRUDStore";
import {
  type CharacterCreateInput,
  type CharacterUpdateInput,
} from "../../../shared/types";

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
  const setWithAlias: typeof set = (partial) =>
    set((state) => {
      const next = typeof partial === "function" ? partial(state) : partial;
      const nextItems =
        (next as Partial<CharacterStore>).items ?? state.items;
      const nextCurrent =
        (next as Partial<CharacterStore>).currentItem ?? state.currentItem;

      return {
        ...next,
        characters: nextItems,
        currentCharacter: nextCurrent as Character | null,
      } as Partial<CharacterStore>;
    });

  const apiClient = {
    ...window.api.character,
    getAll: (parentId?: string) => window.api.character.getAll(parentId || ""),
  };

  const crudSlice = createCRUDSlice<
    Character,
    CharacterCreateInput,
    CharacterUpdateInput
  >(apiClient, "Character")(setWithAlias, _get, store);

  return {
    ...crudSlice,
    loadCharacters: (projectId: string) => crudSlice.loadAll(projectId),
    loadCharacter: (id: string) => crudSlice.loadOne(id),
    createCharacter: async (input: CharacterCreateInput) => {
      await crudSlice.create(input);
    },
    updateCharacter: async (input: CharacterUpdateInput) => {
      await crudSlice.update(input);
    },
    deleteCharacter: (id: string) => crudSlice.delete(id),
    setCurrentCharacter: (character: Character | null) =>
      crudSlice.setCurrent(character),

    // 호환성을 위한 속성 매핑 (초기값)
    characters: crudSlice.items,
    currentCharacter: crudSlice.currentItem,
  };
});
