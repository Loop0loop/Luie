import type {
  FocusEventHandler,
  KeyboardEventHandler,
  PointerEventHandler,
} from "react";
import { useCallback, useEffect, useMemo } from "react";
import type { PanelSize } from "react-resizable-panels";
import { CANVAS_SURFACE_RESIZE_COMMIT_IDLE_MS } from "../shared/canvasConfigs";
import {
  clampCanvasSurfaceWidth,
  type CanvasSurfaceId,
} from "../shared/canvasSizing";

/**
 * 캔버스 surface(activity / binder)의 리사이즈 commit.
 *
 * `useSidebarResizeCommit`(workspace) 패턴을 그대로 가져와 캔버스 자체
 * surface key를 받게 좁힌 버전. 동작은 동일:
 *   - 드래그 중에는 idle ms만큼 debounce
 *   - 드래그 종료 시 즉시 flush
 *   - 1px 미만 변화는 무시
 *
 * resizeHandleProps를 PanelResizeHandle에 펼쳐 넣으면 인터랙션 시작/종료가
 * 자동으로 잡힌다.
 */

type CanvasSurfaceWidthSetter = (
  surface: CanvasSurfaceId,
  width: number,
) => void;

type Options = {
  idleMs?: number;
  initialWidth?: number;
};

const isInteractionKey = (key: string): boolean =>
  key === "ArrowLeft" ||
  key === "ArrowRight" ||
  key === "ArrowUp" ||
  key === "ArrowDown" ||
  key === "Home" ||
  key === "End";

interface Controller {
  beginInteraction: () => void;
  endInteraction: () => void;
  onResize: (panelSize: PanelSize) => void;
  dispose: () => void;
}

function createController(
  surface: CanvasSurfaceId,
  setWidth: CanvasSurfaceWidthSetter,
  idleMs: number,
  initialWidth?: number,
): Controller {
  let isInteracting = false;
  let pendingWidth: number | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastCommittedWidth =
    typeof initialWidth === "number" && Number.isFinite(initialWidth)
      ? clampCanvasSurfaceWidth(surface, Math.round(initialWidth))
      : null;

  const clearScheduledFlush = () => {
    if (timeoutId === null) return;
    clearTimeout(timeoutId);
    timeoutId = null;
  };

  const flush = () => {
    if (pendingWidth === null) return;
    const next = pendingWidth;
    pendingWidth = null;
    if (
      lastCommittedWidth !== null &&
      Math.abs(lastCommittedWidth - next) < 1
    ) {
      return;
    }
    lastCommittedWidth = next;
    setWidth(surface, next);
  };

  const schedule = () => {
    clearScheduledFlush();
    timeoutId = setTimeout(() => {
      timeoutId = null;
      flush();
    }, idleMs);
  };

  return {
    beginInteraction: () => {
      isInteracting = true;
    },
    endInteraction: () => {
      const had = pendingWidth !== null;
      isInteracting = false;
      clearScheduledFlush();
      if (had) flush();
    },
    onResize: (panelSize) => {
      if (
        typeof panelSize.inPixels !== "number" ||
        !Number.isFinite(panelSize.inPixels)
      ) {
        return;
      }
      const next = clampCanvasSurfaceWidth(
        surface,
        Math.round(panelSize.inPixels),
      );
      if (!isInteracting) {
        if (lastCommittedWidth === null) {
          lastCommittedWidth = next;
          return;
        }
        if (Math.abs(lastCommittedWidth - next) < 1) return;
        pendingWidth = next;
        flush();
        return;
      }
      pendingWidth = next;
      schedule();
    },
    dispose: () => {
      isInteracting = false;
      clearScheduledFlush();
      flush();
    },
  };
}

interface ResizeHandleProps {
  onBlur: FocusEventHandler<HTMLDivElement>;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  onKeyUp: KeyboardEventHandler<HTMLDivElement>;
  onPointerCancel: PointerEventHandler<HTMLDivElement>;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
}

export function useCanvasSurfaceResizeCommit(
  surface: CanvasSurfaceId,
  setWidth: CanvasSurfaceWidthSetter,
  options?: Options,
) {
  const idleMs = options?.idleMs ?? CANVAS_SURFACE_RESIZE_COMMIT_IDLE_MS;
  const controller = useMemo(
    () => createController(surface, setWidth, idleMs, options?.initialWidth),
    [surface, idleMs, options?.initialWidth, setWidth],
  );

  const onResize = useCallback(
    (panelSize: PanelSize) => controller.onResize(panelSize),
    [controller],
  );

  const resizeHandleProps = useMemo<ResizeHandleProps>(
    () => ({
      onPointerDown: () => controller.beginInteraction(),
      onPointerUp: () => controller.endInteraction(),
      onPointerCancel: () => controller.endInteraction(),
      onBlur: () => controller.endInteraction(),
      onKeyDown: (e) => {
        if (isInteractionKey(e.key)) controller.beginInteraction();
      },
      onKeyUp: (e) => {
        if (isInteractionKey(e.key)) controller.endInteraction();
      },
    }),
    [controller],
  );

  useEffect(() => {
    const handleEnd = () => controller.endInteraction();
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleEnd);
    return () => {
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleEnd);
      controller.dispose();
    };
  }, [controller]);

  return { onResize, resizeHandleProps };
}
