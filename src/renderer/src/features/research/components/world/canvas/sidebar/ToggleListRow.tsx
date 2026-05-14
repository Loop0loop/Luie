import { Check } from "lucide-react";
import { cn } from "@renderer/lib/utils";

interface ToggleListRowProps {
  label: string;
  hint?: string;
  checked: boolean;
  onToggle: () => void;
}

/**
 * 사이드바의 체크박스 행. Layers와 Filters에서 공통 사용.
 *
 * 시각적으로는 라디오/체크박스보다 "Obsidian 토글" 느낌으로 가깝게.
 * 행 전체가 클릭 영역이며, 체크 상태는 좌측 박스의 fill로만 표시한다.
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
        "group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors",
        "hover:bg-muted",
        checked ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-3.5 shrink-0 items-center justify-center rounded-sm border transition-colors",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background",
        )}
      >
        {checked ? <Check className="size-2.5" strokeWidth={3} /> : null}
      </span>
      <span className="flex-1 truncate text-[12px]">{label}</span>
      {hint ? (
        <span className="shrink-0 text-[10px] text-muted-foreground/70">
          {hint}
        </span>
      ) : null}
    </button>
  );
}
