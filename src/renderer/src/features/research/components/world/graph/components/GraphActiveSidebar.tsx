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
import { Button } from "@renderer/components/ui/button";
import { Input } from "@renderer/components/ui/input";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { cn } from "@renderer/lib/utils";
import type { GraphSurfaceTab } from "../types";

type GraphActiveSidebarProps = {
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
};

// ─── Shared Components ───────────────────────────────────────────────────────

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
    <div className="flex flex-col">
      <div
        className="flex h-7 items-center justify-between px-1 hover:bg-white/5 cursor-pointer group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-1 overflow-hidden">
          {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
          <span className="text-[11px] font-bold uppercase tracking-wider text-fg/60 truncate">{title}</span>
        </div>
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          {actions}
        </div>
      </div>
      {isOpen && <div className="py-1">{children}</div>}
    </div>
  );
}

function SidebarItem({
  label,
  icon: Icon,
  isActive,
  onClick,
  subLabel,
  depth = 0,
}: {
  label: string;
  icon: any;
  isActive?: boolean;
  onClick?: () => void;
  subLabel?: string;
  depth?: number;
}) {
  return (
    <div
      className={cn(
        "flex h-7 items-center gap-2 px-2 cursor-pointer transition-colors hover:bg-white/5",
        isActive && "bg-primary/10 text-primary border-r-2 border-primary",
        depth > 0 && `pl-${depth * 4 + 2}`
      )}
      onClick={onClick}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "text-fg/40")} />
      <span className="flex-1 truncate text-[13px] leading-none">{label}</span>
      {subLabel && <span className="text-[10px] text-fg/30 pr-1">{subLabel}</span>}
    </div>
  );
}

// ─── Canvas Tab ─────────────────────────────────────────────────────────────

function CanvasSidebar({ nodes, selectedNode, onSelectNode, onCreatePreset }: any) {
  const [search, setSearch] = useState("");
  const filteredNodes = nodes.filter((n: any) => n.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-fg/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="h-8 pl-8 bg-black/20 border-white/10 text-[13px]"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <SidebarSection 
          title="Nodes Explorer" 
          actions={<Plus className="h-3.5 w-3.5 mr-1 hover:text-fg" onClick={() => onCreatePreset("Character")} />}
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
          <SidebarSection title="Node Inspector">
            <div className="px-4 py-2 space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] text-fg/40 uppercase">Type</span>
                <div className="text-[12px] font-medium">{selectedNode.entityType}</div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-fg/40 uppercase">Description</span>
                <div className="text-[12px] text-fg/60 leading-relaxed italic">
                  {selectedNode.description || "No description provided."}
                </div>
              </div>
            </div>
          </SidebarSection>
        )}
      </ScrollArea>
    </div>
  );
}

// ─── Timeline Tab ───────────────────────────────────────────────────────────

function TimelineSidebar({ timelineNodes, selectedNode, onSelectNode }: any) {
  const sortedEvents = useMemo(() => {
    return [...timelineNodes].sort((a, b) => {
      const dateA = (a.attributes as any)?.date || "";
      const dateB = (b.attributes as any)?.date || "";
      return dateA.localeCompare(dateB);
    });
  }, [timelineNodes]);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 relative">
        <div className="absolute left-[25px] top-6 bottom-6 w-px bg-white/10" />
        
        <div className="space-y-6">
          {sortedEvents.map((event) => (
            <div 
              key={event.id}
              className={cn(
                "relative pl-8 group cursor-pointer",
                selectedNode?.id === event.id ? "text-primary" : "text-fg/60 hover:text-fg"
              )}
              onClick={() => onSelectNode(event.id)}
            >
              <div className={cn(
                "absolute left-0 top-1 w-4 h-4 rounded-full border-2 bg-[#161a21] z-10 transition-all",
                selectedNode?.id === event.id ? "border-primary scale-125" : "border-white/20 group-hover:border-white/40"
              )} />
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-primary/60 tracking-wider">
                  {(event.attributes as any)?.date || "UNDATED"}
                </span>
                <span className="text-[13px] font-medium leading-tight">{event.name}</span>
                {event.description && (
                  <span className="text-[11px] text-fg/30 line-clamp-1">{event.description}</span>
                )}
              </div>
            </div>
          ))}
          {sortedEvents.length === 0 && (
            <div className="text-center py-10 text-[12px] text-fg/30">No events in timeline.</div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

// ─── Notes Tab ──────────────────────────────────────────────────────────────

function NotesSidebar({ notes, selectedNoteId, onSelectNote, onCreateNote }: any) {
  const groupedNotes = useMemo(() => {
    const groups: Record<string, ScrapMemo[]> = { "Uncategorized": [] };
    notes.forEach((note: ScrapMemo) => {
      if (note.tags && note.tags.length > 0) {
        note.tags.forEach((tag: string) => {
          if (!groups[tag]) groups[tag] = [];
          groups[tag].push(note);
        });
      } else {
        groups["Uncategorized"].push(note);
      }
    });
    return groups;
  }, [notes]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <span className="text-[11px] font-bold uppercase text-fg/40">Explorer</span>
        <Plus className="h-4 w-4 text-fg/40 hover:text-fg cursor-pointer" onClick={onCreateNote} />
      </div>
      <ScrollArea className="flex-1">
        {Object.entries(groupedNotes).map(([group, items]) => (
          <SidebarSection key={group} title={group} defaultOpen={group !== "Uncategorized"}>
            {items.map(note => (
              <SidebarItem
                key={note.id}
                label={note.title || "Untitled"}
                icon={FileText}
                isActive={selectedNoteId === note.id}
                onClick={() => onSelectNote(note.id)}
                depth={1}
              />
            ))}
          </SidebarSection>
        ))}
      </ScrollArea>
    </div>
  );
}

// ─── Entity Tab ─────────────────────────────────────────────────────────────

function EntitySidebar({ nodes, selectedNode, onSelectNode }: any) {
  const groupedEntities = useMemo(() => {
    const groups: Record<string, WorldGraphNode[]> = {};
    nodes.forEach((node: WorldGraphNode) => {
      const type = node.entityType;
      if (!groups[type]) groups[type] = [];
      groups[type].push(node);
    });
    return groups;
  }, [nodes]);

  return (
    <ScrollArea className="h-full">
      {Object.entries(groupedEntities).map(([group, items]) => (
        <SidebarSection key={group} title={group}>
          {items.map(node => (
            <SidebarItem
              key={node.id}
              label={node.name}
              icon={Database}
              isActive={selectedNode?.id === node.id}
              onClick={() => onSelectNode(node.id)}
              depth={1}
            />
          ))}
        </SidebarSection>
      ))}
    </ScrollArea>
  );
}

// ─── Library Tab ────────────────────────────────────────────────────────────

function LibrarySidebar({ pluginSummary }: any) {
  return (
    <div className="p-4 space-y-6">
      <div className="space-y-4">
        <h3 className="text-[13px] font-medium flex items-center gap-2">
          <Library className="h-4 w-4 text-primary" /> Core Modules
        </h3>
        <div className="grid gap-2">
          {[
            { label: "Installed", value: pluginSummary.installedCount },
            { label: "Catalog", value: pluginSummary.catalogCount },
            { label: "Templates", value: pluginSummary.templateCount }
          ].map(stat => (
            <div key={stat.label} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
              <span className="text-[12px] text-fg/60">{stat.label}</span>
              <span className="text-[12px] font-bold">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>
      <Button 
        variant="outline" 
        className="w-full text-[12px] border-white/10" 
        onClick={pluginSummary.onReload}
        disabled={pluginSummary.isLoading}
      >
        {pluginSummary.isLoading ? "Reloading..." : "Reload Plugins"}
      </Button>
    </div>
  );
}

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
    <aside className="flex h-full flex-col border-r border-border/60 bg-[#161a21]">
      <div className="flex shrink-0 items-center justify-between h-9 px-3 border-b border-border/60">
        <span className="text-[11px] font-bold uppercase tracking-widest text-fg/40">
          {currentProjectTitle}
        </span>
        <X className="h-4 w-4 text-fg/30 hover:text-fg cursor-pointer" onClick={onClose} />
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "canvas" && (
          <CanvasSidebar 
            nodes={nodes} 
            selectedNode={selectedNode} 
            onSelectNode={onSelectNode} 
            onCreatePreset={onCreatePreset} 
          />
        )}
        {activeTab === "timeline" && (
          <TimelineSidebar 
            timelineNodes={timelineNodes} 
            selectedNode={selectedNode} 
            onSelectNode={onSelectNode} 
          />
        )}
        {activeTab === "notes" && (
          <NotesSidebar 
            notes={notes} 
            selectedNoteId={selectedNoteId} 
            onSelectNote={onSelectNote} 
            onCreateNote={onCreateNote} 
          />
        )}
        {activeTab === "entity" && (
          <EntitySidebar 
            nodes={nodes} 
            selectedNode={selectedNode} 
            onSelectNode={onSelectNode} 
          />
        )}
        {activeTab === "library" && (
          <LibrarySidebar 
            pluginSummary={pluginSummary} 
          />
        )}
      </div>
    </aside>
  );
}
