import type {
  FocusEventHandler,
  KeyboardEventHandler,
  PointerEventHandler,
} from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { PanelSize } from "react-resizable-panels";
import {
  clampSidebarWidth,
  type SidebarWidthFeature,
} from "@renderer/shared/constants/sidebarSizing";
import { SIDEBAR_RESIZE_COMMIT_IDLE_MS } from "@renderer/features/workspace/constants/uiDefaults";

// True while a programmatic layout pass is running (container resize,
// collapse/expand, project restore — see beginLayoutRestoring). react-resizable
// -panels fires onResize during group.setLayout(), so without this guard those
// programmatic resizes would commit and the stored width drifts on its own
// through a setLayout↔commit feedback loop. Only real user drags must persist.
export const isLayoutRestoring = (): boolean =>
  typeof document !== "undefined" &&
  document.documentElement.getAttribute("data-layout-restoring") === "true";

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

      // Skip resizes coming from a programmatic layout pass — only user drags
      // should persist (otherwise the width drifts on its own).
      if (isLayoutRestoring()) {
        return;
      }

      const nextWidth = clampSidebarWidth(feature, Math.round(panelSize.inPixels));
      if (!isInteracting) {
        // Not a user drag (mount, container resize, post-release settle). Track
        // the baseline once but never commit — committing here re-enters through
        // the px→%→px round-trip and the width drifts on its own.
        if (lastCommittedWidth === null) {
          lastCommittedWidth = nextWidth;
        }
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
  // Seed the initial width once. It must NOT be a useMemo dep: committing during
  // a drag changes the stored width, which would otherwise recreate the
  // controller mid-drag and reset isInteracting to false — dropping the drag
  // onto the immediate-commit path and causing the width to drift on its own.
  const initialWidthRef = useRef(options?.initialWidth);
  const controller = useMemo(
    () =>
      createSidebarResizeCommitController(
        feature,
        setSidebarWidth,
        idleMs,
        initialWidthRef.current,
      ),
    [feature, idleMs, setSidebarWidth],
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
