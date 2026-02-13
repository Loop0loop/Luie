import { useCallback, useEffect, useRef, useState } from "react";

export function useFloatingMenu<T extends HTMLElement = HTMLElement>() {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<T | null>(null);

  const closeMenu = useCallback(() => {
    setMenuOpenId(null);
  }, []);

  const toggleMenuByElement = useCallback((id: string, element: T) => {
    menuButtonRef.current = element;
    const rect = element.getBoundingClientRect();
    setMenuPosition({ x: rect.right + 8, y: rect.top });
    setMenuOpenId((prev) => (prev === id ? null : id));
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuOpenId) return;
      const target = event.target as Node;
      const clickedMenu = !!menuRef.current?.contains(target);
      const clickedButton = !!menuButtonRef.current?.contains(target);
      if (!clickedMenu && !clickedButton) {
        closeMenu();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [menuOpenId, closeMenu]);

  return {
    menuOpenId,
    menuPosition,
    menuRef,
    setMenuOpenId,
    closeMenu,
    toggleMenuByElement,
  };
}

