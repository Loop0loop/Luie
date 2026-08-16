import { User } from "lucide-react";

interface CharacterPillBadgeProps {
  id: string;
  name: string;
  role?: string;
  onClick?: (id: string) => void;
}

export function CharacterPillBadge({
  id,
  name,
  role,
  onClick,
}: CharacterPillBadgeProps) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(id)}
      className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-element px-2.5 py-1 text-xs font-medium text-fg transition-all hover:border-accent hover:bg-surface-hover hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      title={`${name}${role ? ` (${role})` : ""}`}
    >
      <span className="flex size-4 items-center justify-center rounded-full bg-surface text-subtle border border-border/50">
        <User className="icon-xs" aria-hidden="true" />
      </span>
      <span className="truncate max-w-24">{name}</span>
      {role ? (
        <span className="text-[10px] text-subtle font-normal">· {role}</span>
      ) : null}
    </button>
  );
}
