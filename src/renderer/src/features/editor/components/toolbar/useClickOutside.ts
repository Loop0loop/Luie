import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export function useClickOutside(
  ref: RefObject<HTMLDivElement | null>,
  onClose: () => void,
) {
  const savedHandler = useRef(onClose);
  useEffect(() => {
    savedHandler.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) savedHandler.current();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref]);
}
