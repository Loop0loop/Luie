/** 수동 scope는 보존하고 자동 설정된 single-chapter scope만 chapter 전환을 따라가게 한다. */
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

  const autoSetChapterIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeChapterId) return;

    // NOTE: scope 변경으로 effect가 순환하지 않도록 현재 store snapshot을 직접 읽는다.
    const currentScope = useCanvasViewStore.getState().scope;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (!currentScope) {
      timeoutId = setTimeout(() => {
        setScope({ kind: "single-chapter", chapterId: activeChapterId });
      }, 0);
      autoSetChapterIdRef.current = activeChapterId;
    }
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
