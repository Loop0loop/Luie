import type { DragData } from "@shared/ui/GlobalDragContext";
import type { EditorUiMode } from "@shared/types";

/** 스크리브너는 원고 선택이 메인 화면 전환까지 완료해야 한다. */
export const getChapterDropMainView = (
  uiMode: EditorUiMode,
  dragType: DragData["type"],
) =>
  uiMode === "scrivener" && dragType === "chapter"
    ? { type: "editor" as const }
    : null;
