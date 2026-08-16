import { useTranslation } from "react-i18next";
import { CANVAS_STATUS_BAR_HEIGHT_PX } from "@renderer/shared/constants/layoutSizing";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useCanvasView } from "../../hooks/useCanvasView";
import { CANVAS_MODE_I18N } from "../../constants";
import type { CanvasProjection } from "../../types";

interface CanvasStatusBarProps {
  projection: CanvasProjection | null;
}

export default function CanvasStatusBar({ projection }: CanvasStatusBarProps) {
  const { t } = useTranslation();

  const { mode, scope } = useCanvasView();

  const activeChapterTitle = useChapterStore((state) => {
    const chapterId =
      scope?.kind === "single-chapter"
        ? scope.chapterId
        : scope?.kind === "three-chapters"
          ? scope.centerChapterId
          : null;
    if (!chapterId) return null;
    return state.items.find((c) => c.id === chapterId)?.title ?? null;
  });

  const nodeCount = projection?.nodes.length ?? 0;
  const edgeCount = projection?.edges.length ?? 0;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center gap-3 px-4 text-[10px] font-medium tracking-wide text-muted/75"
      style={{ height: CANVAS_STATUS_BAR_HEIGHT_PX }}
      data-testid="canvas-status-bar"
    >
      <span className="font-semibold text-fg/80 uppercase">
        {t(CANVAS_MODE_I18N[mode] ?? CANVAS_MODE_I18N["flow-map"])}
      </span>

      {activeChapterTitle && (
        <>
          <span className="opacity-30">·</span>
          <span className="max-w-[160px] truncate">{activeChapterTitle}</span>
        </>
      )}

      <div className="flex-1" />

      {projection && (
        <span className="tabular-nums opacity-60">
          {nodeCount} Nodes · {edgeCount} Edges
        </span>
      )}
    </div>
  );
}
