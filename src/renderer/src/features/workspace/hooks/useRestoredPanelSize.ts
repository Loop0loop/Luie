import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { Layout, PanelImperativeHandle } from "react-resizable-panels";
import { toPanelPercentSize } from "@renderer/shared/constants/layoutSizing";
import { createLogger } from "@shared/logger";
import { getPanelLayoutValue } from "./useLayoutPersist";

const logger = createLogger("useRestoredPanelSize");

/** 이 폭 안이면 목표 비율이 이미 panel에 반영된 것으로 본다. */
const LIVE_RATIO_TOLERANCE = 0.5;

type UseRestoredPanelSizeOptions = {
  /** `Panel.id`와 같은 값. */
  panelId: string;
  /** react-resizable-panels가 id를 주지 않을 때 사용할 layout index. */
  panelIndex: number;
  panelRef: RefObject<PanelImperativeHandle | null>;
  /** 저장된 layout surface 비율. */
  ratio: number;
  /** panel이 열려 있고 open/close transition 중이 아닐 때만 true. */
  isSettled: boolean;
};

/**
 * project layout restore는 layout component가 mount된 뒤에 저장 ratio를 채우고, 이미 mount된
 * Panel은 `defaultSize`를 다시 읽지 않는다. 앱을 다시 켠 뒤에도 저장 크기를 유지하려면 저장
 * ratio를 panel handle로 직접 적용해야 한다.
 *
 * 사용자 drag가 만든 ratio는 이미 panel에 반영되어 있어 다시 적용하면 drag를 되돌린다. 그래서
 * group이 마지막으로 보고한 실제 비율과 목표 비율이 다를 때만 적용한다.
 *
 * @returns `PanelGroup.onLayoutChanged`에서 호출할 실제 비율 기록 함수.
 */
export function useRestoredPanelSize({
  panelId,
  panelIndex,
  panelRef,
  ratio,
  isSettled,
}: UseRestoredPanelSizeOptions): (layout: Layout) => void {
  const liveRatioRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isSettled) return;

    const liveRatio = liveRatioRef.current;
    if (
      liveRatio !== null &&
      Math.abs(liveRatio - ratio) < LIVE_RATIO_TOLERANCE
    ) {
      return;
    }

    const panel = panelRef.current;
    if (!panel) return;

    const size = toPanelPercentSize(ratio);
    try {
      panel.resize(size);
    } catch (error) {
      // Panel이 group layout에 아직 등록되지 않으면 resize가 throw한다. 이 시점에는 mount 시
      // defaultSize가 같은 값이므로 무시한다.
      logger.debug("Skipped restored panel size apply", {
        panelId,
        size,
        error,
      });
    }
  }, [isSettled, panelId, panelRef, ratio]);

  return useCallback(
    (layout: Layout) => {
      const liveRatio = getPanelLayoutValue(layout, panelId, panelIndex);
      if (typeof liveRatio === "number") {
        liveRatioRef.current = liveRatio;
      }
    },
    [panelId, panelIndex],
  );
}
