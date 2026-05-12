import { UserPlus, Zap, Users, MapPin, StickyNote, LayoutGrid, Maximize2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { WorldEntitySourceType } from "@shared/types";

interface CreateAction {
  entityType: WorldEntitySourceType | "memo";
  labelKey: string;
  icon: React.ElementType;
  accent: string;
}

const CREATE_ACTIONS: CreateAction[] = [
  { entityType: "Character", labelKey: "canvas.create.character", icon: UserPlus, accent: "hover:text-sky-300" },
  { entityType: "Event",     labelKey: "canvas.create.event",     icon: Zap,      accent: "hover:text-amber-300" },
  { entityType: "Faction",   labelKey: "canvas.create.faction",   icon: Users,    accent: "hover:text-rose-300" },
  { entityType: "Place",     labelKey: "canvas.create.place",     icon: MapPin,   accent: "hover:text-lime-300" },
  { entityType: "memo",      labelKey: "canvas.create.note",      icon: StickyNote, accent: "hover:text-zinc-300" },
];

interface CanvasToolbarProps {
  onCreateEntity: (entityType: WorldEntitySourceType) => void;
  onCreateMemo: () => void;
  onAutoLayout: () => void;
  onFitView: () => void;
}

export function CanvasToolbar({ onCreateEntity, onCreateMemo, onAutoLayout, onFitView }: CanvasToolbarProps) {
  const { t } = useTranslation();

  const handleCreate = (action: CreateAction) => {
    if (action.entityType === "memo") {
      onCreateMemo();
    } else {
      onCreateEntity(action.entityType as WorldEntitySourceType);
    }
  };

  return (
    <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex items-center justify-between">
      {/* Create buttons */}
      <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-border/50 bg-panel/80 px-2 py-1.5 shadow-lg backdrop-blur-md">
        {CREATE_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.entityType}
              type="button"
              title={t(action.labelKey)}
              onClick={() => handleCreate(action)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-muted transition-colors ${action.accent} hover:bg-element/80`}
            >
              <Icon size={13} />
              <span>{t(action.labelKey)}</span>
            </button>
          );
        })}
      </div>

      {/* Canvas controls */}
      <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-border/50 bg-panel/80 px-2 py-1.5 shadow-lg backdrop-blur-md">
        <button
          type="button"
          title={t("canvas.action.autoLayout")}
          onClick={onAutoLayout}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-muted transition-colors hover:bg-element/80 hover:text-fg"
        >
          <LayoutGrid size={13} />
          <span>{t("canvas.action.autoLayout")}</span>
        </button>
        <div className="h-4 w-px bg-border/40" />
        <button
          type="button"
          title={t("canvas.action.fitView")}
          onClick={onFitView}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-element/80 hover:text-fg"
        >
          <Maximize2 size={13} />
        </button>
      </div>
    </div>
  );
}
