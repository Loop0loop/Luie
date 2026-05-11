/* eslint-disable react-hooks/set-state-in-effect */
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
      setShouldRender(false);
      setIsClosing(false);
      setIsOpening(false);
      return undefined;
    }

    setIsOpening(false);
    setIsClosing(true);
    suppressLayoutPersistenceFor(durationMs + 160);
    const frameId = window.requestAnimationFrame(() => {
      panelRef.current?.collapse();
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
    panelRef.current?.resize("0%");
    const frameId = window.requestAnimationFrame(() => {
      panelRef.current?.resize(openSize);
    });
    const timer = window.setTimeout(() => {
      setIsOpening(false);
    }, durationMs);

    return () => {
      window.cancelAnimationFrame(frameId);
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
    if (!isOpen || !shouldRender) return;
    const panel = panelRef.current;
    if (!panel?.isCollapsed()) return;
    suppressLayoutPersistenceFor(durationMs + 160);
    panel.resize(openSize);
    setIsClosing(false);
    setIsOpening(false);
  }, [durationMs, isOpen, openSize, panelRef, shouldRender]);

  return { isClosing, isOpening, shouldRender: isOpen || shouldRender };
}
