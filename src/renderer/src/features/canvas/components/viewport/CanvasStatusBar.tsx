/**
 * CanvasStatusBar — bottom chrome of the canvas viewport.
 *
 * P5: mode label, active chapter title, node/edge count wired to stores.
 */
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { CANVAS_STATUS_BAR_HEIGHT_PX } from "@shared/constants/layoutSizing";
import { useCanvasViewStore } from "../../stores";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import type { CanvasProjection } from "../../types";

const MODE_I18N: Record<string, string> = {
  "flow-map": "canvas.mode.flowMap.label",
  "scene-board": "canvas.mode.sceneBoard.label",
  "timeline": "canvas.mode.timeline.label",
  "character-map": "canvas.mode.characterMap.label",
  "memory-map": "canvas.mode.memoryMap.label",
};

interface CanvasStatusBarProps {
  projection: CanvasProjection | null;
}

export default function CanvasStatusBar({ projection }: CanvasStatusBarProps) {
  const { t } = useTranslation();

  const { mode, scope } = useCanvasViewStore(
    useShallow((state) => ({
      mode: state.mode,
      scope: state.scope,
    })),
  );

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
      className="flex shrink-0 items-center gap-3 border-t border-border/40 bg-surface px-3 text-[11px] text-muted"
      style={{ height: CANVAS_STATUS_BAR_HEIGHT_PX }}
      data-testid="canvas-status-bar"
    >
      {/* Mode */}
      <span className="font-medium text-fg/70">
        {t(MODE_I18N[mode] ?? "canvas.mode.flowMap.label")}
      </span>

      {/* Chapter title */}
      {activeChapterTitle && (
        <>
          <span className="opacity-40">·</span>
          <span className="truncate max-w-[160px]">{activeChapterTitle}</span>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Counts */}
      {projection && (
        <span className="tabular-nums opacity-60">
          {nodeCount}N · {edgeCount}E
        </span>
      )}
    </div>
  );
}
