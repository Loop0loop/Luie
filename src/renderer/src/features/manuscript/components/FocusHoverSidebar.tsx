import { type ReactNode, useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@shared/types/utils";
import { EDITOR_WINDOW_BAR_HEIGHT_PX } from "@shared/constants/configs";

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
  /** 닫혀 있을 때 활성화되는 숨은 영역 폭(px). */
  activationWidthPx?: number;
  /** 사이드바 닫힘 판정 여유(px). */
  closeTolerancePx?: number;
  /** 사이드바를 닫기 전 대기 시간(ms). */
  closeDelayMs?: number;
  /** 강제로 hover-open을 막습니다. explicit close 직후 재개방 방지용입니다. */
  suppressHoverOpen?: boolean;
}

export default function FocusHoverSidebar({
  children,
  className,
  side = "left",
  topOffset = EDITOR_WINDOW_BAR_HEIGHT_PX,
  isResizing = false,
  forceOpen = false,
  triggerWidthPx = 10,
  activationWidthPx,
  closeTolerancePx = 12,
  closeDelayMs = 220,
  suppressHoverOpen = false,
}: FocusHoverSidebarProps) {
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const hoverOpenRef = useRef(false);
  const sidebarRectRef = useRef<DOMRect | null>(null);
  const sidebarWidthRef = useRef(0);
  const mouseFrameRef = useRef<number | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const latestMouseEventRef = useRef<Pick<
    MouseEvent,
    "clientX" | "clientY" | "buttons"
  > | null>(null);

  useEffect(() => {
    hoverOpenRef.current = isHoverOpen;
  }, [isHoverOpen]);

  // 최종 열림 상태는 props와 내부 state의 조합
  const isOpen = forceOpen || isResizing || isHoverOpen;

  const clearPendingClose = useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const closeHoverSidebar = useCallback(() => {
    clearPendingClose();
    if (!hoverOpenRef.current) {
      return;
    }
    hoverOpenRef.current = false;
    setIsHoverOpen(false);
  }, [clearPendingClose]);

  const openHoverSidebar = useCallback(() => {
    clearPendingClose();
    if (forceOpen || isResizing || hoverOpenRef.current) {
      return;
    }
    hoverOpenRef.current = true;
    setIsHoverOpen(true);
  }, [clearPendingClose, forceOpen, isResizing]);

  const scheduleHoverClose = useCallback(() => {
    if (forceOpen || isResizing || closeTimeoutRef.current !== null) {
      return;
    }
    closeTimeoutRef.current = window.setTimeout(() => {
      closeTimeoutRef.current = null;
      closeHoverSidebar();
    }, closeDelayMs);
  }, [closeDelayMs, closeHoverSidebar, forceOpen, isResizing]);

  useEffect(() => {
    const updateSidebarMetrics = () => {
      sidebarRectRef.current = sidebarRef.current?.getBoundingClientRect() ?? null;
      sidebarWidthRef.current = sidebarRef.current?.offsetWidth ?? 0;
    };

    updateSidebarMetrics();

    const resizeObserver =
      sidebarRef.current === null
        ? null
        : new ResizeObserver(() => {
            updateSidebarMetrics();
          });

    if (sidebarRef.current && resizeObserver) {
      resizeObserver.observe(sidebarRef.current);
    }

    window.addEventListener("resize", updateSidebarMetrics);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateSidebarMetrics);
    };
  }, []);

  useEffect(() => {
    if (!forceOpen && !isResizing) {
      return;
    }
    clearPendingClose();
    hoverOpenRef.current = false;
    const frameId = window.requestAnimationFrame(() => {
      setIsHoverOpen(false);
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [clearPendingClose, forceOpen, isResizing]);

  useEffect(() => {
    const processMouseMove = () => {
      mouseFrameRef.current = null;
      const e = latestMouseEventRef.current;
      if (!e) return;

      if (suppressHoverOpen) {
        closeHoverSidebar();
        return;
      }

      // 드래그(마우스 버튼 down) 중에는 hover 토글을 막아
      // 리사이즈/드래그 중 사이드바가 튀어나오는 UX를 방지한다.
      if (e.buttons !== 0) return;

      if (e.clientY < topOffset || e.clientY > window.innerHeight) {
        closeHoverSidebar();
        return;
      }

      const resolvedActivationWidth =
        activationWidthPx ?? Math.max(triggerWidthPx, sidebarWidthRef.current);

      const isWithinActivationZone =
        side === "left"
          ? e.clientX <= resolvedActivationWidth
          : e.clientX >= window.innerWidth - resolvedActivationWidth;

      const sidebarRect = sidebarRectRef.current;
      const isInsideSidebar = Boolean(
        sidebarRect &&
        e.clientX >= sidebarRect.left - closeTolerancePx &&
        e.clientX <= sidebarRect.right + closeTolerancePx &&
        e.clientY >= sidebarRect.top - closeTolerancePx &&
        e.clientY <= sidebarRect.bottom + closeTolerancePx,
      );

      if (isWithinActivationZone || isInsideSidebar) {
        openHoverSidebar();
        return;
      }

      if (hoverOpenRef.current) {
        scheduleHoverClose();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      latestMouseEventRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        buttons: e.buttons,
      };
      if (mouseFrameRef.current !== null) return;
      mouseFrameRef.current = window.requestAnimationFrame(processMouseMove);
    };

    const handleWindowLeave = () => {
      closeHoverSidebar();
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleWindowLeave);
    return () => {
      clearPendingClose();
      if (mouseFrameRef.current !== null) {
        cancelAnimationFrame(mouseFrameRef.current);
        mouseFrameRef.current = null;
      }
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleWindowLeave);
    };
  }, [
    activationWidthPx,
    clearPendingClose,
    closeHoverSidebar,
    closeTolerancePx,
    openHoverSidebar,
    scheduleHoverClose,
    side,
    topOffset,
    triggerWidthPx,
    suppressHoverOpen,
  ]);

  const topStyle = `${topOffset}px`;
  const heightStyle = `calc(100vh - ${topOffset}px)`;

  return (
    <>
      {/* 트리거 힌트 영역 */}
      <div
        className={cn(
          "fixed z-50 transition-colors duration-150",
          side === "left" ? "left-0" : "right-0",
          isOpen ? "pointer-events-none" : "hover:bg-accent/10"
        )}
        style={{ top: topStyle, height: heightStyle, width: `${triggerWidthPx}px` }}
      />

      {/* 사이드바 컨테이너 */}
      <div
        ref={sidebarRef}
        className={cn(
          "fixed z-50 transition-transform duration-150 ease-out shadow-xl bg-panel will-change-transform",
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
