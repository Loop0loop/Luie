import { create } from "zustand";
import type { ChapterListItem } from "@shared/types";
import type { IPCResponse } from "@shared/ipc";
import {
  createAliasSetter,
  createCRUDSlice,
  withProjectScopedGetAll,
} from "@renderer/shared/store/createCRUDStore";
import type {
  APIClient,
  CRUDStore,
} from "@renderer/shared/store/createCRUDStore";
import type { ChapterCreateInput, ChapterUpdateInput } from "@shared/types";
import { api } from "@shared/api";
import { useChapterContentStore } from "@renderer/features/manuscript/stores/chapterContentStore";

/**
 * 목록 store에 넣을 필드만 남긴다.
 *
 * NOTE: `create`/`update`/`get` 응답은 본문과 저장 상태를 포함한 전체 `Chapter`다
 * (`ChapterSaveResult extends Chapter`). 그대로 items에 넣으면 저장이나 이름 변경을 한 번
 * 거친 챕터부터 본문이 목록에 되살아나 본문 분리가 조용히 무너진다. 필드를 명시적으로
 * 나열해 그 경로를 막는다.
 */
const toChapterListItem = (item: ChapterListItem): ChapterListItem => ({
  id: item.id,
  projectId: item.projectId,
  title: item.title,
  synopsis: item.synopsis,
  order: item.order,
  wordCount: item.wordCount,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  deletedAt: item.deletedAt,
});

const withListOnlyItems = (
  client: APIClient<ChapterListItem, ChapterCreateInput, ChapterUpdateInput>,
): APIClient<ChapterListItem, ChapterCreateInput, ChapterUpdateInput> => {
  const mapOne = (
    response: IPCResponse<ChapterListItem>,
  ): IPCResponse<ChapterListItem> =>
    response.success && response.data
      ? { ...response, data: toChapterListItem(response.data) }
      : response;

  return {
    ...client,
    get: async (id) => mapOne(await client.get(id)),
    create: async (input) => mapOne(await client.create(input)),
    update: async (input) => mapOne(await client.update(input)),
  };
};

// NOTE: 목록 store는 본문을 담지 않는다(`ChapterListItem`). 본문은 `chapterContentStore`가
// 요청된 챕터만 상한을 두고 보관한다. 이 타입을 `Chapter`로 되돌리면 (1) 프로젝트의 모든
// 본문이 렌더러 힙에 상주하고 (2) 자동 저장이 본문을 items에 다시 써서 목록 구독자 전체가
// 리렌더된다.
type BaseChapterStore = CRUDStore<
  ChapterListItem,
  ChapterCreateInput,
  ChapterUpdateInput
>;

interface ChapterStore extends BaseChapterStore {
  reorderChapters: (chapterIds: string[]) => Promise<void>;
  /**
   * 저장 직후 목록/현재 챕터의 제목만 낙관적으로 갱신한다.
   *
   * NOTE: 제목이 실제로 바뀌지 않으면 `items` 배열 참조를 유지한다. 자동 저장은 본문만
   * 바꾸는 경우가 대부분인데, 그때마다 새 배열을 쓰면 사이드바 등 목록 구독자가 전부
   * 리렌더된다. 본문은 이 경로가 아니라 `chapterContentStore`로 간다.
   */
  applyOptimisticTitle: (chapterId: string, title: string) => void;

  chapters: ChapterListItem[];
  currentChapter: ChapterListItem | null;
  // NOTE: 스냅샷 복원 등 외부에서 챕터 본문이 바뀔 때 Editor를 리마운트시키기 위한 리비전.
  contentRevision: number;
  bumpContentRevision: () => void;
}

export const useChapterStore = create<ChapterStore>((set, get, store) => {
  const setWithAlias = createAliasSetter<ChapterStore, ChapterListItem>(
    set,
    "chapters",
    "currentChapter",
  );

  const apiClient = withListOnlyItems(withProjectScopedGetAll(api.chapter));

  const crudSlice = createCRUDSlice<
    ChapterListItem,
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
              .filter((ch): ch is ChapterListItem => ch !== undefined)
              .map((ch, index) => ({ ...ch, order: index + 1 })),
          }));
        }
      } catch (error) {
        api.logger.error("Failed to reorder chapters:", error);
      }
    },

    applyOptimisticTitle: (chapterId: string, title: string) => {
      setWithAlias((state) => {
        const target = state.items.find((item) => item.id === chapterId);
        const currentNeedsUpdate =
          state.currentItem?.id === chapterId &&
          state.currentItem.title !== title;
        if ((!target || target.title === title) && !currentNeedsUpdate) {
          return {};
        }

        return {
          items:
            target && target.title !== title
              ? state.items.map((item) =>
                  item.id === chapterId ? { ...item, title } : item,
                )
              : state.items,
          currentItem: currentNeedsUpdate
            ? { ...state.currentItem!, title }
            : state.currentItem,
        };
      });
    },

    chapters: crudSlice.items,
    currentChapter: crudSlice.currentItem,
    contentRevision: 0,
    bumpContentRevision: () =>
      set((state) => ({ contentRevision: state.contentRevision + 1 })),
  };
});
