import { memo, useEffect, useState } from "react";
import { Command } from "cmdk";
import { useReactFlow } from "reactflow";
import { Plus, Search, Clock, StickyNote } from "lucide-react";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { EditorSyncBus } from "@renderer/features/workspace/utils/EditorSyncBus";

export type PaletteMode = "Event" | "Note";

interface CanvasCommandPaletteProps {
  mode: PaletteMode;
  onClose: () => void;
}

export const CanvasCommandPalette = memo(({ mode, onClose }: CanvasCommandPaletteProps) => {
  const [search, setSearch] = useState("");
  const allNodes = useWorldBuildingStore((state) => state.graphData?.nodes || []);
  const selectNode = useWorldBuildingStore((state) => state.selectNode);
  const reactFlow = useReactFlow();

  // Filter nodes based on mode
  const targetNodes = allNodes.filter((node) => {
    if (mode === "Event") return node.entityType === "Event";
    if (mode === "Note") return node.entityType === "Concept" && String(node.subType) === "Note";
    return false;
  });

  const filteredNodes = targetNodes.filter((node) => 
    node.name.toLowerCase().includes(search.toLowerCase())
  );

  // Focus input automatically
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleCreateNew = () => {
    EditorSyncBus.emit("SPAWN_GRAPH_DRAFT_NODE", {
      entityType: mode === "Event" ? "Event" : "Concept",
      subType: mode === "Note" ? "Note" : undefined,
      instant: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    onClose();
  };

  const handleSelectExisting = (nodeId: string) => {
    selectNode(nodeId);
    
    // Pan to node
    const node = reactFlow.getNode(nodeId);
    if (node) {
      reactFlow.setCenter(node.position.x, node.position.y, { zoom: 1.2, duration: 800 });
    }
    
    onClose();
  };

  const Icon = mode === "Event" ? Clock : StickyNote;

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-background/20 backdrop-blur-sm transition-all" 
        onClick={onClose} 
      />
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-125 -translate-x-1/2 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <Command
          className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border/50 bg-popover text-popover-foreground shadow-2xl"
          shouldFilter={false}
        >
          <div className="flex items-center border-b border-border/50 px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder={`${mode === "Event" ? "시간/사건" : "노트"} 검색 또는 생성...`}
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Command.List className="max-h-75 overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              검색 결과가 없습니다.
            </Command.Empty>
            
            <Command.Group heading="액션" className="text-xs font-medium text-muted-foreground mb-2">
              <Command.Item
                onSelect={handleCreateNew}
                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 mt-1"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20 text-primary mr-3">
                  <Plus className="h-4 w-4" />
                </div>
                새로운 {mode === "Event" ? "시간" : "노트"} 만들기...
              </Command.Item>
            </Command.Group>

            {filteredNodes.length > 0 && (
              <Command.Group heading={`기존 ${mode === "Event" ? "시간" : "노트"} 목록`} className="text-xs font-medium text-muted-foreground mt-4">
                {filteredNodes.map((node) => (
                  <Command.Item
                    key={node.id}
                    value={node.name}
                    onSelect={() => handleSelectExisting(node.id)}
                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 mt-1"
                  >
                    <Icon className="h-4 w-4 mr-3 opacity-70" />
                    <div className="flex flex-col">
                      <span>{node.name}</span>
                      {node.description && (
                         <span className="text-xs text-muted-foreground/70 truncate max-w-75">
                           {node.description}
                         </span>
                      )}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </>
  );
});

CanvasCommandPalette.displayName = "CanvasCommandPalette";
