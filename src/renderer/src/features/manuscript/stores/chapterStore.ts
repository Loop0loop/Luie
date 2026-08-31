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
import { useChapterContentStore } from "@renderer/features/manuscript/stores/chapterContentStore";

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
    // NOTE: 목록을 다시 불러오는 시점은 "본문이 외부에서 바뀌었을 수 있다"는 신호다
    // (프로젝트 전환, 스냅샷 복원, 휴지통 복원, 임포트가 모두 이 경로를 지난다).
    // 여기서 본문 캐시를 비우지 않으면 복원 직후 에디터가 낡은 본문으로 리마운트되고,
    // 그 상태에서 자동 저장이 발화하면 복원한 내용이 되돌려진다. 로드 전에 비워서
    // 그 구간에는 에디터가 게이트에 걸리도록 한다.
    loadAll: async (parentId?: string) => {
      useChapterContentStore.getState().reset();
      await crudSlice.loadAll(parentId);
    },
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
