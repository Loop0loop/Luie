import { create } from "zustand";
import type { Chapter } from "@shared/types";
import {
  createAliasSetter,
  createCRUDSlice,
  withProjectScopedGetAll,
} from "@renderer/shared/store/createCRUDStore";
import type { CRUDStore } from "@renderer/shared/store/createCRUDStore";
import type { ChapterCreateInput, ChapterUpdateInput } from "@shared/types";
import { api } from "@shared/api";

type BaseChapterStore = CRUDStore<
  Chapter,
  ChapterCreateInput,
  ChapterUpdateInput
>;

interface ChapterStore extends BaseChapterStore {
  reorderChapters: (chapterIds: string[]) => Promise<void>;

  chapters: Chapter[];
  currentChapter: Chapter | null;
  // NOTE: 스냅샷 복원 등 외부에서 챕터 본문이 바뀔 때 Editor를 리마운트시키기 위한 리비전.
  contentRevision: number;
  bumpContentRevision: () => void;
}

export const useChapterStore = create<ChapterStore>((set, get, store) => {
  const setWithAlias = createAliasSetter<ChapterStore, Chapter>(
    set,
    "chapters",
    "currentChapter",
  );

  const apiClient = withProjectScopedGetAll(api.chapter);

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
        const response = await api.chapter.reorder(
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
        api.logger.error("Failed to reorder chapters:", error);
      }
    },

    chapters: crudSlice.items,
    currentChapter: crudSlice.currentItem,
    contentRevision: 0,
    bumpContentRevision: () =>
      set((state) => ({ contentRevision: state.contentRevision + 1 })),
  };
});
