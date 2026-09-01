import { create } from "zustand";
import { api } from "@shared/api";
import type { Chapter } from "@shared/types";
import { PREVIEW_CHAPTER_CONTENTS } from "@renderer/features/startup/constants/previewData";

/**
 * 챕터 본문 전용 캐시.
 *
 * NOTE: 본문은 챕터 목록(`chapterStore.items`)에서 분리한다. 목록은 제목/순서만 그리는데
 * 본문까지 함께 들고 있으면 (1) 프로젝트의 모든 본문이 렌더러 힙에 상주하고
 * (2) 자동 저장이 본문을 items에 다시 써서 목록 구독자 전체가 리렌더된다.
 * 여기서는 화면이 실제로 요구한 챕터의 본문만 상한을 두고 보관한다.
 *
 * 상한을 두는 이유: 사용자가 챕터를 계속 오가면 캐시가 무한히 커져 원래 문제가 그대로
 * 재현된다. 동시에 필요한 본문은 활성 챕터 1개 + 분할 패널(에디터/스냅샷) 최대 2~3개라
 * 여유를 두고 4로 잡는다.
 */
const CHAPTER_CONTENT_CACHE_LIMIT = 4;

type ChapterContentState = {
  /** chapterId → 본문. 키 존재 여부가 "로딩 완료"를 의미한다(빈 본문도 유효한 값이다). */
  contentByChapterId: Record<string, string>;
  /** chapterId → 마지막 조회 실패 사유. 성공 시 지워진다. */
  loadFailures: Record<string, string>;
  /** LRU 판정용 접근 순서. 앞쪽이 오래된 항목이다. */
  accessOrder: readonly string[];
  ensureContent: (chapterId: string) => Promise<void>;
  setContent: (chapterId: string, content: string) => void;
  forget: (chapterId: string) => void;
  reset: () => void;
};

// NOTE: 같은 챕터에 대한 동시 요청을 하나로 합친다. store state에 두면 in-flight 변화마다
// 구독자가 리렌더되므로 모듈 스코프에 둔다.
const inFlightByChapterId = new Map<string, Promise<void>>();

// NOTE: 화면이 구독 중인 챕터는 상한을 넘어도 버리지 않는다. 버리면 구독자가 즉시 재조회하고
// 그 과정에서 다른 항목이 밀려나 재조회가 연쇄된다(IPC 폭주). 같은 이유로 이 값도 store
// state가 아니라 모듈 스코프에 둔다 — 참조 수 변화는 렌더 결과에 영향이 없다.
const retainCountByChapterId = new Map<string, number>();

// NOTE: 캐시 무효화 세대. reset 시 증가하며, 이전 세대의 응답은 커밋하지 않는다.
let cacheGeneration = 0;

export const retainChapterContent = (chapterId: string): void => {
  if (!chapterId) return;
  retainCountByChapterId.set(
    chapterId,
    (retainCountByChapterId.get(chapterId) ?? 0) + 1,
  );
};

export const releaseChapterContent = (chapterId: string): void => {
  if (!chapterId) return;
  const next = (retainCountByChapterId.get(chapterId) ?? 0) - 1;
  if (next <= 0) {
    retainCountByChapterId.delete(chapterId);
    return;
  }
  retainCountByChapterId.set(chapterId, next);
};

const isRetained = (chapterId: string): boolean =>
  (retainCountByChapterId.get(chapterId) ?? 0) > 0;

const withAccessOrder = (
  accessOrder: readonly string[],
  chapterId: string,
): readonly string[] => [
  ...accessOrder.filter((id) => id !== chapterId),
  chapterId,
];

const evictOverflow = (
  contentByChapterId: Record<string, string>,
  accessOrder: readonly string[],
): { contentByChapterId: Record<string, string>; accessOrder: readonly string[] } => {
  if (accessOrder.length <= CHAPTER_CONTENT_CACHE_LIMIT) {
    return { contentByChapterId, accessOrder };
  }

  const nextContent = { ...contentByChapterId };
  const nextOrder = [...accessOrder];
  // NOTE: 방금 저장한 항목(가장 최근 접근 = 배열 끝)은 축출 후보에서 제외한다. 호출부는
  // `ensureContent` 직후 `peekChapterContent`로 바로 읽는데(복제 경로), 구독 항목이 상한을
  // 가득 채운 상태에서 이걸 버리면 빈 본문을 읽어 사본이 본문 없이 만들어진다.
  const protectedIndex = nextOrder.length - 1;
  // 오래된 순으로 훑되 구독 중인 항목은 건너뛴다. 전부 구독 중이면 상한을 넘겨서라도 유지한다.
  for (
    let index = 0;
    index < protectedIndex && nextOrder.length > CHAPTER_CONTENT_CACHE_LIMIT;

  ) {
    const candidate = nextOrder[index];
    if (isRetained(candidate)) {
      index += 1;
      continue;
    }
    delete nextContent[candidate];
    nextOrder.splice(index, 1);
  }

  return { contentByChapterId: nextContent, accessOrder: nextOrder };
};

export const useChapterContentStore = create<ChapterContentState>((set, get) => ({
  contentByChapterId: {},
  loadFailures: {},
  accessOrder: [],

  ensureContent: async (chapterId: string) => {
    if (!chapterId) return;
    if (Object.prototype.hasOwnProperty.call(get().contentByChapterId, chapterId)) {
      return;
    }

    if (chapterId.startsWith("wizard-preview-")) {
      const previewContent = PREVIEW_CHAPTER_CONTENTS[chapterId] ?? "";
      get().setContent(chapterId, previewContent);
      return;
    }

    const inFlight = inFlightByChapterId.get(chapterId);
    if (inFlight) {
      await inFlight;
      return;
    }

    // NOTE: 무효화(reset) 시점을 세대로 구분한다. 복원 흐름은 "reset → 즉시 재조회"라서
    // 이전 세대의 응답이 나중에 도착하면 복원 이전 본문으로 캐시를 되돌린다.
    const requestGeneration = cacheGeneration;
    const request = (async () => {
      try {
        const response = await api.chapter.get(chapterId);
        if (requestGeneration !== cacheGeneration) {
          return;
        }
        if (!response.success || !response.data) {
          const reason =
            response.error?.message ?? "chapter fetch failed";
          api.logger.warn("ensureContent: chapter fetch failed", { chapterId });
          // NOTE: 실패를 상태로 남긴다. 기록하지 않으면 isLoaded가 영원히 false라
          // 재시도 경로도 없고 UI는 "무반응"과 구분할 수 없다.
          set((state) => ({
            loadFailures: { ...state.loadFailures, [chapterId]: reason },
          }));
          return;
        }
        const chapter = response.data as Chapter;
        get().setContent(chapterId, chapter.content ?? "");
      } catch (error) {
        api.logger.error("ensureContent: chapter fetch threw", error);
        if (requestGeneration !== cacheGeneration) {
          return;
        }
        set((state) => ({
          loadFailures: {
            ...state.loadFailures,
            [chapterId]: (error as Error)?.message ?? "chapter fetch threw",
          },
        }));
      }
    })();

    inFlightByChapterId.set(chapterId, request);
    try {
      await request;
    } finally {
      // NOTE: reset이 map을 비운 뒤 새 요청이 등록됐을 수 있다. 내 요청일 때만 지운다.
      if (inFlightByChapterId.get(chapterId) === request) {
        inFlightByChapterId.delete(chapterId);
      }
    }
  },

  setContent: (chapterId: string, content: string) => {
    if (!chapterId) return;
    set((state) => {
      const accessOrder = withAccessOrder(state.accessOrder, chapterId);
      const next = evictOverflow(
        { ...state.contentByChapterId, [chapterId]: content },
        accessOrder,
      );
      // 본문이 채워졌으니 이전 조회 실패 기록은 해제한다.
      if (!(chapterId in state.loadFailures)) {
        return next;
      }
      const loadFailures = { ...state.loadFailures };
      delete loadFailures[chapterId];
      return { ...next, loadFailures };
    });
  },

  forget: (chapterId: string) => {
    set((state) => {
      if (
        !Object.prototype.hasOwnProperty.call(
          state.contentByChapterId,
          chapterId,
        )
      ) {
        return state;
      }
      const contentByChapterId = { ...state.contentByChapterId };
      delete contentByChapterId[chapterId];
      return {
        contentByChapterId,
        accessOrder: state.accessOrder.filter((id) => id !== chapterId),
      };
    });
  },

  reset: () => {
    cacheGeneration += 1;
    inFlightByChapterId.clear();
    set({ contentByChapterId: {}, accessOrder: [], loadFailures: {} });
  },
}));

/** 렌더 밖(콜백/저장 경로)에서 구독 없이 읽는다. */
export const peekChapterContent = (
  chapterId: string | null | undefined,
): string | undefined => {
  if (!chapterId) return undefined;
  return useChapterContentStore.getState().contentByChapterId[chapterId];
};

export const setChapterContent = (chapterId: string, content: string): void => {
  useChapterContentStore.getState().setContent(chapterId, content);
};

/** 렌더 밖(클릭 핸들러 등)에서 "이 챕터 조회가 실패한 적 있는가"를 확인한다. */
export const hasChapterContentLoadFailure = (
  chapterId: string | null | undefined,
): boolean => {
  if (!chapterId) return false;
  return chapterId in useChapterContentStore.getState().loadFailures;
};

export const ensureChapterContent = async (chapterId: string): Promise<void> => {
  await useChapterContentStore.getState().ensureContent(chapterId);
};
