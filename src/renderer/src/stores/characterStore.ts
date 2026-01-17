import { create } from "zustand";
import type { Character } from "@prisma/client";

interface CharacterStore {
  characters: Character[];
  selectedCharacter: Character | null;
  isLoading: boolean;

  setCharacters: (characters: Character[]) => void;
  setSelectedCharacter: (character: Character | null) => void;
  setIsLoading: (loading: boolean) => void;
  addCharacter: (character: Character) => void;
  updateCharacter: (id: string, character: Partial<Character>) => void;
  removeCharacter: (id: string) => void;
}

export const useCharacterStore = create<CharacterStore>((set) => ({
  characters: [],
  selectedCharacter: null,
  isLoading: false,

  setCharacters: (characters) => set({ characters }),
  setSelectedCharacter: (character) => set({ selectedCharacter: character }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  addCharacter: (character) =>
    set((state) => ({
      characters: [...state.characters, character],
    })),

  updateCharacter: (id, updatedCharacter) =>
    set((state) => ({
      characters: state.characters.map((ch) =>
        ch.id === id ? { ...ch, ...updatedCharacter } : ch,
      ),
      selectedCharacter:
        state.selectedCharacter?.id === id
          ? { ...state.selectedCharacter, ...updatedCharacter }
          : state.selectedCharacter,
    })),

  removeCharacter: (id) =>
    set((state) => ({
      characters: state.characters.filter((ch) => ch.id !== id),
      selectedCharacter:
        state.selectedCharacter?.id === id ? null : state.selectedCharacter,
    })),
}));
