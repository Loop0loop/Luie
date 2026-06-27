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
      safelyUsePanel(panelRef, (panel) => panel.collapse());
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
    const isCollapsed = safelyUsePanel(panelRef, (panel) => panel.isCollapsed());
    // Skip if panel not yet registered or is already expanded
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
  }, [durationMs, isOpen, openSize, panelRef, shouldRender]);

  return { isClosing, isOpening, shouldRender: isOpen || shouldRender };
}
