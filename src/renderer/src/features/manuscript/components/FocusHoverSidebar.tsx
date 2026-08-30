import { type ReactNode, useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@shared/types/utils";
import { EDITOR_WINDOW_BAR_HEIGHT_PX } from "@renderer/shared/constants/editorLayout";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";

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
  /** hover-open 상태가 바뀔 때 호출합니다. */
  onOpenChange?: (isOpen: boolean) => void;
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
  onOpenChange,
}: FocusHoverSidebarProps) {
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const enableAnimations = useEditorStore((state) => state.enableAnimations);
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

  const isOpen = forceOpen || isResizing || isHoverOpen;

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

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
    }, enableAnimations ? closeDelayMs : 0);
  }, [closeDelayMs, closeHoverSidebar, enableAnimations, forceOpen, isResizing]);

  const updateSidebarMetrics = useCallback(() => {
    sidebarRectRef.current = sidebarRef.current?.getBoundingClientRect() ?? null;
    sidebarWidthRef.current = sidebarRef.current?.offsetWidth ?? 0;
  }, []);

  useEffect(() => {
    updateSidebarMetrics();

    const element = sidebarRef.current;
    const resizeObserver =
      element === null ? null : new ResizeObserver(updateSidebarMetrics);

    if (element && resizeObserver) {
      resizeObserver.observe(element);
    }

    window.addEventListener("resize", updateSidebarMetrics);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateSidebarMetrics);
    };
  }, [updateSidebarMetrics]);

  // NOTE: 열림/닫힘은 transform으로만 바뀌는데 `getBoundingClientRect()`는 transform을
  // 반영한다. ResizeObserver는 "크기" 변화만 감지하므로 transform 이동은 잡지 못한다.
  // 그래서 이 갱신이 없으면, 넓은 패널이 닫힌 상태로 mount되는 경로(프로젝트 레이아웃 복원)에서
  // 캐시된 rect가 닫힌 위치(left ≈ innerWidth)에 영구 고정된다. 그 상태로 hover 오픈하면
  // `isInsideSidebar` 판정이 화면 오른쪽 끝 몇 px로 좁아져, 패널 안으로 마우스를 옮기는 순간
  // hover-close가 걸린다(레일 폭 판정처럼 동작). transition 종료 시점까지 재측정해 교정한다.
  useEffect(() => {
    const element = sidebarRef.current;
    if (element === null) return undefined;

    updateSidebarMetrics();
    const frameId = window.requestAnimationFrame(updateSidebarMetrics);
    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName !== "transform") return;
      updateSidebarMetrics();
    };

    element.addEventListener("transitionend", handleTransitionEnd);
    return () => {
      window.cancelAnimationFrame(frameId);
      element.removeEventListener("transitionend", handleTransitionEnd);
    };
  }, [isOpen, updateSidebarMetrics]);

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

      // NOTE: mouse button이 눌린 동안 hover-open을 막아 drag 중 sidebar가 열리지 않게 한다.
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
      <div
        className={cn(
          "fixed z-50",
          enableAnimations ? "transition-colors duration-150" : "transition-none",
          side === "left" ? "left-0" : "right-0",
          isOpen ? "pointer-events-none" : "hover:bg-accent/10"
        )}
        style={{ top: topStyle, height: heightStyle, width: `${triggerWidthPx}px` }}
      />

      <div
        ref={sidebarRef}
        className={cn(
          // NOTE: `flex flex-col`은 이 컴포넌트의 레이아웃 규약이다. 컨테이너만 definite
          // height(`calc(100vh - topOffset)`)를 갖기 때문에, children이 spacer + 본문처럼
          // 둘 이상이면 flex 분배 없이는 높이 체인이 끊긴다(`flex-1`/`shrink-0`/`min-h-0`은
          // flex 아이템 속성이라 block 부모 아래에서 전부 무효). 실제로 그 상태에서는
          // 배경만 100vh로 칠해지고 콘텐츠 박스는 짧아, 꽉 찬 것처럼 보이지만 hit 영역이
          // 콘텐츠 높이로 제한됐다.
          "fixed z-50 flex flex-col shadow-panel bg-sidebar will-change-transform [contain:layout_paint]",
          enableAnimations
            ? "transition-transform duration-150 ease-out"
            : "transition-none",
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
