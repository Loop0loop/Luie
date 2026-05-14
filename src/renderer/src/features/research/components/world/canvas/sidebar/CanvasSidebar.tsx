import type { WorldGraphNode } from "@shared/types";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { ScopeSelector } from "./ScopeSelector";
import { CanvasOutline } from "./CanvasOutline";
import { LayerToggles } from "./LayerToggles";
import { Filters } from "./Filters";

interface CanvasSidebarProps {
  graphNodes: readonly WorldGraphNode[];
}

/**
 * 좌측 사이드바 — Obsidian 스타일.
 *
 * 구성:
 *   Scope    : 어디를 볼지 (항상 열림)
 *   Outline  : 어떤 노드가 있는지 / 빠른 이동 (가변 높이, fill)
 *   Layers   : 어떤 레이어를 보일지 (collapsible)
 *   Filters  : 어떤 노드 종류를 보일지 (collapsible)
 */
export function CanvasSidebar({ graphNodes }: CanvasSidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col overflow-hidden bg-background">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-1 py-2">
          <ScopeSelector />
          <CanvasOutline graphNodes={graphNodes} />
          <LayerToggles />
          <Filters />
        </div>
      </ScrollArea>
    </aside>
  );
}
