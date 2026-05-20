import type { CanvasRange, CanvasScope } from "../types/canvas.types";

/**
 * CanvasScope 객체를 기반으로 UI에서 표현될 CanvasRange 형태를 판정하여 리턴합니다.
 */
export function getRangeFromScope(scope: CanvasScope | null): CanvasRange {
  if (!scope) return "current-chapter";
  if (scope.kind === "single-chapter") return "current-chapter";
  if (scope.kind === "three-chapters") return "three-chapters";
  if (scope.kind === "current-part") return "current-part";
  return "whole-project";
}

/**
 * 선택된 CanvasRange에 따라 기존 scope 정보를 바탕으로 새로운 CanvasScope 객체를 생성합니다.
 */
export function getScopeFromRange(
  range: CanvasRange,
  currentScope: CanvasScope | null
): CanvasScope | null {
  if (range === "current-chapter") {
    const existingChapterId =
      currentScope?.kind === "single-chapter"
        ? currentScope.chapterId
        : currentScope?.kind === "three-chapters"
          ? currentScope.centerChapterId
          : null;
    return existingChapterId ? { kind: "single-chapter", chapterId: existingChapterId } : null;
  }

  if (range === "three-chapters") {
    const existingChapterId =
      currentScope?.kind === "single-chapter"
        ? currentScope.chapterId
        : currentScope?.kind === "three-chapters"
          ? currentScope.centerChapterId
          : null;
    return existingChapterId ? { kind: "three-chapters", centerChapterId: existingChapterId } : null;
  }

  if (range === "current-part") {
    const existingPartId = currentScope?.kind === "current-part" ? currentScope.partId : null;
    return existingPartId ? { kind: "current-part", partId: existingPartId } : null;
  }

  return null; // "whole-project"
}
