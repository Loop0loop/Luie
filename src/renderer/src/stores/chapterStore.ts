import { create } from "zustand";
import type { Chapter } from "@prisma/client";

interface ChapterStore {
  chapters: Chapter[];
  currentChapter: Chapter | null;
  isLoading: boolean;

  loadChapters: (projectId: string) => Promise<void>;
  loadChapter: (id: string) => Promise<void>;
  createChapter: (
    projectId: string,
    title: string,
    synopsis?: string,
  ) => Promise<void>;
  updateChapter: (
    id: string,
    title?: string,
    content?: string,
    synopsis?: string,
  ) => Promise<void>;
  deleteChapter: (id: string) => Promise<void>;
  reorderChapters: (chapterIds: string[]) => Promise<void>;
  setCurrentChapter: (chapter: Chapter | null) => void;
}

export const useChapterStore = create<ChapterStore>((set, get) => ({
  chapters: [],
  currentChapter: null,
  isLoading: false,

  loadChapters: async (projectId: string) => {
    set({ isLoading: true });
    try {
      const response = await window.api.chapter.getAll(projectId);
      if (response.success && response.data) {
        set({ chapters: response.data });
      }
    } catch (error) {
      console.error("Failed to load chapters:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadChapter: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await window.api.chapter.get(id);
      if (response.success && response.data) {
        set({ currentChapter: response.data });
      }
    } catch (error) {
      console.error("Failed to load chapter:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  createChapter: async (
    projectId: string,
    title: string,
    synopsis?: string,
  ) => {
    try {
      const response = await window.api.chapter.create({
        projectId,
        title,
        synopsis,
      });
      if (response.success && response.data) {
        set((state) => ({
          chapters: [...state.chapters, response.data],
        }));
      }
    } catch (error) {
      console.error("Failed to create chapter:", error);
    }
  },

  updateChapter: async (
    id: string,
    title?: string,
    content?: string,
    synopsis?: string,
  ) => {
    try {
      const response = await window.api.chapter.update({
        id,
        title,
        content,
        synopsis,
      });
      if (response.success && response.data) {
        set((state) => ({
          chapters: state.chapters.map((ch) =>
            ch.id === id ? response.data : ch,
          ),
          currentChapter:
            state.currentChapter?.id === id
              ? response.data
              : state.currentChapter,
        }));
      }
    } catch (error) {
      console.error("Failed to update chapter:", error);
    }
  },

  deleteChapter: async (id: string) => {
    try {
      const response = await window.api.chapter.delete(id);
      if (response.success) {
        set((state) => ({
          chapters: state.chapters.filter((ch) => ch.id !== id),
          currentChapter:
            state.currentChapter?.id === id ? null : state.currentChapter,
        }));
      }
    } catch (error) {
      console.error("Failed to delete chapter:", error);
    }
  },

  reorderChapters: async (chapterIds: string[]) => {
    const { chapters } = get();
    const projectId = chapters[0]?.projectId;

    if (!projectId) {
      return;
    }

    try {
      const response = await window.api.chapter.reorder(projectId, chapterIds);
      if (response.success) {
        set((state) => ({
          chapters: chapterIds
            .map((id) => state.chapters.find((ch) => ch.id === id))
            .filter((ch): ch is Chapter => ch !== undefined)
            .map((ch, index) => ({ ...ch, order: index + 1 })),
        }));
      }
    } catch (error) {
      console.error("Failed to reorder chapters:", error);
    }
  },

  setCurrentChapter: (chapter: Chapter | null) => {
    set({ currentChapter: chapter });
  },
}));
