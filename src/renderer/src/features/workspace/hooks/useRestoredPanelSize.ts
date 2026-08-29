import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { Layout, PanelImperativeHandle } from "react-resizable-panels";
import { toPanelPercentSize } from "@renderer/shared/constants/layoutSizing";
import { createLogger } from "@shared/logger";
import { getPanelLayoutValue } from "./useLayoutPersist";

const logger = createLogger("useRestoredPanelSize");

/** 이 폭 안이면 목표 비율이 이미 panel에 반영된 것으로 본다. */
const LIVE_RATIO_TOLERANCE = 0.5;

// NOTE: 저장 폭 적용은 사용자 제스처 중에 절대 일어나면 안 된다. drag 중에도
// `useLayoutPersist`가 멈춤마다 ratio를 커밋하므로, 그 값으로 되돌리면 패널이 특정 px에
// 붙어 있는 것처럼 보인다. 포인터가 눌려 있는 동안에는 적용을 미룬다.
let pointerDownDepth = 0;

const isPointerDown = (): boolean => pointerDownDepth > 0;

if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerdown",
    () => {
      pointerDownDepth += 1;
    },
    { capture: true, passive: true },
  );
  const releasePointer = () => {
    pointerDownDepth = 0;
  };
  window.addEventListener("pointerup", releasePointer, {
    capture: true,
    passive: true,
  });
  window.addEventListener("pointercancel", releasePointer, {
    capture: true,
    passive: true,
  });
}

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
  /**
   * 현재 적용 중인 min/max 제약을 나타내는 값. 변하면 저장 ratio를 다시 적용한다.
   *
   * min/max는 px 상수를 컨테이너 폭으로 나눠 만든다. 그런데 첫 렌더에서는 컨테이너 폭이 아직
   * 0이라 viewport 폭으로 대체되므로, 실제 폭이 도착하기 전까지 밴드가 틀리다. 그 틀린 밴드에
   * 걸려 클램프된 폭은 밴드가 정정된 뒤 다시 적용해야 저장 폭으로 돌아온다.
   */
  constraintsKey?: string;
};

/**
 * project layout restore는 layout component가 mount된 뒤에 저장 ratio를 채우고, 이미 mount된
 * Panel은 `defaultSize`를 다시 읽지 않는다. 앱을 다시 켠 뒤에도 저장 크기를 유지하려면 저장
 * ratio를 panel handle로 직접 적용해야 한다.
 *
 * 사용자 drag가 만든 ratio는 이미 panel에 반영되어 있어 다시 적용하면 drag를 되돌린다. 그래서
 * group이 마지막으로 보고한 실제 비율과 목표 비율이 다를 때만 적용한다.
 *
 * `ratio`는 effect dependency에서 뺄 수 없다. 복원값은 mount 이후 다른 dependency 변화 없이
 * 도착하므로, `isSettled` 전이만 보면 재시작 후 저장 크기를 놓친다. drag 중에는 dependency가
 * 자주 바뀌지만 위 비교로 즉시 early return한다.
 *
 * @returns `PanelGroup.onLayoutChanged`에서 호출할 실제 비율 기록 함수.
 *   `onLayoutChanged` callback이 매 layout 변화마다 재생성되지 않도록 참조가 안정적이어야 한다.
 */
export function useRestoredPanelSize({
  panelId,
  panelIndex,
  panelRef,
  ratio,
  isSettled,
  constraintsKey,
}: UseRestoredPanelSizeOptions): (layout: Layout) => void {
  const liveRatioRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isSettled) return;
    if (isPointerDown()) return;

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
  }, [constraintsKey, isSettled, panelId, panelRef, ratio]);

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
