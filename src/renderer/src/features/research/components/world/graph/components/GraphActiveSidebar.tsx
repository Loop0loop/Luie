import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Search,
  Plus,
  X,
  Layers,
  Database,
  Library,
} from "lucide-react";
import type { EntityRelation, ScrapMemo, WorldGraphNode } from "@shared/types";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Input } from "@renderer/components/ui/input";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { cn } from "@renderer/lib/utils";
import type { GraphSurfaceTab } from "../types";

interface GraphActiveSidebarProps {
  activeTab: GraphSurfaceTab;
  currentProjectTitle: string;
  nodes: WorldGraphNode[];
  timelineNodes: WorldGraphNode[];
  notes: ScrapMemo[];
  edges: EntityRelation[];
  selectedNode: WorldGraphNode | null;
  selectedNoteId: string | null;
  onClose: () => void;
  onCreatePreset: (
    entityType: WorldGraphNode["entityType"],
    subType?: WorldGraphNode["subType"],
  ) => void;
  onSelectNode: (nodeId: string) => void;
  onSaveNode: (input: { name: string; description: string }) => void;
  onDeleteNode: () => void;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onAutoLayout: () => void;
  pluginSummary: {
    catalogCount: number;
    installedCount: number;
    templateCount: number;
    isLoading: boolean;
    error: string | null;
    onReload: () => void;
  };
}

// ─── Shared Components (VS Code Inspired) ───────────────────────────────────

function SidebarSection({
  title,
  defaultOpen = true,
  children,
  actions,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="flex flex-col border-b border-white/5">
      <div
        className="flex h-9 items-center justify-between px-2 hover:bg-white/5 cursor-pointer group select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <span className="text-[11px] font-black uppercase tracking-[0.1em] text-muted-foreground truncate">{title}</span>
        </div>
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          {actions}
        </div>
      </div>
      {isOpen && <div className="pb-2">{children}</div>}
    </div>
  );
}

function SidebarItem({
  label,
  icon: Icon,
  isActive,
  onClick,
  subLabel,
}: {
  label: string;
  icon: any;
  isActive?: boolean;
  onClick?: () => void;
  subLabel?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-8 items-center gap-2.5 px-4 cursor-pointer transition-all select-none",
        isActive ? "bg-primary/10 text-primary border-l-2 border-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
      )}
      onClick={onClick}
    >
      <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground/60")} />
      <span className="flex-1 truncate text-[13px] font-medium leading-none">{label}</span>
      {subLabel && <span className="text-[10px] opacity-40 pr-1">{subLabel}</span>}
    </div>
  );
}

// ─── Tab Contents ────────────────────────────────────────────────────────────

const CanvasSidebar = ({ nodes, selectedNode, onSelectNode, onCreatePreset }: any) => {
  const [search, setSearch] = useState("");
  const filteredNodes = useMemo(() => 
    nodes.filter((n: any) => n.name.toLowerCase().includes(search.toLowerCase())),
    [nodes, search]
  );

  return (
    <div className="flex flex-col h-full bg-background/50">
      <div className="p-3">
        <div className="relative group">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search canvas..."
            className="h-9 pl-9 bg-black/20 border-white/5 text-[13px] rounded-lg focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <SidebarSection 
          title="Explorer" 
          actions={
            <Button size="icon-xs" variant="ghost" className="w-6 h-6 hover:text-foreground" onClick={() => onCreatePreset("Character")}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          }
        >
          {filteredNodes.map((node: any) => (
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
        
        {selectedNode && (
          <SidebarSection title="Details">
            <div className="px-4 py-3 space-y-4">
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Properties</div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Badge variant="secondary" className="text-[10px] h-5 bg-white/5 border-white/5 text-muted-foreground">
                    {selectedNode.entityType}
                  </Badge>
                </div>
              </div>
              {selectedNode.description && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Bio / Log</div>
                  <div className="text-[12px] text-muted-foreground leading-relaxed italic bg-black/10 p-2.5 rounded-lg border border-white/5">
                    {selectedNode.description}
                  </div>
                </div>
              )}
            </div>
          </SidebarSection>
        )}
      </ScrollArea>
    </div>
  );
};

const TimelineSidebar = ({ timelineNodes, selectedNode, onSelectNode }: any) => {
  const sortedEvents = useMemo(() => 
    [...timelineNodes].sort((a, b) => ((a.attributes as any)?.date || "").localeCompare((b.attributes as any)?.date || "")),
    [timelineNodes]
  );

  return (
    <ScrollArea className="h-full bg-background/50">
      <div className="p-6 relative">
        <div className="absolute left-[31px] top-8 bottom-8 w-px bg-white/5" />
        <div className="space-y-8">
          {sortedEvents.map((event) => (
            <div 
              key={event.id}
              className={cn(
                "relative pl-10 group cursor-pointer transition-all",
                selectedNode?.id === event.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onSelectNode(event.id)}
            >
              <div className={cn(
                "absolute left-0 top-1 w-3 h-3 rounded-full border-2 bg-background z-10 transition-all",
                selectedNode?.id === event.id ? "border-primary scale-150 shadow-[0_0_15px_rgba(245,158,11,0.4)]" : "border-white/10 group-hover:border-white/30"
              )} />
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-primary/60 tracking-widest uppercase">
                  {(event.attributes as any)?.date || "Undated"}
                </span>
                <span className="text-[13px] font-bold leading-tight">{event.name}</span>
                {event.description && (
                  <span className="text-[11px] opacity-40 line-clamp-2 leading-relaxed">{event.description}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};

const NotesSidebar = ({ notes, selectedNoteId, onSelectNote, onCreateNote }: any) => {
  const groupedNotes = useMemo(() => {
    const groups: Record<string, ScrapMemo[]> = { "Uncategorized": [] };
    notes.forEach((note: ScrapMemo) => {
      if (note.tags?.length) {
        note.tags.forEach((tag: string) => {
          if (!groups[tag]) groups[tag] = [];
          groups[tag].push(note);
        });
      } else groups["Uncategorized"].push(note);
    });
    return groups;
  }, [notes]);

  return (
    <div className="flex flex-col h-full bg-background/50">
      <ScrollArea className="flex-1 pt-2">
        {Object.entries(groupedNotes).map(([group, items]) => (
          items.length > 0 && (
            <SidebarSection key={group} title={group} defaultOpen={group !== "Uncategorized"}>
              {items.map(note => (
                <SidebarItem
                  key={note.id}
                  label={note.title || "Untitled Note"}
                  icon={FileText}
                  isActive={selectedNoteId === note.id}
                  onClick={() => onSelectNote(note.id)}
                />
              ))}
            </SidebarSection>
          )
        ))}
      </ScrollArea>
      <div className="p-3 border-t border-white/5 bg-black/10">
        <Button size="sm" variant="secondary" className="w-full h-8 text-[11px] font-black uppercase tracking-widest" onClick={onCreateNote}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> New Note
        </Button>
      </div>
    </div>
  );
};

const EntitySidebar = ({ nodes, selectedNode, onSelectNode }: any) => {
  const groupedEntities = useMemo(() => {
    const groups: Record<string, WorldGraphNode[]> = {};
    nodes.forEach((node: WorldGraphNode) => {
      if (!groups[node.entityType]) groups[node.entityType] = [];
      groups[node.entityType].push(node);
    });
    return groups;
  }, [nodes]);

  return (
    <ScrollArea className="h-full bg-background/50 pt-2">
      {Object.entries(groupedEntities).map(([group, items]) => (
        <SidebarSection key={group} title={group}>
          {items.map(node => (
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
};

const LibrarySidebar = ({ pluginSummary }: any) => (
  <div className="p-6 space-y-8 bg-background/50 h-full">
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary font-black text-[11px] uppercase tracking-widest">
        <Library className="w-4 h-4" /> Core Runtime
      </div>
      <div className="grid gap-2.5">
        {[
          { label: "Active Modules", value: pluginSummary.installedCount },
          { label: "Catalog Items", value: pluginSummary.catalogCount },
          { label: "Schema Templates", value: pluginSummary.templateCount }
        ].map(stat => (
          <div key={stat.label} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
            <span className="text-[11px] font-medium text-muted-foreground">{stat.label}</span>
            <span className="text-[13px] font-black">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
    <Button 
      variant="outline" 
      className="w-full h-9 text-[11px] font-black uppercase tracking-widest border-white/10 hover:bg-white/5" 
      onClick={pluginSummary.onReload}
      disabled={pluginSummary.isLoading}
    >
      {pluginSummary.isLoading ? "Syncing..." : "Reload Environment"}
    </Button>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

export function GraphActiveSidebar({
  activeTab,
  currentProjectTitle,
  nodes,
  timelineNodes,
  notes,
  selectedNode,
  selectedNoteId,
  onClose,
  onCreatePreset,
  onSelectNode,
  onSelectNote,
  onCreateNote,
  pluginSummary,
}: GraphActiveSidebarProps) {
  return (
    <aside className="flex h-full flex-col border-r border-white/5 bg-[#0b0e13]">
      <div className="flex shrink-0 items-center justify-between h-12 px-4 border-b border-white/5">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 truncate">
          {currentProjectTitle}
        </span>
        <Button size="icon-xs" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-foreground" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "canvas" && <CanvasSidebar nodes={nodes} selectedNode={selectedNode} onSelectNode={onSelectNode} onCreatePreset={onCreatePreset} />}
        {activeTab === "timeline" && <TimelineSidebar timelineNodes={timelineNodes} selectedNode={selectedNode} onSelectNode={onSelectNode} />}
        {activeTab === "notes" && <NotesSidebar notes={notes} selectedNoteId={selectedNoteId} onSelectNote={onSelectNote} onCreateNote={onCreateNote} />}
        {activeTab === "entity" && <EntitySidebar nodes={nodes} selectedNode={selectedNode} onSelectNode={onSelectNode} />}
        {activeTab === "library" && <LibrarySidebar pluginSummary={pluginSummary} />}
      </div>
    </aside>
  );
}
