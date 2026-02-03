import { create } from "zustand";
import type { Character } from "../../../shared/types";
import {
  createAliasSetter,
  createCRUDSlice,
  withProjectScopedGetAll,
} from "./createCRUDStore";
import type { CRUDStore } from "./createCRUDStore";
import {
  type CharacterCreateInput,
  type CharacterUpdateInput,
} from "../../../shared/types";
import { api } from "../services/api";

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

  const apiClient = withProjectScopedGetAll(api.character);

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
