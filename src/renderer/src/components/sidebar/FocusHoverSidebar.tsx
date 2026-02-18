import { type ReactNode, useState, useRef, useEffect } from "react";
import { cn } from "../../../../shared/types/utils";

interface FocusHoverSidebarProps {
  children: ReactNode;
  className?: string;
  side?: "left" | "right";
  /** 상단 오프셋 (px). WindowBar + Toolbar 높이를 합산해서 전달하세요. */
  topOffset?: number;
  /** 리사이즈 중일 때 true로 설정하면 hover-hide 동작을 잠급니다. */
  isResizing?: boolean;
}

export default function FocusHoverSidebar({
  children,
  className,
  side = "left",
  topOffset = 40,
  isResizing = false,
}: FocusHoverSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 리사이즈 중이면 닫지 않음
      if (isResizing) {
        setIsOpen(true);
        return;
      }

      // 트리거 영역: 왼쪽 20px 또는 오른쪽 20px
      const isTrigger =
        side === "left" ? e.clientX < 20 : e.clientX > window.innerWidth - 20;

      if (isTrigger) {
        setIsOpen(true);
      } else if (
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [side, isResizing]);

  const topStyle = `${topOffset}px`;
  const heightStyle = `calc(100vh - ${topOffset}px)`;

  return (
    <>
      {/* 트리거 힌트 영역 */}
      <div
        ref={triggerRef}
        className={cn(
          "fixed w-4 z-50 transition-colors duration-300",
          side === "left" ? "left-0" : "right-0",
          isOpen ? "pointer-events-none" : "hover:bg-accent/10"
        )}
        style={{ top: topStyle, height: heightStyle }}
      />

      {/* 사이드바 컨테이너 */}
      <div
        ref={sidebarRef}
        className={cn(
          "fixed z-50 transition-transform duration-300 ease-in-out shadow-2xl bg-panel",
          side === "left"
            ? "left-0 border-r border-border"
            : "right-0 border-l border-border",
          isOpen
            ? "translate-x-0"
            : side === "left"
              ? "-translate-x-full"
              : "translate-x-full",
          className
        )}
        style={{ top: topStyle, height: heightStyle }}
      >
        {children}
      </div>
    </>
  );
}
