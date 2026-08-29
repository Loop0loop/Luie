/* eslint-disable react-hooks/set-state-in-effect -- PanelGroup 등록 상태를 외부 layout과 동기화한다. */
import { type RefObject, useEffect, useLayoutEffect, useState } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { suppressLayoutPersistenceFor } from "./useLayoutPersist";

type UseResizablePanelPresenceOptions = {
  durationMs?: number;
  enableAnimations: boolean;
  isOpen: boolean;
  openSize: number | string;
  panelRef: RefObject<PanelImperativeHandle | null>;
};

type ResizablePanelPresenceState = {
  isClosing: boolean;
  isOpening: boolean;
  shouldRender: boolean;
};

/**
 * 애니메이션이 꺼진 닫기 경로의 저장 억제 창.
 *
 * 이 경로는 transition이 없어 즉시 collapse+unmount한다. 억제가 필요한 구간은 collapse가
 * 유발하는 layout emit과 그에 이어지는 unmount 커밋뿐이므로 짧게 잡는다. 억제 counter는
 * 모듈 전역이라 길게 잡으면 무관한 패널의 사용자 resize까지 삼킨다.
 */
const INSTANT_CLOSE_SUPPRESS_MS = 200;


const isPanelRegistrationError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.startsWith("Layout not found for Panel") ||
    error.message.startsWith("Panel constraints not found for Panel") ||
    error.message.startsWith("Could not find data for Group with id") ||
    error.message.startsWith("Group ") && error.message.endsWith(" not found"));

const safelyUsePanel = <T>(
  panelRef: RefObject<PanelImperativeHandle | null>,
  panelAction: (panel: PanelImperativeHandle) => T,
): T | undefined => {
  const panel = panelRef.current;
  if (!panel) return undefined;

  try {
    return panelAction(panel);
  } catch (error) {
    if (isPanelRegistrationError(error)) {
      return undefined;
    }
    throw error;
  }
};

// NOTE: collapsible이 아닌 패널은 collapse()가 no-op이라 닫기 transition이 발동하지 않는다.
// 크기 0으로 직접 resize해 같은 flex-grow transition 경로를 타게 한다.
// (minSize에 걸려 0까지 줄지 않는 경우는 호출측에서 애니메이션 중 minSize를 완화한다.)
const collapsePanelToZero = (
  panelRef: RefObject<PanelImperativeHandle | null>,
) =>
  safelyUsePanel(panelRef, (panel) => {
    panel.collapse();
    if (!panel.isCollapsed()) {
      panel.resize("0%");
    }
  });

export function useResizablePanelPresence({
  durationMs = 200,
  enableAnimations,
  isOpen,
  openSize,
  panelRef,
}: UseResizablePanelPresenceOptions): ResizablePanelPresenceState {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (!shouldRender || isClosing) {
        setShouldRender(true);
        setIsOpening(enableAnimations);
      }
      setIsClosing(false);
      return undefined;
    }

    if (!shouldRender) {
      setIsClosing(false);
      setIsOpening(false);
      return undefined;
    }

    if (!enableAnimations || durationMs <= 0) {
      // NOTE: 억제 없이 collapse하면 안 된다. 이 경로는 minSize를 완화하는 렌더를 거치지
      // 않으므로 `resize("0%")`가 minSize로 클램프되고, PanelGroup이 그 min 비율을 emit한다.
      // 저장 경로가 그 값을 사용자 폭으로 오인해 커밋하면 저장 폭이 min에 고착된다.
      suppressLayoutPersistenceFor(INSTANT_CLOSE_SUPPRESS_MS);
      collapsePanelToZero(panelRef);
      setShouldRender(false);
      setIsClosing(false);
      setIsOpening(false);
      return undefined;
    }

    setIsOpening(false);
    setIsClosing(true);
    suppressLayoutPersistenceFor(durationMs + 160);
    const frameId = window.requestAnimationFrame(() => {
      collapsePanelToZero(panelRef);
    });
    const timer = window.setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
    }, durationMs);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timer);
    };
  }, [
    durationMs,
    enableAnimations,
    isClosing,
    isOpen,
    panelRef,
    shouldRender,
  ]);

  useLayoutEffect(() => {
    if (!enableAnimations || !isOpening || !shouldRender) return undefined;

    suppressLayoutPersistenceFor(durationMs + 160);
    let resizeFrameId: number | null = null;
    const frameId = window.requestAnimationFrame(() => {
      safelyUsePanel(panelRef, (panel) => panel.resize("0%"));
      resizeFrameId = window.requestAnimationFrame(() => {
        safelyUsePanel(panelRef, (panel) => panel.resize(openSize));
      });
    });
    const timer = window.setTimeout(() => {
      setIsOpening(false);
    }, durationMs);

    return () => {
      window.cancelAnimationFrame(frameId);
      if (resizeFrameId !== null) {
        window.cancelAnimationFrame(resizeFrameId);
      }
      window.clearTimeout(timer);
    };
  }, [
    durationMs,
    enableAnimations,
    isOpening,
    openSize,
    panelRef,
    shouldRender,
  ]);

  useLayoutEffect(() => {
    if (!isOpen || !shouldRender) return undefined;
    // NOTE: open/close transition 중에는 opening 브랜치(0%→openSize 보간)가 크기를 제어한다.
    // 이 브랜치가 같은 프레임에 isOpening을 해제하며 resize하면 transition 활성 속성
    // (data-panel-animated)이 먼저 사라져 패널이 스냅된다. 따라서 이 브랜치는 열림 상태에서
    // 외부 요인으로 collapse된 패널을 복구할 때만 동작한다.
    if (isOpening || isClosing) return undefined;
    const isCollapsed = safelyUsePanel(panelRef, (panel) => panel.isCollapsed());
    if (isCollapsed !== true) return undefined;
    suppressLayoutPersistenceFor(durationMs + 160);

    let frameId: number | null = null;
    frameId = window.requestAnimationFrame(() => {
      safelyUsePanel(panelRef, (currentPanel) => currentPanel.resize(openSize));
    });

    setIsClosing(false);
    setIsOpening(false);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [
    durationMs,
    isClosing,
    isOpen,
    isOpening,
    openSize,
    panelRef,
    shouldRender,
  ]);

  return { isClosing, isOpening, shouldRender: isOpen || shouldRender };
}
