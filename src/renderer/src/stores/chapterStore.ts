import { create } from "zustand";
import type { Chapter } from "../../../shared/types";
import { createCRUDSlice } from "./createCRUDStore";
import type { CRUDStore } from "./createCRUDStore";
import type { ChapterCreateInput, ChapterUpdateInput } from "../../../shared/types";

// Base CRUD Store 타입 정의
type BaseChapterStore = CRUDStore<
  Chapter,
  ChapterCreateInput,
  ChapterUpdateInput
>;

// 확장된 Store 타입 정의
interface ChapterStore extends BaseChapterStore {
  reorderChapters: (chapterIds: string[]) => Promise<void>;

  // 호환성 필드
  chapters: Chapter[];
  currentChapter: Chapter | null;
}

export const useChapterStore = create<ChapterStore>((set, get, store) => {
  const setWithAlias: typeof set = (partial) =>
    set((state) => {
      const next = typeof partial === "function" ? partial(state) : partial;
      const nextItems =
        (next as Partial<ChapterStore>).items ?? state.items;
      const nextCurrent =
        (next as Partial<ChapterStore>).currentItem ?? state.currentItem;

      return {
        ...next,
        chapters: nextItems,
        currentChapter: nextCurrent as Chapter | null,
      } as Partial<ChapterStore>;
    });

  // Base CRUD Slice 생성
  const apiClient = {
    ...window.api.chapter,
    getAll: (parentId?: string) => window.api.chapter.getAll(parentId || ""),
  };

  const crudSlice = createCRUDSlice<
    Chapter,
    ChapterCreateInput,
    ChapterUpdateInput
  >(apiClient, "Chapter")(setWithAlias, get, store);

  return {
    ...crudSlice,
    reorderChapters: async (chapterIds: string[]) => {
      const { items } = get();
      const projectId = items[0]?.projectId;

      if (!projectId) {
        return;
      }

      try {
        const response = await window.api.chapter.reorder(
          projectId,
          chapterIds,
        );
        if (response.success) {
          set((state) => ({
            items: chapterIds
              .map((id) => state.items.find((ch) => ch.id === id))
              .filter((ch): ch is Chapter => ch !== undefined)
              .map((ch, index) => ({ ...ch, order: index + 1 })),
          }));
        }
      } catch (error) {
        window.api.logger.error("Failed to reorder chapters:", error);
      }
    },

    // 호환성 필드
    chapters: crudSlice.items,
    currentChapter: crudSlice.currentItem,
  };
});
