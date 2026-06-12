import type {
  FocusEventHandler,
  KeyboardEventHandler,
  PointerEventHandler,
} from "react";
import { useCallback, useEffect, useMemo } from "react";
import type { PanelSize } from "react-resizable-panels";
import {
  clampSidebarWidth,
  type SidebarWidthFeature,
} from "@renderer/shared/constants/sidebarSizing";
import { SIDEBAR_RESIZE_COMMIT_IDLE_MS } from "@renderer/features/workspace/constants/uiDefaults";

type SidebarWidthSetter = (feature: string, width: number) => void;

type UseSidebarResizeCommitOptions = {
  idleMs?: number;
  initialWidth?: number;
};

export const isSidebarResizeInteractionKey = (key: string): boolean =>
  key === "ArrowLeft" ||
  key === "ArrowRight" ||
  key === "ArrowUp" ||
  key === "ArrowDown" ||
  key === "Home" ||
  key === "End";

export type SidebarResizeCommitController = {
  beginInteraction: () => void;
  endInteraction: () => void;
  onResize: (panelSize: PanelSize) => void;
  dispose: () => void;
};

export function createSidebarResizeCommitController(
  feature: SidebarWidthFeature,
  setSidebarWidth: SidebarWidthSetter,
  idleMs: number,
  initialWidth?: number,
): SidebarResizeCommitController {
  let isInteracting = false;
  let pendingWidth: number | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastCommittedWidth =
    typeof initialWidth === "number" && Number.isFinite(initialWidth)
      ? clampSidebarWidth(feature, Math.round(initialWidth))
      : null;

  const clearScheduledFlush = () => {
    if (timeoutId === null) return;
    clearTimeout(timeoutId);
    timeoutId = null;
  };

  const flushPendingWidth = () => {
    if (pendingWidth === null) return;

    const nextWidth = pendingWidth;
    pendingWidth = null;

    if (
      lastCommittedWidth !== null &&
      Math.abs(lastCommittedWidth - nextWidth) < 1
    ) {
      return;
    }

    lastCommittedWidth = nextWidth;
    setSidebarWidth(feature, nextWidth);
  };

  const scheduleFlush = () => {
    clearScheduledFlush();
    timeoutId = setTimeout(() => {
      timeoutId = null;
      flushPendingWidth();
    }, idleMs);
  };

  return {
    beginInteraction: () => {
      isInteracting = true;
    },
    endInteraction: () => {
      const hadPendingWidth = pendingWidth !== null;
      isInteracting = false;
      clearScheduledFlush();
      if (hadPendingWidth) {
        flushPendingWidth();
      }
    },
    onResize: (panelSize: PanelSize) => {
      if (
        typeof panelSize.inPixels !== "number" ||
        !Number.isFinite(panelSize.inPixels)
      ) {
        return;
      }

      const nextWidth = clampSidebarWidth(feature, Math.round(panelSize.inPixels));
      if (!isInteracting) {
        if (lastCommittedWidth === null) {
          lastCommittedWidth = nextWidth;
          return;
        }
        if (Math.abs(lastCommittedWidth - nextWidth) < 1) {
          return;
        }
        pendingWidth = nextWidth;
        flushPendingWidth();
        return;
      }

      pendingWidth = nextWidth;
      scheduleFlush();
    },
    dispose: () => {
      isInteracting = false;
      clearScheduledFlush();
      flushPendingWidth();
    },
  };
}

type SidebarResizeHandleProps = {
  onBlur: FocusEventHandler<HTMLDivElement>;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  onKeyUp: KeyboardEventHandler<HTMLDivElement>;
  onPointerCancel: PointerEventHandler<HTMLDivElement>;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
};

export function useSidebarResizeCommit(
  feature: SidebarWidthFeature,
  setSidebarWidth: SidebarWidthSetter,
  options?: UseSidebarResizeCommitOptions,
) {
  const idleMs = options?.idleMs ?? SIDEBAR_RESIZE_COMMIT_IDLE_MS;
  const controller = useMemo(
    () =>
      createSidebarResizeCommitController(
        feature,
        setSidebarWidth,
        idleMs,
        options?.initialWidth,
      ),
    [feature, idleMs, options?.initialWidth, setSidebarWidth],
  );

  const onResize = useCallback(
    (panelSize: PanelSize) => {
      controller.onResize(panelSize);
    },
    [controller],
  );

  const endInteraction = useCallback(() => {
    controller.endInteraction();
  }, [controller]);

  const resizeHandleProps = useMemo<SidebarResizeHandleProps>(
    () => ({
      onPointerDown: () => {
        controller.beginInteraction();
      },
      onPointerUp: () => {
        controller.endInteraction();
      },
      onPointerCancel: () => {
        controller.endInteraction();
      },
      onBlur: () => {
        controller.endInteraction();
      },
      onKeyDown: (event) => {
        if (!isSidebarResizeInteractionKey(event.key)) {
          return;
        }
        controller.beginInteraction();
      },
      onKeyUp: (event) => {
        if (!isSidebarResizeInteractionKey(event.key)) {
          return;
        }
        controller.endInteraction();
      },
    }),
    [controller],
  );

  useEffect(() => {
    const handlePointerEnd = () => {
      controller.endInteraction();
    };

    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      controller.dispose();
    };
  }, [controller]);

  return {
    onResize,
    resizeHandleProps,
    endInteraction,
  };
}
