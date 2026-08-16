import { BrainCircuit } from "lucide-react";

interface ForeshadowingTagProps {
  label: string;
  isResolved?: boolean;
}

export function ForeshadowingTag({ label, isResolved = false }: ForeshadowingTagProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-control px-2 py-0.5 text-[11px] font-medium border transition-colors ${
        isResolved
          ? "border-success-fg/30 bg-success-fg/10 text-success-fg"
          : "border-accent/40 bg-accent/15 text-accent"
      }`}
    >
      <BrainCircuit className="icon-xs shrink-0" aria-hidden="true" />
      <span className="truncate max-w-32">{label}</span>
      <span className="text-[9px] opacity-70">
        {isResolved ? "회수됨" : "활성 떡밥"}
      </span>
    </span>
  );
}
