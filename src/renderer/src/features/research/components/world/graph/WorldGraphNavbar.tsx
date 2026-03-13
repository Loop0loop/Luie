import { User, CalendarDays, MapPin, Flag, PlusCircle, Minus, Plus, Maximize2 } from "lucide-react";
import { cn } from "@renderer/lib/utils";
import type { WorldEntitySourceType } from "@shared/types";

const QUICK_TYPES: {
  type: WorldEntitySourceType;
  icon: React.ElementType;
  label: string;
  color: string;
}[] = [
  { type: "Character", icon: User,        label: "캐릭터", color: "#818cf8" },
  { type: "Event",     icon: CalendarDays, label: "사건",   color: "#fb7185" },
  { type: "Place",     icon: MapPin,       label: "장소",   color: "#34d399" },
  { type: "Faction",   icon: Flag,         label: "세력",   color: "#fb923c" },
];

interface WorldGraphNavbarProps {
  onSpawnDraft: (type?: string) => void;
  onCreateEntity: (entityType: WorldEntitySourceType) => void;
  onFitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const Divider = () => (
  <div className="mx-1 h-6 w-px shrink-0 bg-border/40" />
);

export function WorldGraphNavbar({
  onSpawnDraft,
  onCreateEntity,
  onFitView,
  onZoomIn,
  onZoomOut,
}: WorldGraphNavbarProps) {
  return (
    <div className="absolute bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-0 rounded-xl border border-border/40 bg-panel/95 px-2 py-1.5 shadow-xl ring-1 ring-black/5 backdrop-blur-md">

      {/* Quick Entity Create */}
      <div className="flex items-center gap-0.5">
        {QUICK_TYPES.map(({ type, icon: Icon, label, color }) => (
          <button
            key={type}
            type="button"
            title={`${label} 추가 (직접 생성)`}
            onClick={() => onCreateEntity(type)}
            className={cn(
              "group flex flex-col items-center gap-px rounded-lg px-2.5 py-1.5 transition-all",
              "text-muted-foreground/60 hover:bg-element hover:text-fg",
            )}
          >
            <Icon size={13} className="transition-colors group-hover:text-current" style={{ color }} />
            <span className="text-[9px] font-medium leading-none text-muted-foreground/50 group-hover:text-fg/60">
              {label}
            </span>
          </button>
        ))}
      </div>

      <Divider />

      {/* Draft Block (free text) */}
      <button
        type="button"
        title="빈 블록 추가 (자유 입력)"
        onClick={() => onSpawnDraft()}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-muted-foreground/70 transition-all hover:bg-element hover:text-fg"
      >
        <PlusCircle size={13} />
        <span>블록</span>
      </button>

      <Divider />

      {/* View Controls */}
      <div className="flex items-center gap-0">
        <button
          type="button"
          title="축소"
          onClick={onZoomOut}
          className="rounded-md p-1.5 text-muted-foreground/50 transition-all hover:bg-element hover:text-fg"
        >
          <Minus size={13} />
        </button>
        <button
          type="button"
          title="화면 맞추기"
          onClick={onFitView}
          className="rounded-md p-1.5 text-muted-foreground/50 transition-all hover:bg-element hover:text-fg"
        >
          <Maximize2 size={13} />
        </button>
        <button
          type="button"
          title="확대"
          onClick={onZoomIn}
          className="rounded-md p-1.5 text-muted-foreground/50 transition-all hover:bg-element hover:text-fg"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}
