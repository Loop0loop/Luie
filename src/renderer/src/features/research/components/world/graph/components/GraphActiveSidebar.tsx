import type {
  ScrapMemo,
  WorldGraphNode,
  WorldTimelineTrack,
} from "@shared/types";
import { CanvasSidebar } from "./sidebars/CanvasSidebar";
import { EntitySidebar } from "./sidebars/EntitySidebar";
import { LibrarySidebar } from "./sidebars/LibrarySidebar";
import { NotesSidebar } from "./sidebars/NotesSidebar";
import { TimelineSidebar } from "./sidebars/TimelineSidebar";
import type { GraphSurfaceTab } from "../types";

export interface GraphActiveSidebarProps {
  activeTab: GraphSurfaceTab;
  currentProjectTitle: string;
  nodes: WorldGraphNode[];
  timelines: WorldTimelineTrack[];
  notes: ScrapMemo[];
  selectedNode: WorldGraphNode | null;
  selectedTimelineId: string | null;
  selectedNoteId: string | null;
  onCreatePreset: (
    entityType: WorldGraphNode["entityType"],
    subType?: WorldGraphNode["subType"],
  ) => void;
  onSelectNode: (nodeId: string) => void;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onSelectTimeline: (timelineId: string) => void;
  onUpdateTimelines: (timelines: WorldTimelineTrack[]) => void;
  pluginSummary: {
    catalogCount: number;
    installedCount: number;
    templateCount: number;
    isLoading: boolean;
    error: string | null;
    onReload: () => void;
  };
}

export function GraphActiveSidebar({
  activeTab,
  currentProjectTitle,
  nodes,
  timelines,
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
        {activeTab === "canvas" ? (
          <CanvasSidebar
            nodes={nodes}
            selectedNode={selectedNode}
            onSelectNode={onSelectNode}
            onCreatePreset={onCreatePreset}
          />
        ) : null}
        {activeTab === "timeline" ? (
          <TimelineSidebar
            timelines={timelines}
            selectedTimelineId={selectedTimelineId}
            onSelectTimeline={onSelectTimeline}
            onUpdateTimelines={onUpdateTimelines}
          />
        ) : null}
        {activeTab === "notes" ? (
          <NotesSidebar
            notes={notes}
            selectedNoteId={selectedNoteId}
            onSelectNote={onSelectNote}
            onCreateNote={onCreateNote}
          />
        ) : null}
        {activeTab === "entity" ? (
          <EntitySidebar
            nodes={nodes}
            selectedNode={selectedNode}
            onSelectNode={onSelectNode}
          />
        ) : null}
        {activeTab === "library" ? (
          <LibrarySidebar pluginSummary={pluginSummary} />
        ) : null}
      </div>
    </aside>
  );
}
