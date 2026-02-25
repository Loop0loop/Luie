import { type ReactNode, useState, useRef, useEffect } from "react";
import { cn } from "@shared/types/utils";

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
  /** 가장자리 트리거 폭(px). */
  triggerWidthPx?: number;
  /** 사이드바 닫힘 판정 여유(px). */
  closeTolerancePx?: number;
}

export default function FocusHoverSidebar({
  children,
  className,
  side = "left",
  topOffset = 40,
  isResizing = false,
  forceOpen = false,
  triggerWidthPx = 10,
  closeTolerancePx = 12,
}: FocusHoverSidebarProps) {
  // 내부 hover 상태만 관리
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const hoverOpenRef = useRef(false);

  useEffect(() => {
    hoverOpenRef.current = isHoverOpen;
  }, [isHoverOpen]);

  // 최종 열림 상태는 props와 내부 state의 조합
  const isOpen = forceOpen || isResizing || isHoverOpen;

  useEffect(() => {
    // 외부가 열림 상태를 강제하면 내부 hover 상태를 초기화해
    // 강제 상태가 풀릴 때 잔류 active 판정을 방지한다.
    if (forceOpen || isResizing) {
      setIsHoverOpen(false);
      hoverOpenRef.current = false;
    }
  }, [forceOpen, isResizing]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (forceOpen || isResizing) {
        return;
      }

      // 드래그(마우스 버튼 down) 중에는 hover 토글을 막아
      // 리사이즈/드래그 중 사이드바가 튀어나오는 UX를 방지한다.
      if (e.buttons !== 0) return;

      if (e.clientY < topOffset || e.clientY > window.innerHeight) {
        if (hoverOpenRef.current) {
          hoverOpenRef.current = false;
          setIsHoverOpen(false);
        }
        return;
      }

      const isTrigger =
        side === "left"
          ? e.clientX <= triggerWidthPx
          : e.clientX >= window.innerWidth - triggerWidthPx;

      const sidebarRect = sidebarRef.current?.getBoundingClientRect();
      const isInsideSidebar = Boolean(
        sidebarRect &&
        e.clientX >= sidebarRect.left - closeTolerancePx &&
        e.clientX <= sidebarRect.right + closeTolerancePx &&
        e.clientY >= sidebarRect.top - closeTolerancePx &&
        e.clientY <= sidebarRect.bottom + closeTolerancePx,
      );

      if (isTrigger) {
        if (!hoverOpenRef.current) {
          hoverOpenRef.current = true;
          setIsHoverOpen(true);
        }
        return;
      }

      if (hoverOpenRef.current && !isInsideSidebar) {
        hoverOpenRef.current = false;
        setIsHoverOpen(false);
      }
    };

    const handleWindowLeave = () => {
      if (!hoverOpenRef.current) return;
      hoverOpenRef.current = false;
      setIsHoverOpen(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleWindowLeave);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleWindowLeave);
    };
  }, [side, isResizing, forceOpen, topOffset, triggerWidthPx, closeTolerancePx]);

  const topStyle = `${topOffset}px`;
  const heightStyle = `calc(100vh - ${topOffset}px)`;

  return (
    <>
      {/* 트리거 힌트 영역 */}
      <div
        ref={triggerRef}
        className={cn(
          "fixed z-50 transition-colors duration-200",
          side === "left" ? "left-0" : "right-0",
          isOpen ? "pointer-events-none" : "hover:bg-accent/10"
        )}
        style={{ top: topStyle, height: heightStyle, width: `${triggerWidthPx}px` }}
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
