import { create } from "zustand";
import type { Character } from "@prisma/client";

interface CharacterStore {
  characters: Character[];
  currentCharacter: Character | null;
  isLoading: boolean;

  loadCharacters: (projectId: string) => Promise<void>;
  loadCharacter: (id: string) => Promise<void>;
  createCharacter: (
    projectId: string,
    name: string,
    description?: string,
    attributes?: Record<string, unknown>,
  ) => Promise<void>;
  updateCharacter: (
    id: string,
    name?: string,
    description?: string,
    attributes?: Record<string, unknown>,
  ) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  setCurrentCharacter: (character: Character | null) => void;
}

export const useCharacterStore = create<CharacterStore>((set) => ({
  characters: [],
  currentCharacter: null,
  isLoading: false,

  loadCharacters: async (projectId: string) => {
    set({ isLoading: true });
    try {
      const response = await window.api.character.getAll(projectId);
      if (response.success && response.data) {
        set({ characters: response.data });
      }
    } catch (error) {
      console.error("Failed to load characters:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadCharacter: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await window.api.character.get(id);
      if (response.success && response.data) {
        set({ currentCharacter: response.data });
      }
    } catch (error) {
      console.error("Failed to load character:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  createCharacter: async (
    projectId: string,
    name: string,
    description?: string,
    attributes?: Record<string, unknown>,
  ) => {
    try {
      const response = await window.api.character.create({
        projectId,
        name,
        description,
        attributes,
      });
      if (response.success && response.data) {
        set((state) => ({
          characters: [...state.characters, response.data],
        }));
      }
    } catch (error) {
      console.error("Failed to create character:", error);
    }
  },

  updateCharacter: async (
    id: string,
    name?: string,
    description?: string,
    attributes?: Record<string, unknown>,
  ) => {
    try {
      const response = await window.api.character.update({
        id,
        name,
        description,
        attributes,
      });
      if (response.success && response.data) {
        set((state) => ({
          characters: state.characters.map((ch) =>
            ch.id === id ? response.data : ch,
          ),
          currentCharacter:
            state.currentCharacter?.id === id
              ? response.data
              : state.currentCharacter,
        }));
      }
    } catch (error) {
      console.error("Failed to update character:", error);
    }
  },

  deleteCharacter: async (id: string) => {
    try {
      const response = await window.api.character.delete(id);
      if (response.success) {
        set((state) => ({
          characters: state.characters.filter((ch) => ch.id !== id),
          currentCharacter:
            state.currentCharacter?.id === id ? null : state.currentCharacter,
        }));
      }
    } catch (error) {
      console.error("Failed to delete character:", error);
    }
  },

  setCurrentCharacter: (character: Character | null) => {
    set({ currentCharacter: character });
  },
}));
