import { useEffect, useState, type RefObject } from "react";

const getElementWidth = (element: HTMLElement | null): number =>
  element ? Math.round(element.getBoundingClientRect().width) : 0;

/**
 * Observes the current width of an element and keeps it in sync with ResizeObserver.
 * Falls back to 0 until the element is mounted; callers can decide how to handle that.
 */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateWidth = () => {
      const nextWidth = getElementWidth(element);
      setWidth((currentWidth) =>
        currentWidth === nextWidth ? currentWidth : nextWidth,
      );
    };

    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return width;
}
