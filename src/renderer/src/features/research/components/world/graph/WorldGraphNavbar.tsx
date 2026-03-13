import { useCallback } from "react";
import { cn } from "@renderer/lib/utils";
import { LayoutGrid, Clock, StickyNote } from "lucide-react";
import { EditorSyncBus } from "@renderer/features/workspace/utils/EditorSyncBus";
import type { WorldEntitySourceType } from "@shared/types";

export function WorldGraphNavbar() {
  const spawnNode = useCallback((entityType: WorldEntitySourceType) => {
    EditorSyncBus.emit("SPAWN_GRAPH_DRAFT_NODE", { entityType });
  }, []);

  const buttons = [
    { id: "world", label: "블록 추가", icon: LayoutGrid, type: "Concept" as WorldEntitySourceType },
    { id: "time", label: "시간 추가", icon: Clock, type: "Event" as WorldEntitySourceType },
    { id: "note", label: "노트 추가", icon: StickyNote, type: "Concept" as WorldEntitySourceType },
  ] as const;

  return (
    <div className="absolute bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border/40 bg-background/80 p-1 shadow-lg ring-1 ring-black/5 backdrop-blur-md">
      {buttons.map(({ id, label, icon: Icon, type }) => {
        return (
          <button
            key={id}
            onClick={() => spawnNode(type)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
              "text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 group"
            )}
          >
            <Icon size={14} className="text-muted-foreground transition-colors group-hover:text-foreground" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
