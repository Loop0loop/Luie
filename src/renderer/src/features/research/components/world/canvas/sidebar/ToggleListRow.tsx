import { cn } from "@renderer/lib/utils";

interface ToggleListRowProps {
  label: string;
  hint?: string;
  checked: boolean;
  onToggle: () => void;
}

/**
 * 사이드바의 토글 행 — Obsidian 스타일.
 *
 * 체크박스 대신 좌측에 작은 원형 인디케이터를 사용.
 * 활성 상태는 accent 색상 dot, 비활성은 빈 원.
 * 행 전체가 클릭 영역.
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
        "group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors",
        "hover:bg-muted/60",
        checked ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-2.5 shrink-0 rounded-full border transition-all",
          checked
            ? "border-primary bg-primary shadow-[0_0_4px_rgba(var(--color-primary),0.3)]"
            : "border-border bg-transparent",
        )}
      />
      <span className="flex-1 truncate text-[12px] leading-tight">{label}</span>
      {hint ? (
        <span className="shrink-0 text-[10px] leading-tight text-muted-foreground/60">
          {hint}
        </span>
      ) : null}
    </button>
  );
}
