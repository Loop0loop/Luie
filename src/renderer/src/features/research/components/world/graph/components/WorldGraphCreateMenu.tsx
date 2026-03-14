import { useTranslation } from "react-i18next";
import { WORLD_ENTITY_TYPES } from "@shared/constants/world";
import { WORLD_GRAPH_ICON_MAP, WORLD_GRAPH_MINIMAP_COLORS } from "@shared/constants/worldGraphUI";
import type { WorldEntitySourceType } from "@shared/types";

interface WorldGraphCreateMenuProps {
  left: number;
  top: number;
  onCreate: (entityType: WorldEntitySourceType) => void;
}

export function WorldGraphCreateMenu({ left, top, onCreate }: WorldGraphCreateMenuProps) {
  const { t } = useTranslation();

  return (
    <div
      className="absolute z-100 w-52 rounded-xl border border-border/50 bg-panel/98 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
      style={{ left, top }}
    >
      <div className="border-b border-border/30 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          엔티티 생성
        </p>
      </div>
      <div className="flex flex-col p-1.5">
        {WORLD_ENTITY_TYPES.map((entityType) => {
          const Icon = WORLD_GRAPH_ICON_MAP[entityType] ?? WORLD_GRAPH_ICON_MAP["WorldEntity"];
          const color = WORLD_GRAPH_MINIMAP_COLORS[entityType] ?? "#94a3b8";
          return (
            <button
              key={entityType}
              type="button"
              onClick={() => onCreate(entityType)}
              className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all hover:bg-element"
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: `${color}18` }}
              >
                <Icon size={12} strokeWidth={2.5} style={{ color }} />
              </span>
              <span className="text-[12px] font-medium text-fg/80 group-hover:text-fg">
                {t(`world.graph.entityTypes.${entityType}`, { defaultValue: entityType })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
