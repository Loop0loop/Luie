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
  /** 강제로 사이드바를 엽니다. (탭이 활성화된 경우 등) */
  forceOpen?: boolean;
}

export default function FocusHoverSidebar({
  children,
  className,
  side = "left",
  topOffset = 40,
  isResizing = false,
  forceOpen = false,
}: FocusHoverSidebarProps) {
  // 내부 hover 상태만 관리
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // 최종 열림 상태는 props와 내부 state의 조합
  const isOpen = forceOpen || isResizing || isHoverOpen;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 강제 오픈 상태거나 리사이즈 중이어도 hover 상태 업데이트는 필요할 수 있음
      // 하지만 여기서는 hover로 인한 "열림/닫힘" 전환만 제어하면 됨.
      
      if (forceOpen || isResizing) {
        // 이미 외부 요인으로 열려있으면 hover 감지 불필요
        // 단, 마우스가 나갔을 때 forceOpen이 꺼지면 바로 닫혀야 하는가?
        // 아니면 hover 상태가 유지되어야 하는가?
        // UX상 마우스가 안에 있으면 hoverOpen도 true여야 자연스러움.
        // 복잡도를 줄이기 위해, forceOpen일 때는 hover 로직을 무시하고
        // forceOpen이 꺼지면 닫히도록(혹은 다시 hover 감지) 하는게 나음.
        return;
      }

      // 트리거 영역: 왼쪽 20px 또는 오른쪽 20px
      const isTrigger =
        side === "left" ? e.clientX < 20 : e.clientX > window.innerWidth - 20;

      if (isTrigger) {
        setIsHoverOpen(true);
      } else if (
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node)
      ) {
        setIsHoverOpen(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [side, isResizing, forceOpen]);

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
