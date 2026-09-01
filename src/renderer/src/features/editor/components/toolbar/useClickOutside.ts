import { useEffect, useRef } from "react";
import type { RefObject } from "react";

/**
 * 바깥 클릭과 Escape로 닫는다.
 *
 * NOTE: 이전에는 바깥 클릭만 처리해서 툴바 메뉴 3개(`ColorPickerMenu` · `TypographyMenu` ·
 * `CompactDropdown`)를 키보드로 열면 빠져나올 방법이 없었다.
 *
 * WHY `open`을 받는가: Escape 처리는 `stopPropagation`을 해야 상위 모달이 같이 닫히지
 * 않는다. 그런데 메뉴가 닫혀 있을 때도 리스너가 붙어 있으면 **에디터의 Escape를 앱 전역에서
 * 삼킨다.** 그래서 열려 있는 동안만 등록한다. 바깥 클릭 쪽은 닫힌 상태에서 호출돼도
 * `setOpen(false)`가 no-op이라 무해했지만, 같은 이유로 함께 게이팅한다.
 *
 * capture 단계에서 받는 이유는 에디터(ProseMirror)가 Escape를 먼저 소비하는 것을 막기
 * 위해서다.
 */
export function useClickOutside(
  ref: RefObject<HTMLDivElement | null>,
  onClose: () => void,
  open = true,
) {
  const savedHandler = useRef(onClose);
  useEffect(() => {
    savedHandler.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) savedHandler.current();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      savedHandler.current();
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey, true);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey, true);
    };
  }, [ref, open]);
}
