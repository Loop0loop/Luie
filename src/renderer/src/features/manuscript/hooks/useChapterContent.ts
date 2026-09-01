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
  /**
   * 마지막 조회가 실패했으면 사유 문자열. 성공/미시도는 null이다.
   * 로딩 중(null + !isLoaded)과 실패(null + error)를 구분하는 용도다.
   */
  error: string | null;
};

export type ChapterContentStatus = {
  isLoaded: boolean;
  error: string | null;
};

/**
 * 본문 문자열 없이 로드 상태만 구독한다.
 *
 * NOTE: EditorRoot 같은 트리 루트가 본문 문자열을 구독하면 자동 저장이 캐시에 쓸 때마다
 * 루트 전체가 리렌더됐다. 상태(원시값)만 구독하고, 본문이 필요한 순간에는
 * `peekChapterContent`로 1회 읽는다 — 이후 캐시 갱신은 Editor 내부 상태가 출처다.
 */
export function useChapterContentStatus(
  chapterId: string | null | undefined,
): ChapterContentStatus {
  const isLoaded = useChapterContentStore((state) =>
    chapterId
      ? Object.prototype.hasOwnProperty.call(state.contentByChapterId, chapterId)
      : false,
  );
  const error = useChapterContentStore((state) =>
    chapterId ? state.loadFailures[chapterId] ?? null : null,
  );
  const ensureContent = useChapterContentStore((state) => state.ensureContent);

  // NOTE: 구독 중임을 캐시에 알린다. 이게 없으면 LRU가 화면이 보고 있는 본문을 버리고,
  // 버려진 순간 isLoaded가 false로 접혔다 다시 열리며 재조회가 연쇄된다.
  useEffect(() => {
    if (!chapterId) return undefined;
    retainChapterContent(chapterId);
    return () => releaseChapterContent(chapterId);
  }, [chapterId]);

  // NOTE: 조회 트리거도 상태 훅의 책임이다. 이걸 빼면 게이트 없는 소비자(EditorRoot 등)의
  // 챕터가 영구 로딩에 머무른다. boolean 의존성이라 본문 재기록(자동 저장)에는 발화하지 않는다.
  useEffect(() => {
    if (!chapterId || isLoaded) return;
    void ensureContent(chapterId);
  }, [chapterId, isLoaded, ensureContent]);

  return { isLoaded, error };
}

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
  const loadError = useChapterContentStore((state) =>
    chapterId ? state.loadFailures[chapterId] ?? null : null,
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
    error: loadError,
  };
}
