import type {
  FocusEventHandler,
  KeyboardEventHandler,
  PointerEventHandler,
} from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PanelSize } from "react-resizable-panels";
import {
  clampSidebarWidth,
  type SidebarWidthFeature,
} from "@renderer/shared/constants/sidebarSizing";
import { SIDEBAR_RESIZE_COMMIT_IDLE_MS } from "@renderer/features/workspace/constants/uiDefaults";

// NOTE: setLayout이 발생시키는 onResize를 저장하면 setLayout↔commit feedback으로 너비가 변한다.
// NOTE: programmatic layout 값을 사용자 설정으로 오인하지 않도록 실제 drag만 저장한다.
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

      // NOTE: programmatic layout의 resize는 저장하지 않는다.
      if (isLayoutRestoring()) {
        return;
      }

      const nextWidth = clampSidebarWidth(feature, Math.round(panelSize.inPixels));
      if (!isInteracting) {
        // NOTE: user drag가 아닌 resize는 px→%→px 오차가 누적되지 않도록 기준값만 갱신한다.
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
  // NOTE: drag 중 controller 재생성을 막으려고 초기 너비를 dependency에서 제외한다.
  const [initialWidth] = useState(options?.initialWidth);
  const controller = useMemo(
    () =>
      createSidebarResizeCommitController(
        feature,
        setSidebarWidth,
        idleMs,
        initialWidth,
      ),
    [feature, idleMs, initialWidth, setSidebarWidth],
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
