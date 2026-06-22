/**
 * useCanvasScope — manages automatic scope resolution.
 *
 * Rules:
 *   - scope === null + activeChapterId exists → auto-set single-chapter scope
 *   - scope already set → leave it alone
 *   - activeChapterId changes → only update scope if scope was auto-set
 *     (i.e. user hasn't manually changed range)
 *
 * scope는 effect deps에서 제외하고 ref로 읽습니다.
 * scope 자체가 변경될 때 effect가 재실행되면 불필요한 순환이 발생하기 때문입니다.
 */
import { useEffect, useRef } from "react";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useCanvasViewStore } from "../stores";
import type { CanvasScope } from "../types";

export function useCanvasScope(): CanvasScope | null {
  const scope = useCanvasViewStore((state) => state.scope);
  const setScope = useCanvasViewStore((state) => state.setScope);

  const activeChapterId = useChapterStore(
    (state) => state.currentItem?.id ?? null,
  );

  // 자동 설정된 chapterId를 추적합니다.
  const autoSetChapterIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeChapterId) return;

    // 스토어의 현재 scope를 의존성 없이 실시간으로 직접 쿼리합니다.
    const currentScope = useCanvasViewStore.getState().scope;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    // scope가 없으면 현재 챕터로 자동 설정합니다.
    if (!currentScope) {
      timeoutId = setTimeout(() => {
        setScope({ kind: "single-chapter", chapterId: activeChapterId });
      }, 0);
      autoSetChapterIdRef.current = activeChapterId;
    }
    // 챕터가 바뀌었고 이전 scope가 자동 설정된 것이라면 따라갑니다.
    else if (
      autoSetChapterIdRef.current !== null &&
      autoSetChapterIdRef.current !== activeChapterId &&
      currentScope.kind === "single-chapter" &&
      currentScope.chapterId === autoSetChapterIdRef.current
    ) {
      timeoutId = setTimeout(() => {
        setScope({ kind: "single-chapter", chapterId: activeChapterId });
      }, 0);
      autoSetChapterIdRef.current = activeChapterId;
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [activeChapterId, setScope]);

  return scope;
}
