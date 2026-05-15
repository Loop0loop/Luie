import type { CanvasScope } from "../types/canvasScope.types";

/**
 * Scope 동등성 검사.
 *
 * Scope는 union이라 단순 reference compare가 불가하다. Active scope 강조
 * UI에서 자주 호출되므로 짧은 경로(같은 type만 비교)로 끝낸다.
 */
export function isSameScope(a: CanvasScope, b: CanvasScope): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case "single-chapter":
      return b.type === "single-chapter" && a.chapterId === b.chapterId;
    case "chapter-range":
      return (
        b.type === "chapter-range" &&
        a.fromChapterId === b.fromChapterId &&
        a.toChapterId === b.toChapterId
      );
    case "arc":
      return b.type === "arc" && a.arcId === b.arcId;
    case "custom":
      return (
        b.type === "custom" &&
        a.chapterIds.length === b.chapterIds.length &&
        a.chapterIds.every((id, i) => id === b.chapterIds[i])
      );
  }
}

/**
 * 주어진 chapter id가 scope 안에 포함되는지.
 *
 * Project Tree에서 현재 scope에 포함된 chapter에 ●를 표시할 때 쓴다.
 * Range 비교는 chapter order가 필요하므로 호출자가 chapterOrderById
 * map을 제공해야 한다 (이 함수는 데이터 모델에 의존하지 않는다).
 */
export function isChapterInScope(
  scope: CanvasScope,
  chapterId: string,
  chapterOrderById: ReadonlyMap<string, number>,
): boolean {
  switch (scope.type) {
    case "single-chapter":
      return scope.chapterId === chapterId;
    case "chapter-range": {
      const target = chapterOrderById.get(chapterId);
      const from = chapterOrderById.get(scope.fromChapterId);
      const to = chapterOrderById.get(scope.toChapterId);
      if (target === undefined || from === undefined || to === undefined) {
        return false;
      }
      const lo = Math.min(from, to);
      const hi = Math.max(from, to);
      return target >= lo && target <= hi;
    }
    case "arc":
      // arc 데이터 모델 미정 — Phase 4에서 chapter-arc 매핑이 들어오면 구현.
      return false;
    case "custom":
      return scope.chapterIds.includes(chapterId);
  }
}

/**
 * Scope에 매칭되는 chapter id 배열을 정렬된 순서로 반환.
 *
 * Projection 빌드의 첫 단계 입력값이다. order map이 없으면 빈 배열.
 */
export function resolveScopeChapterIds(
  scope: CanvasScope,
  chapterOrderById: ReadonlyMap<string, number>,
): string[] {
  const allIds = Array.from(chapterOrderById.keys());
  const sortByOrder = (a: string, b: string): number => {
    const ao = chapterOrderById.get(a) ?? 0;
    const bo = chapterOrderById.get(b) ?? 0;
    return ao - bo;
  };

  switch (scope.type) {
    case "single-chapter":
      return chapterOrderById.has(scope.chapterId) ? [scope.chapterId] : [];
    case "chapter-range": {
      const from = chapterOrderById.get(scope.fromChapterId);
      const to = chapterOrderById.get(scope.toChapterId);
      if (from === undefined || to === undefined) return [];
      const lo = Math.min(from, to);
      const hi = Math.max(from, to);
      return allIds
        .filter((id) => {
          const o = chapterOrderById.get(id);
          return o !== undefined && o >= lo && o <= hi;
        })
        .sort(sortByOrder);
    }
    case "arc":
      return [];
    case "custom":
      return scope.chapterIds.filter((id) => chapterOrderById.has(id));
  }
}
