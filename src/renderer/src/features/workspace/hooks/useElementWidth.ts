import { useEffect, useState, type RefObject } from "react";

const getElementWidth = (element: HTMLElement | null): number =>
  element ? Math.round(element.getBoundingClientRect().width) : 0;

/** ResizeObserver로 element 너비를 추적하며 mount 전에는 0을 반환한다. */
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
