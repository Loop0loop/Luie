import { useEffect } from "react";

import {
  releaseChapterContent,
  retainChapterContent,
  useChapterContentStore,
} from "@renderer/features/manuscript/stores/chapterContentStore";

export type ChapterContentState = {
  content: string;
  /**
   * 본문이 캐시에 도착했는지. 빈 본문도 유효한 값이므로 문자열 truthiness가 아니라
   * 키 존재 여부로 판정한다.
   */
  isLoaded: boolean;
};

/**
 * 챕터 본문을 구독한다.
 *
 * NOTE: map 전체가 아니라 해당 챕터의 본문 문자열만 구독한다. 다른 챕터의 본문이 캐시에
 * 들어오거나 빠져도 이 컴포넌트는 리렌더되지 않는다.
 *
 * 호출부는 `isLoaded`가 false인 동안 본문을 신뢰해서는 안 된다. 특히 에디터는 로딩 중에
 * 마운트하면 빈 본문으로 시작해 자동 저장이 원본을 덮어쓸 수 있다.
 */
export function useChapterContent(
  chapterId: string | null | undefined,
): ChapterContentState {
  const cachedContent = useChapterContentStore((state) =>
    chapterId ? state.contentByChapterId[chapterId] : undefined,
  );
  const ensureContent = useChapterContentStore((state) => state.ensureContent);
  const isLoaded = cachedContent !== undefined;

  // NOTE: 구독 중임을 캐시에 알린다. 이게 없으면 LRU가 화면이 보고 있는 본문을 버릴 수 있고,
  // 아래 재조회 effect와 맞물려 "버림 → 재조회 → 다른 항목 버림 → 재조회"가 끝없이 반복된다.
  useEffect(() => {
    if (!chapterId) return undefined;
    retainChapterContent(chapterId);
    return () => releaseChapterContent(chapterId);
  }, [chapterId]);

  // NOTE: 의존성에 `isLoaded`가 반드시 들어가야 한다. 스냅샷/휴지통 복원은 chapterId를
  // 바꾸지 않고 캐시만 무효화하므로, chapterId만 보면 재조회가 트리거되지 않아 게이트가
  // 영구히 닫히고 본문이 사라진다. boolean이라 본문 편집마다 effect가 재실행되지도 않는다.
  useEffect(() => {
    if (!chapterId || isLoaded) return;
    void ensureContent(chapterId);
  }, [chapterId, isLoaded, ensureContent]);

  return {
    content: cachedContent ?? "",
    isLoaded,
  };
}
