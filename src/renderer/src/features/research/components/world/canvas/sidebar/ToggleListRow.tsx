import { Check } from "lucide-react";
import { cn } from "@renderer/lib/utils";

interface ToggleListRowProps {
  label: string;
  hint?: string;
  checked: boolean;
  onToggle: () => void;
}

/**
 * 사이드바 토글 행. 작은 사각 체크박스 + 라벨.
 *
 * 워크스페이스 사이드바와 같은 hover 톤(`bg-surface-hover`)과
 * fg/muted 텍스트 토큰을 쓴다. 색 dot이나 글로우는 쓰지 않는다.
 */
export function ToggleListRow({
  label,
  hint,
  checked,
  onToggle,
}: ToggleListRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={cn(
        "group flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left transition-colors",
        "hover:bg-surface-hover",
        checked ? "text-fg" : "text-muted",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-3 shrink-0 items-center justify-center rounded-[3px] border transition-colors",
          checked
            ? "border-fg/70 bg-fg/80 text-background"
            : "border-border bg-transparent group-hover:border-fg/40",
        )}
      >
        {checked ? <Check className="size-2.5" strokeWidth={3} /> : null}
      </span>
      <span className="flex-1 truncate text-[12px] leading-tight">{label}</span>
      {hint ? (
        <span className="shrink-0 text-[10px] leading-tight text-muted/70">
          {hint}
        </span>
      ) : null}
    </button>
  );
}
