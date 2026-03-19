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
  Clock,
  Layout,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Input } from "@renderer/components/ui/input";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { cn } from "@renderer/lib/utils";
import type {
  EntityRelation,
  ScrapMemo,
  WorldGraphNode,
  WorldTimelineTrack,
} from "@shared/types";
import type { GraphSurfaceTab } from "../types";

interface GraphActiveSidebarProps {
  activeTab: GraphSurfaceTab;
  currentProjectTitle: string;
  nodes: WorldGraphNode[];
  timelines: WorldTimelineTrack[];
  timelineNodes: WorldGraphNode[];
  notes: ScrapMemo[];
  edges: EntityRelation[];
  selectedNode: WorldGraphNode | null;
  selectedTimelineId: string | null;
  selectedNoteId: string | null;
  onCreatePreset: (
    entityType: WorldGraphNode["entityType"],
    subType?: WorldGraphNode["subType"],
  ) => void;
  onSelectNode: (nodeId: string) => void;
  onSaveNode: (input: { name: string; description: string }) => void;
  onDeleteNode: () => void;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onSelectTimeline: (timelineId: string) => void;
  onUpdateTimelines: (timelines: WorldTimelineTrack[]) => void;
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
  icon: React.ElementType;
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

const CanvasSidebar = ({ nodes, selectedNode, onSelectNode, onCreatePreset }: {
  nodes: WorldGraphNode[];
  selectedNode: WorldGraphNode | null;
  onSelectNode: (id: string) => void;
  onCreatePreset: (
    entityType: WorldGraphNode["entityType"],
    subType?: WorldGraphNode["subType"],
  ) => void;
}) => {
  const [search, setSearch] = useState("");
  const filteredNodes = useMemo(() => 
    nodes.filter((n: WorldGraphNode) => n.name.toLowerCase().includes(search.toLowerCase())),
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
          {filteredNodes.map((node: WorldGraphNode) => (
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

const TimelineSidebar = ({
  timelines,
  selectedTimelineId,
  onSelectTimeline,
  onUpdateTimelines,
}: {
  timelines: WorldTimelineTrack[];
  timelineNodes: WorldGraphNode[];
  selectedNode: WorldGraphNode | null;
  selectedTimelineId: string | null;
  onSelectNode: (id: string) => void;
  onSelectTimeline: (id: string) => void;
  onUpdateTimelines: (timelines: WorldTimelineTrack[]) => void;
}) => {
  const handleAddTimeline = () => {
    const id = `timeline-${Date.now()}`;
    const nextTimelines = [
      ...timelines,
      { id, name: "새 타임라인", segments: [] },
    ];
    onUpdateTimelines(nextTimelines);
    onSelectTimeline(id);
  };

  const handleAddSegment = (timelineId: string) => {
    const nextTimelines = timelines.map((t) => {
      if (t.id !== timelineId) return t;
      return {
        ...t,
        segments: [
          ...t.segments,
          { id: `segment-${Date.now()}`, name: "새 분계점" },
        ],
      };
    });
    onUpdateTimelines(nextTimelines);
  };

  const handleRenameTimeline = (id: string, name: string) => {
    onUpdateTimelines(timelines.map(t => t.id === id ? { ...t, name } : t));
  };

  const handleRenameSegment = (timelineId: string, segmentId: string, name: string) => {
    onUpdateTimelines(timelines.map(t => {
      if (t.id !== timelineId) return t;
      return {
        ...t,
        segments: t.segments.map(s => s.id === segmentId ? { ...s, name } : s)
      };
    }));
  };

  const handleDeleteTimeline = (id: string) => {
    onUpdateTimelines(timelines.filter(t => t.id !== id));
  };

  const handleDeleteSegment = (timelineId: string, segmentId: string) => {
    onUpdateTimelines(timelines.map(t => {
      if (t.id !== timelineId) return t;
      return {
        ...t,
        segments: t.segments.filter(s => s.id !== segmentId)
      };
    }));
  };

  return (
    <div className="flex flex-col h-full bg-background/50">
      <ScrollArea className="flex-1">
        <SidebarSection
          title="Tracks"
          actions={
            <Button size="icon-xs" variant="ghost" onClick={handleAddTimeline}>
              <PlusCircle className="w-3.5 h-3.5" />
            </Button>
          }
        >
          {timelines.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-[11px] text-muted-foreground opacity-50">타임라인이 없습니다.</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2 text-[10px] uppercase font-black"
                onClick={handleAddTimeline}
              >
                Create First Track
              </Button>
            </div>
          )}
          {timelines.map((timeline) => (
            <div key={timeline.id} className="group/track">
              <SidebarItem
                label={timeline.name}
                icon={Layout}
                isActive={selectedTimelineId === timeline.id}
                onClick={() => onSelectTimeline(timeline.id)}
              />
              {selectedTimelineId === timeline.id && (
                <div className="ml-4 pl-4 border-l border-white/5 space-y-1 my-1">
                  {timeline.segments.map((seg) => (
                    <div key={seg.id} className="flex items-center gap-2 px-2 py-1 group/seg hover:bg-white/5 rounded-md">
                      <Clock className="w-3 h-3 text-primary/40" />
                      <input
                        className="bg-transparent border-none text-[11px] font-medium text-muted-foreground focus:text-foreground outline-none flex-1 truncate"
                        value={seg.name}
                        onChange={(e) => handleRenameSegment(timeline.id, seg.id, e.target.value)}
                      />
                      <button 
                        className="opacity-0 group-hover/seg:opacity-100 p-0.5 hover:text-red-400 transition-opacity"
                        onClick={() => handleDeleteSegment(timeline.id, seg.id)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    className="flex items-center gap-2 px-2 py-1 text-[10px] text-muted-foreground/60 hover:text-primary transition-colors"
                    onClick={() => handleAddSegment(timeline.id)}
                  >
                    <Plus className="w-3 h-3" /> 분계점 추가
                  </button>
                </div>
              )}
            </div>
          ))}
        </SidebarSection>
      </ScrollArea>
      {selectedTimelineId && (
        <div className="p-3 border-t border-white/5 bg-black/10 flex gap-2">
          <Input 
            className="h-8 text-[11px] bg-white/5 border-none"
            placeholder="Rename Track..."
            value={timelines.find(t => t.id === selectedTimelineId)?.name || ""}
            onChange={(e) => handleRenameTimeline(selectedTimelineId, e.target.value)}
          />
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 hover:text-red-400"
            onClick={() => handleDeleteTimeline(selectedTimelineId)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};

const NotesSidebar = ({ notes, selectedNoteId, onSelectNote, onCreateNote }: {
  notes: ScrapMemo[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
}) => {
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

const EntitySidebar = ({ nodes, selectedNode, onSelectNode }: {
  nodes: WorldGraphNode[];
  selectedNode: WorldGraphNode | null;
  onSelectNode: (id: string) => void;
}) => {
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

const LibrarySidebar = ({ pluginSummary }: { pluginSummary: GraphActiveSidebarProps["pluginSummary"] }) => (
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
  timelines,
  timelineNodes,
  notes,
  selectedNode,
  selectedTimelineId,
  selectedNoteId,
  onCreatePreset,
  onSelectNode,
  onSelectNote,
  onCreateNote,
  onSelectTimeline,
  onUpdateTimelines,
  pluginSummary,
}: GraphActiveSidebarProps) {
  return (
    <aside className="flex h-full flex-col border-r border-border/40 bg-sidebar">
      <div className="flex shrink-0 items-center justify-between h-12 px-4 border-b border-white/5">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 truncate">
          {currentProjectTitle}
        </span>
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
            timelines={timelines}
            timelineNodes={timelineNodes}
            selectedNode={selectedNode}
            selectedTimelineId={selectedTimelineId}
            onSelectNode={onSelectNode}
            onSelectTimeline={onSelectTimeline}
            onUpdateTimelines={onUpdateTimelines}
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
          <EntitySidebar nodes={nodes} selectedNode={selectedNode} onSelectNode={onSelectNode} />
        )}
        {activeTab === "library" && <LibrarySidebar pluginSummary={pluginSummary} />}
      </div>
    </aside>
  );
}
