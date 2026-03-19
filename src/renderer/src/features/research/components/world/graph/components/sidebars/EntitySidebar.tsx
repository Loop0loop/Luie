import { useMemo } from "react";
import { Database } from "lucide-react";
import type { WorldGraphNode } from "@shared/types";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { SidebarItem, SidebarSection } from "./SidebarPrimitives";

export function EntitySidebar({
  nodes,
  selectedNode,
  onSelectNode,
}: {
  nodes: WorldGraphNode[];
  selectedNode: WorldGraphNode | null;
  onSelectNode: (id: string) => void;
}) {
  const groupedEntities = useMemo(() => {
    const groups: Record<string, WorldGraphNode[]> = {};
    nodes.forEach((node) => {
      if (!groups[node.entityType]) groups[node.entityType] = [];
      groups[node.entityType].push(node);
    });
    return groups;
  }, [nodes]);

  return (
    <ScrollArea className="h-full bg-background/50 pt-2">
      {Object.entries(groupedEntities).map(([group, items]) => (
        <SidebarSection key={group} title={group}>
          {items.map((node) => (
            <SidebarItem
              key={node.id}
              label={node.name}
              icon={Database}
              isActive={selectedNode?.id === node.id}
              onClick={() => onSelectNode(node.id)}
            />
          ))}
        </SidebarSection>
      ))}
    </ScrollArea>
  );
}
