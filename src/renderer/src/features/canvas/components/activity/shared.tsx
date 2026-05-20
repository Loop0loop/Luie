/**
 * Shared primitives for canvas activity panels.
 *
 * Visual language (Sidebar.tsx 기준):
 *   PanelHeader  : text-sm font-bold text-fg
 *   PanelSection : text-[11px] font-semibold text-muted uppercase tracking-wider
 *                  + ChevronDown/Right, 애니메이션 있는 accordion
 *   PanelItem    : text-[13px], active = bg-active border-l-[3px] border-accent
 *                  inactive = text-muted hover:bg-surface-hover
 *                  + 우측 배지/카운트 슬롯
 *   PanelEmpty   : text-xs text-muted italic
 */
import { type ReactNode, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@shared/types/utils";

// ─── PanelRoot ────────────────────────────────────────────────────────────────

export function PanelRoot({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col select-none overflow-hidden">
      {children}
    </div>
  );
}

// ─── PanelHeader ──────────────────────────────────────────────────────────────

export function PanelHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="shrink-0 bg-transparent px-4 py-3.5 flex flex-col justify-center">
      <h2 className="text-sm font-bold text-fg">{title}</h2>
      {subtitle && (
        <div className="mt-1.5 truncate text-[11px] font-medium text-muted">
          {subtitle}
        </div>
      )}
    </div>
  );
}

// ─── PanelBody ────────────────────────────────────────────────────────────────

export function PanelBody({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto py-1">
      {children}
    </div>
  );
}

// ─── PanelSection ─────────────────────────────────────────────────────────────
// actions 슬롯에 <button>이 들어올 수 있으므로 헤더를 <div>로 유지합니다.
// <button> 안에 <button>을 넣으면 HTML 스펙 위반 + hydration 에러가 발생합니다.

export function PanelSection({
  title,
  defaultOpen = true,
  children,
  actions,
  count,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  actions?: ReactNode;
  count?: number;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-3 px-2">
      {/* 헤더: <div role="button"> — actions 슬롯의 <button> 중첩을 허용하기 위해 */}
      <div
        role="button"
        tabIndex={0}
        className="group flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted transition-colors hover:text-fg"
        onClick={() => setIsOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((v) => !v);
          }
        }}
        aria-expanded={isOpen}
      >
        <span
          className="mr-1.5 transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          <ChevronRight className="icon-xs opacity-70" />
        </span>
        <span className="flex-1 text-left">{title}</span>
        {count !== undefined && (
          <span className="mr-1 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-medium text-subtle group-hover:bg-active group-hover:text-muted">
            {count}
          </span>
        )}
        {actions && (
          // stopPropagation으로 헤더 클릭(토글)과 actions 클릭을 분리합니다.
          <span
            className="ml-1 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {actions}
          </span>
        )}
      </div>

      {isOpen && (
        <div className="mt-1 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-100">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── PanelItem ────────────────────────────────────────────────────────────────

export function PanelItem({
  label,
  icon,
  active = false,
  onClick,
  badge,
  className,
}: {
  label: React.ReactNode;
  icon?: ReactNode;
  active?: boolean;
  onClick?: () => void;
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[13px] transition-all rounded-md",
        active
          ? "bg-accent/10 font-medium text-accent"
          : "text-muted hover:bg-surface-hover hover:text-fg",
        className,
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {icon && (
        <span className={cn("shrink-0", active ? "text-fg" : "text-subtle")}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge && <span className="ml-auto shrink-0 pl-2">{badge}</span>}
    </div>
  );
}

// ─── PanelEmpty ───────────────────────────────────────────────────────────────

export function PanelEmpty({ message }: { message: string }) {
  return (
    <div className="px-panel-pad py-control-y text-xs italic text-muted">{message}</div>
  );
}

// ─── ToggleChip — 레이어/필터 토글용 커스텀 칩 ───────────────────────────────

export function ToggleChip({
  label,
  checked,
  onChange,
  colour,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  colour?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-1.5 text-[13px] transition-all",
        checked
          ? "bg-accent/10 font-medium text-accent"
          : "text-muted hover:bg-surface-hover hover:text-fg",
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {colour && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: colour }}
            aria-hidden
          />
        )}
        <span className="truncate leading-none py-[2px]">{label}</span>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        className={cn(
          "h-3.5 w-3.5 shrink-0 rounded-sm border transition-colors flex items-center justify-center self-center",
          checked
            ? "border-accent bg-accent text-on-accent"
            : "border-border bg-element text-transparent",
        )}
        aria-hidden
      >
        <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none">
          <path
            d="M2 5l2.5 2.5L8 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </label>
  );
}
