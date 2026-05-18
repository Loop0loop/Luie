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
import { ChevronDown, ChevronRight } from "lucide-react";
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
    <div className="shrink-0 border-b border-border/40 px-4 py-3">
      <h2 className="text-sm font-bold text-fg">{title}</h2>
      {subtitle && (
        <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted">
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
  /** 섹션 우측에 표시할 카운트 배지 */
  count?: number;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted transition-colors hover:text-fg"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <ChevronDown className="mr-1.5 icon-xs opacity-70" />
        ) : (
          <ChevronRight className="mr-1.5 icon-xs opacity-70" />
        )}
        <span className="flex-1 text-left">{title}</span>
        {count !== undefined && (
          <span className="mr-1 rounded-full bg-surface px-1.5 py-0.5 text-[10px] tabular-nums text-muted">
            {count}
          </span>
        )}
        {actions && (
          <span
            className="ml-1"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-100">
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
  label: string;
  icon?: ReactNode;
  active?: boolean;
  onClick?: () => void;
  /** 우측 배지 (카운트, 태그 등) */
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "flex cursor-pointer items-center px-4 py-1.5 pl-9 text-[13px] transition-all",
        active
          ? "border-l-[3px] border-accent bg-active font-medium text-fg"
          : "border-l-2 border-transparent text-muted hover:bg-surface-hover hover:text-fg",
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
      {icon && <span className="mr-2 shrink-0">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge && (
        <span className="ml-auto shrink-0 pl-2">{badge}</span>
      )}
    </div>
  );
}

// ─── PanelEmpty ───────────────────────────────────────────────────────────────

export function PanelEmpty({ message }: { message: string }) {
  return (
    <div className="px-4 py-3 text-xs italic text-muted">{message}</div>
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
        "flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-[12px] transition-all",
        checked
          ? "bg-active font-medium text-fg"
          : "text-muted hover:bg-surface-hover hover:text-fg",
      )}
    >
      {colour && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: colour }}
          aria-hidden
        />
      )}
      <span className="flex-1 truncate">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        className={cn(
          "h-3.5 w-3.5 shrink-0 rounded-sm border transition-colors",
          checked
            ? "border-accent bg-accent"
            : "border-border/60 bg-element",
        )}
        aria-hidden
      >
        {checked && (
          <svg viewBox="0 0 10 10" className="h-full w-full text-white" fill="none">
            <path
              d="M2 5l2.5 2.5L8 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </label>
  );
}
