/**
 * useCanvasPanelLayout — derives canvas activity / binder panel sizing.
 *
 * Mirrors the pattern used by ScrivenerLayout and MainLayout:
 *   - container width is observed via {@link useElementWidth}
 *   - persisted ratios live in `uiStore.layoutSurfaceRatios` for
 *     `canvas.activity` and `canvas.binder`
 *   - min/max constraints are converted to container-relative percentages
 *     via {@link getResponsivePanelSize}
 *
 * The returned `defaultSize` strings can be fed straight to react-resizable-panels
 * `<Panel defaultSize={...} minSize={...} maxSize={...}>`.
 */
import { type RefObject } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  getLayoutSurfaceConfig,
  getLayoutSurfaceDefaultRatio,
  getResponsivePanelSize,
  toPanelPercentSize,
  type ResponsivePanelSize,
} from "@shared/constants/layoutSizing";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useElementWidth } from "@renderer/features/workspace/hooks/useElementWidth";

export interface CanvasPanelLayout {
  /** Persisted ratio (0..100) for the activity sidebar. */
  activityRatio: number;
  /** Persisted ratio (0..100) for the binder panel. */
  binderRatio: number;
  /** Default size + min/max as percent strings, ready for `<Panel>`. */
  activitySize: ResponsivePanelSize & { defaultSize: string };
  binderSize: ResponsivePanelSize & { defaultSize: string };
}

export function useCanvasPanelLayout(
  containerRef: RefObject<HTMLElement | null>,
): CanvasPanelLayout {
  const containerWidth = useElementWidth(containerRef);

  const { activityRatio, binderRatio } = useUIStore(
    useShallow((state) => ({
      activityRatio:
        state.layoutSurfaceRatios["canvas.activity"] ||
        getLayoutSurfaceDefaultRatio("canvas.activity"),
      binderRatio:
        state.layoutSurfaceRatios["canvas.binder"] ||
        getLayoutSurfaceDefaultRatio("canvas.binder"),
    })),
  );

  const activityConfig = getLayoutSurfaceConfig("canvas.activity");
  const binderConfig = getLayoutSurfaceConfig("canvas.binder");

  const activityResponsive = getResponsivePanelSize(
    containerWidth,
    activityConfig,
  );
  const binderResponsive = getResponsivePanelSize(containerWidth, binderConfig);

  return {
    activityRatio,
    binderRatio,
    activitySize: {
      ...activityResponsive,
      defaultSize: toPanelPercentSize(activityRatio),
    },
    binderSize: {
      ...binderResponsive,
      defaultSize: toPanelPercentSize(binderRatio),
    },
  };
}
