import { create } from "zustand";
import type { Chapter } from "@prisma/client";

interface ChapterStore {
  chapters: Chapter[];
  currentChapter: Chapter | null;
  isLoading: boolean;

  setChapters: (chapters: Chapter[]) => void;
  setCurrentChapter: (chapter: Chapter | null) => void;
  setIsLoading: (loading: boolean) => void;
  addChapter: (chapter: Chapter) => void;
  updateChapter: (id: string, chapter: Partial<Chapter>) => void;
  removeChapter: (id: string) => void;
}

export const useChapterStore = create<ChapterStore>((set) => ({
  chapters: [],
  currentChapter: null,
  isLoading: false,

  setChapters: (chapters) => set({ chapters }),
  setCurrentChapter: (chapter) => set({ currentChapter: chapter }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  addChapter: (chapter) =>
    set((state) => ({
      chapters: [...state.chapters, chapter],
    })),

  updateChapter: (id, updatedChapter) =>
    set((state) => ({
      chapters: state.chapters.map((ch) =>
        ch.id === id ? { ...ch, ...updatedChapter } : ch,
      ),
      currentChapter:
        state.currentChapter?.id === id
          ? { ...state.currentChapter, ...updatedChapter }
          : state.currentChapter,
    })),

  removeChapter: (id) =>
    set((state) => ({
      chapters: state.chapters.filter((ch) => ch.id !== id),
      currentChapter:
        state.currentChapter?.id === id ? null : state.currentChapter,
    })),
}));
