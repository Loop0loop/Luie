/** 저장 비율과 container 너비를 react-resizable-panels용 percentage로 변환한다. */
import { type RefObject } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  getLayoutSurfaceConfig,
  getLayoutSurfaceDefaultRatio,
  getResponsivePanelSize,
  toPanelPercentSize,
  type ResponsivePanelSize,
} from "@renderer/shared/constants/layoutSizing";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useElementWidth } from "@renderer/features/workspace/hooks/useElementWidth";

export interface CanvasPanelLayout {
  activityRatio: number;
  binderRatio: number;
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
