/**
 * useCanvasScope — manages automatic scope resolution.
 *
 * Rules:
 *   - scope === null + activeChapterId exists → auto-set single-chapter scope
 *   - scope already set → leave it alone
 *   - activeChapterId changes → only update scope if scope was auto-set
 *     (i.e. user hasn't manually changed range)
 *
 * Returns the resolved scope (may still be null if no chapter is active).
 */
import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useCanvasViewStore } from "../stores";
import type { CanvasScope } from "../types";

export function useCanvasScope(): CanvasScope | null {
  const { scope, setScope } = useCanvasViewStore(
    useShallow((state) => ({
      scope: state.scope,
      setScope: state.setScope,
    })),
  );

  const activeChapterId = useChapterStore(
    (state) => state.currentItem?.id ?? null,
  );

  // Track whether the current scope was auto-set (vs user-chosen).
  const autoSetChapterIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeChapterId) return;

    // No scope yet → auto-set to current chapter.
    if (!scope) {
      setScope({ kind: "single-chapter", chapterId: activeChapterId });
      autoSetChapterIdRef.current = activeChapterId;
      return;
    }

    // Active chapter changed and scope was previously auto-set → follow it.
    if (
      autoSetChapterIdRef.current !== null &&
      autoSetChapterIdRef.current !== activeChapterId &&
      scope.kind === "single-chapter" &&
      scope.chapterId === autoSetChapterIdRef.current
    ) {
      setScope({ kind: "single-chapter", chapterId: activeChapterId });
      autoSetChapterIdRef.current = activeChapterId;
    }
  }, [activeChapterId, scope, setScope]);

  return scope;
}
