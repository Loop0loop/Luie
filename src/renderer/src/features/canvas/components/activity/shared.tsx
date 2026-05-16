/**
 * Shared primitives for canvas activity panels.
 *
 * All panels follow the same visual language as Sidebar.tsx:
 *   - Panel header  : text-sm font-bold text-fg  (project title slot equivalent)
 *   - Section header: text-[11px] font-semibold text-muted uppercase tracking-wider
 *                     + ChevronDown/Right icon-xs, px-4 py-1.5
 *   - Item row      : text-[13px] pl-9, active = bg-active border-l-[3px] border-accent
 *                     inactive = text-muted border-l-2 border-transparent hover:bg-surface-hover
 */
import { type ReactNode, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@shared/types/utils";

/* ─── Panel wrapper ─────────────────────────────────────────────────────── */

export function PanelRoot({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col select-none overflow-hidden">
      {children}
    </div>
  );
}

/* ─── Panel header (mirrors Sidebar.tsx p-4 block) ─────────────────────── */

export function PanelHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="p-4 shrink-0">
      <h2 className="text-sm font-bold text-fg">{title}</h2>
      {subtitle && (
        <div className="text-[11px] text-muted uppercase tracking-wider mt-0.5">
          {subtitle}
        </div>
      )}
    </div>
  );
}

/* ─── Scrollable body ───────────────────────────────────────────────────── */

export function PanelBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto py-1">
      {children}
    </div>
  );
}

/* ─── Collapsible section (mirrors Sidebar.tsx section headers) ─────────── */

export function PanelSection({
  title,
  defaultOpen = true,
  children,
  actions,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div>
      <div
        className="flex items-center px-4 py-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-fg transition-colors"
        onClick={() => setIsOpen((v) => !v)}
      >
        {isOpen ? (
          <ChevronDown className="mr-1.5 opacity-70 icon-xs" />
        ) : (
          <ChevronRight className="mr-1.5 opacity-70 icon-xs" />
        )}
        <span className="flex-1">{title}</span>
        {actions && (
          <span
            className="ml-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </span>
        )}
      </div>
      {isOpen && <div>{children}</div>}
    </div>
  );
}

/* ─── Item row (mirrors Sidebar.tsx chapter/research rows) ─────────────── */

export function PanelItem({
  label,
  icon,
  active = false,
  onClick,
  className,
}: {
  label: string;
  icon?: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center px-4 py-1.5 pl-9 cursor-pointer text-[13px] transition-all",
        active
          ? "bg-active text-fg font-medium border-l-[3px] border-accent"
          : "text-muted border-l-2 border-transparent hover:bg-surface-hover hover:text-fg",
        className,
      )}
      onClick={onClick}
    >
      {icon && <span className="mr-2 shrink-0">{icon}</span>}
      <span className="truncate">{label}</span>
    </div>
  );
}

/* ─── Empty state inside a panel ───────────────────────────────────────── */

export function PanelEmpty({ message }: { message: string }) {
  return (
    <div className="px-4 py-3 text-xs text-muted italic">{message}</div>
  );
}
