import { useMemo, useState } from "react";
import { Layers, Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Input } from "@renderer/components/ui/input";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import type { WorldGraphNode } from "@shared/types";
import { SidebarItem, SidebarSection } from "./SidebarPrimitives";

export function CanvasSidebar({
  nodes,
  selectedNode,
  onSelectNode,
  onCreatePreset,
}: {
  nodes: WorldGraphNode[];
  selectedNode: WorldGraphNode | null;
  onSelectNode: (id: string) => void;
  onCreatePreset: (
    entityType: WorldGraphNode["entityType"],
    subType?: WorldGraphNode["subType"],
  ) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const filteredNodes = useMemo(
    () =>
      nodes.filter((n) => n.name.toLowerCase().includes(search.toLowerCase())),
    [nodes, search],
  );

  return (
    <div className="flex flex-col h-full bg-background/50">
      <div className="p-3">
        <div className="relative group">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("research.graph.sidebar.canvas.search")}
            className="h-9 pl-9 bg-black/20 border-white/5 text-[13px] rounded-lg focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <SidebarSection
          title={t("research.graph.sidebar.canvas.explorer")}
          actions={
            <Button
              size="icon-xs"
              variant="ghost"
              className="w-6 h-6 hover:text-foreground"
              onClick={() => onCreatePreset("Character")}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          }
        >
          {filteredNodes.map((node) => (
            <SidebarItem
              key={node.id}
              label={node.name}
              icon={Layers}
              isActive={selectedNode?.id === node.id}
              onClick={() => onSelectNode(node.id)}
              subLabel={node.entityType}
            />
          ))}
        </SidebarSection>

        {selectedNode ? (
          <SidebarSection title={t("research.graph.sidebar.canvas.details")}>
            <div className="px-4 py-3 space-y-4">
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {t("research.graph.sidebar.canvas.properties")}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Badge
                    variant="secondary"
                    className="text-[10px] h-5 bg-white/5 border-white/5 text-muted-foreground"
                  >
                    {selectedNode.entityType}
                  </Badge>
                </div>
              </div>
              {selectedNode.description ? (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {t("research.graph.sidebar.canvas.bioLog")}
                  </div>
                  <div className="text-[12px] text-muted-foreground leading-relaxed italic bg-black/10 p-2.5 rounded-lg border border-white/5">
                    {selectedNode.description}
                  </div>
                </div>
              ) : null}
            </div>
          </SidebarSection>
        ) : null}
      </ScrollArea>
    </div>
  );
}
