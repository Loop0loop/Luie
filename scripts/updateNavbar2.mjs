import fs from "fs";

const content = `import { useCallback } from "react";
import { cn } from "@renderer/lib/utils";
import { LayoutGrid, Clock, FileText, Plus } from "lucide-react";
import { EditorSyncBus } from "@renderer/features/workspace/utils/EditorSyncBus";
import type { WorldEntitySourceType } from "@shared/types";

import { useGraphIdeStore } from "@renderer/features/research/stores/graphIdeStore";

export function WorldGraphNavbar() {
  const activeTab = useGraphIdeStore((state) => state.activeTab);

  const handleAction = useCallback((id: string, type: WorldEntitySourceType) => {
    if (id === "world") {
      EditorSyncBus.emit("SPAWN_GRAPH_DRAFT_NODE", { entityType: type, instant: false });
    } else if (id === "time") {
      EditorSyncBus.emit("OPEN_COMMAND_PALETTE", { mode: "Event" });
    } else if (id === "note") {
      EditorSyncBus.emit("OPEN_COMMAND_PALETTE", { mode: "Note" });
    }
  }, []);

  const buttons = [
    { id: "world", label: "블록", icon: LayoutGrid, type: "Concept" as WorldEntitySourceType, desc: "엔티티 생성" },
    { id: "time", label: "시간선", icon: Clock, type: "Event" as WorldEntitySourceType, desc: "사건 타임라인" },
    { id: "note", label: "노트", icon: FileText, type: "Concept" as WorldEntitySourceType, desc: "확장된 아이디어" },
  ] as const;

  if (activeTab !== "graph") {
    return null;
  }

  return (
    <div className="absolute bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center rounded-xl border border-border/50 bg-panel/95 p-1.5 shadow-xl shadow-black/5 ring-1 ring-black/5 backdrop-blur-md">
      <div className="flex items-center gap-1">
        {buttons.map(({ id, label, icon: Icon, type, desc }) => {
          return (
            <div key={id} className="relative group/tooltip">
              <button
                onClick={() => handleAction(id, type)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                  "text-muted-foreground hover:bg-element hover:text-foreground active:scale-95 group"
                )}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/50 group-hover:bg-background transition-colors shadow-sm">
                  <Icon size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <span>{label}</span>
              </button>
              
              <div className="absolute -top-10 left-1/2 pointer-events-none -translate-x-1/2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 z-50">
                <div className="flex items-center whitespace-nowrap rounded-md bg-foreground/90 px-2.5 py-1 text-xs text-background shadow-md">
                  {desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
`;
fs.writeFileSync("/Users/user/Luie/src/renderer/src/features/research/components/world/graph/components/WorldGraphNavbar.tsx", content);
console.log("Written successfully");
