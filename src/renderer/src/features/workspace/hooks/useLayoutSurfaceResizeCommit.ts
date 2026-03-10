import { useCallback, useEffect, useRef } from "react";
import type { PanelSize } from "react-resizable-panels";
import {
  normalizeLayoutSurfaceRatioInput,
  type LayoutSurfaceId,
} from "@shared/constants/layoutSizing";
import { SIDEBAR_RESIZE_COMMIT_IDLE_MS } from "@shared/constants/configs";

type LayoutSurfaceRatioSetter = (surface: LayoutSurfaceId, ratio: number) => void;

type UseLayoutSurfaceResizeCommitOptions = {
  idleMs?: number;
};

export function useLayoutSurfaceResizeCommit(
  surface: LayoutSurfaceId,
  setLayoutSurfaceRatio: LayoutSurfaceRatioSetter,
  options?: UseLayoutSurfaceResizeCommitOptions,
) {
  const idleMs = options?.idleMs ?? SIDEBAR_RESIZE_COMMIT_IDLE_MS;
  const pendingRatioRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedRatioRef = useRef<number | null>(null);

  const flushPendingRatio = useCallback(() => {
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
  }, [setLayoutSurfaceRatio, surface]);

  const scheduleFlush = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      flushPendingRatio();
    }, idleMs);
  }, [flushPendingRatio, idleMs]);

  const onResize = useCallback(
    (panelSize: PanelSize) => {
      const nextRatio = normalizeLayoutSurfaceRatioInput(surface, panelSize.asPercentage);
      if (nextRatio === null) return;
      pendingRatioRef.current = nextRatio;
      scheduleFlush();
    },
    [scheduleFlush, surface],
  );

  useEffect(() => () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    flushPendingRatio();
  }, [flushPendingRatio]);

  return onResize;
}
