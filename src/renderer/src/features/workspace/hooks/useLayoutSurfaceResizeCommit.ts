import { useEffect, useMemo, useRef } from "react";
import type { PanelSize } from "react-resizable-panels";
import {
  normalizeLayoutSurfaceRatioInput,
  type LayoutSurfaceId,
} from "@renderer/shared/constants/layoutSizing";
import { SIDEBAR_RESIZE_COMMIT_IDLE_MS } from "@renderer/features/workspace/constants/uiDefaults";

type LayoutSurfaceRatioSetter = (surface: LayoutSurfaceId, ratio: number) => void;

type UseLayoutSurfaceResizeCommitOptions = {
  idleMs?: number;
  onCommit?: (surface: LayoutSurfaceId, ratio: number) => void;
};

export type LayoutSurfaceResizeCommitController = {
  /** drag 중 호출한다. 커밋은 idle 후 한 번만 일어난다. */
  onResize: (panelSize: PanelSize) => void;
  /**
   * 대기 중인 커밋을 즉시 반영한다.
   *
   * 드래그를 놓는 시점에 호출해야 한다. 폭을 DOM에 직접 쓰는 호출부(hover flyout)는 이
   * 커밋이 같은 tick에 반영되지 않으면, 렌더가 아직 예전 ratio로 폭을 계산해 패널이
   * 한 프레임 튄다.
   */
  endInteraction: () => void;
};

export function useLayoutSurfaceResizeCommit(
  surface: LayoutSurfaceId,
  setLayoutSurfaceRatio: LayoutSurfaceRatioSetter,
  options?: UseLayoutSurfaceResizeCommitOptions,
): LayoutSurfaceResizeCommitController {
  const idleMs = options?.idleMs ?? SIDEBAR_RESIZE_COMMIT_IDLE_MS;
  const pendingRatioRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedRatioRef = useRef<number | null>(null);

  // NOTE: `options`는 호출부에서 대개 인라인 객체(`{ onCommit }`)로 온다. 그 참조를
  // dependency에 쓰면 매 렌더 새 값이라 아래 memo가 항상 무효화되고, 결과적으로 이 hook이
  // 돌려주는 함수 identity가 매 렌더 바뀐다. 그러면 이걸 dependency로 삼는 호출부의
  // useCallback까지 연쇄로 죽는다. 최신 콜백은 ref로만 들고 identity를 고정한다.
  const onCommitRef = useRef(options?.onCommit);
  useEffect(() => {
    onCommitRef.current = options?.onCommit;
  });

  const controller = useMemo<LayoutSurfaceResizeCommitController>(() => {
    const clearScheduledFlush = () => {
      if (timeoutRef.current === null) return;
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };

    const flushPendingRatio = () => {
      if (pendingRatioRef.current === null) return;

      const nextRatio = pendingRatioRef.current;
      pendingRatioRef.current = null;

      if (
        lastCommittedRatioRef.current !== null &&
        Math.abs(lastCommittedRatioRef.current - nextRatio) < 0.1
      ) {
        return;
      }

      lastCommittedRatioRef.current = nextRatio;
      setLayoutSurfaceRatio(surface, nextRatio);
      onCommitRef.current?.(surface, nextRatio);
    };

    return {
      onResize: (panelSize: PanelSize) => {
        const nextRatio = normalizeLayoutSurfaceRatioInput(
          surface,
          panelSize.asPercentage,
        );
        if (nextRatio === null) return;
        pendingRatioRef.current = nextRatio;
        clearScheduledFlush();
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          flushPendingRatio();
        }, idleMs);
      },
      endInteraction: () => {
        clearScheduledFlush();
        flushPendingRatio();
      },
    };
  }, [idleMs, setLayoutSurfaceRatio, surface]);

  useEffect(() => () => controller.endInteraction(), [controller]);

  return controller;
}
