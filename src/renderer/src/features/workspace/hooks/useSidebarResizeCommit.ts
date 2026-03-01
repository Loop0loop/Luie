import { useCallback, useEffect, useRef } from "react";
import type { PanelSize } from "react-resizable-panels";
import {
  clampSidebarWidth,
  type SidebarWidthFeature,
} from "@shared/constants/sidebarSizing";
import { SIDEBAR_RESIZE_COMMIT_IDLE_MS } from "@shared/constants/configs";

type SidebarWidthSetter = (feature: string, width: number) => void;

type UseSidebarResizeCommitOptions = {
  idleMs?: number;
};

export function useSidebarResizeCommit(
  feature: SidebarWidthFeature,
  setSidebarWidth: SidebarWidthSetter,
  options?: UseSidebarResizeCommitOptions,
) {
  const idleMs = options?.idleMs ?? SIDEBAR_RESIZE_COMMIT_IDLE_MS;
  const pendingWidthRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedWidthRef = useRef<number | null>(null);
  const isSeparatorDraggingRef = useRef(false);

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
      // Ignore passive resizes (layout reflow, mode switch, viewport changes).
      // Persist only when the user is actively dragging a resize separator.
      if (!isSeparatorDraggingRef.current) return;
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

  useEffect(() => {
    const isSeparatorTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest("[data-separator]") || target.closest('[role="separator"]'),
      );
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!isSeparatorTarget(event.target)) return;
      isSeparatorDraggingRef.current = true;
    };

    const handlePointerEnd = () => {
      if (!isSeparatorDraggingRef.current) return;
      isSeparatorDraggingRef.current = false;
      flushPendingWidth();
    };

    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("pointerup", handlePointerEnd, true);
    window.addEventListener("pointercancel", handlePointerEnd, true);
    window.addEventListener("blur", handlePointerEnd);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("pointerup", handlePointerEnd, true);
      window.removeEventListener("pointercancel", handlePointerEnd, true);
      window.removeEventListener("blur", handlePointerEnd);
    };
  }, [flushPendingWidth]);

  return onResize;
}
