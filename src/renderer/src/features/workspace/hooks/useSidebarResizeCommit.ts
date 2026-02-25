import { useCallback, useEffect, useRef } from "react";
import type { PanelSize } from "react-resizable-panels";
import {
  clampSidebarWidth,
  type SidebarWidthFeature,
} from "@shared/constants/sidebarSizing";

type SidebarWidthSetter = (feature: string, width: number) => void;

type UseSidebarResizeCommitOptions = {
  idleMs?: number;
};

const DEFAULT_IDLE_MS = 140;

export function useSidebarResizeCommit(
  feature: SidebarWidthFeature,
  setSidebarWidth: SidebarWidthSetter,
  options?: UseSidebarResizeCommitOptions,
) {
  const idleMs = options?.idleMs ?? DEFAULT_IDLE_MS;
  const pendingWidthRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedWidthRef = useRef<number | null>(null);

  const flushPendingWidth = useCallback(() => {
    if (pendingWidthRef.current === null) return;

    const nextWidth = pendingWidthRef.current;
    pendingWidthRef.current = null;

    if (
      lastCommittedWidthRef.current !== null &&
      Math.abs(lastCommittedWidthRef.current - nextWidth) < 1
    ) {
      return;
    }

    lastCommittedWidthRef.current = nextWidth;
    setSidebarWidth(feature, nextWidth);
  }, [feature, setSidebarWidth]);

  const scheduleFlush = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      flushPendingWidth();
    }, idleMs);
  }, [flushPendingWidth, idleMs]);

  const onResize = useCallback(
    (panelSize: PanelSize) => {
      pendingWidthRef.current = clampSidebarWidth(
        feature,
        Math.round(panelSize.inPixels),
      );
      scheduleFlush();
    },
    [feature, scheduleFlush],
  );

  useEffect(() => () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    flushPendingWidth();
  }, [flushPendingWidth]);

  return onResize;
}
