import { type ReactNode, useState, useRef, useEffect } from "react";
import { cn } from "../../../../shared/types/utils";

interface FocusHoverSidebarProps {
  children: ReactNode;
  className?: string;
}

export default function FocusHoverSidebar({ children, className, side = "left" }: FocusHoverSidebarProps & { side?: "left" | "right" }) {
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Trigger zone: Left 20px or Right 20px based on side
      const isTrigger = side === "left" 
        ? e.clientX < 20 
        : e.clientX > window.innerWidth - 20;

      if (isTrigger) {
        setIsOpen(true);
      } else if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        // Close if mouse is outside sidebar
        setIsOpen(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [side]);

  return (
    <>
      {/* Visual Trigger Hint (optional, maybe just invisible area) */}
      <div 
        ref={triggerRef}
        className={cn(
          "fixed top-10 h-[calc(100vh-2.5rem)] w-4 z-50 transition-colors duration-300",
          side === "left" ? "left-0" : "right-0",
          isOpen ? "pointer-events-none" : "hover:bg-accent/10"
        )}
      />

      {/* Sidebar Container */}
      <div
        ref={sidebarRef}
        className={cn(
          "fixed top-10 h-[calc(100vh-2.5rem)] z-50 transition-transform duration-300 ease-in-out shadow-2xl bg-panel border-r border-border", // Top-10 to respect WindowBar
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          isOpen 
            ? "translate-x-0" 
            : side === "left" ? "-translate-x-full" : "translate-x-full",
          className
        )}
      >
        {children}
      </div>
    </>
  );
}
