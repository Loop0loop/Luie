import { create } from "zustand";
import type {
  Character,
  CharacterCreateInput,
  CharacterUpdateInput,
} from "@shared/types";
import { withProjectScopedGetAll } from "@renderer/shared/store/createCRUDStore";
import { createWorldEntityCRUDStore } from "@renderer/shared/store/createWorldEntityCRUDStore";
import { api } from "@shared/api";

interface CharacterAliases {
  loadCharacters: (projectId: string) => Promise<void>;
  loadCharacter: (id: string) => Promise<void>;
  createCharacter: (input: CharacterCreateInput) => Promise<void>;
  updateCharacter: (input: CharacterUpdateInput) => Promise<void>;
  deleteCharacter: (id: string) => Promise<boolean>;
  setCurrentCharacter: (character: Character | null) => void;
  characters: Character[];
  currentCharacter: Character | null;
}

export const useCharacterStore = create(
  createWorldEntityCRUDStore<Character, CharacterCreateInput, CharacterUpdateInput, CharacterAliases>({
    apiClient: withProjectScopedGetAll(api.character),
    entityName: "Character",
    methodPrefix: "Character",
    aliasItemsKey: "characters",
    aliasCurrentKey: "currentCharacter",
  }),
);
