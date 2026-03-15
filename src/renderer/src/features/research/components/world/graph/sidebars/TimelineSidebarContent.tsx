import { useMemo } from "react";
import { GitBranchPlus, GitCommitHorizontal, Link2, PlusCircle, CalendarDays, Users, Layers, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { EditorSyncBus } from "@renderer/features/workspace/utils/EditorSyncBus";
import { SidebarTreeSection } from "./SidebarTreeSection";
import { buildTimelineEntries } from "../utils/worldGraphIdeViewModels";

export function TimelineSidebarContent() {
  const { t } = useTranslation();

  const graphData = useWorldBuildingStore((s) => s.graphData);
  const selectedNodeId = useWorldBuildingStore((s) => s.selectedNodeId);
  const selectNode = useWorldBuildingStore((s) => s.selectNode);

  const { events, characters, eras, totalConnectedEntities } = useMemo(() => {
    const nodes = graphData?.nodes ?? [];
    const timelineEntries = buildTimelineEntries(nodes, "");
    
    // 타임라인 내에 엔티티가 얼마나 연결되어 있는지 통계 추산 로직
    const eventsArray = nodes.filter((n) => n.entityType === "Event");
    const connectedEntitiesCount = eventsArray.reduce((acc, curr) => {
      const entities = (curr.attributes?.connectedEntities as unknown[])?.length || 0;
      return acc + entities;
    }, 0);

    return {
      events: eventsArray,
      characters: nodes.filter((n) => n.entityType === "Character"),
      eras: Array.from(new Set(timelineEntries.map((entry) => entry.dateLabel))),
      totalConnectedEntities: connectedEntitiesCount,
    };
  }, [graphData]);

  const handleCreateRoot = () => {
    EditorSyncBus.emit("SPAWN_GRAPH_DRAFT_NODE", { entityType: "Event", instant: false });
  };

  const handleCreateBranch = () => {
    // 분기 추가: 현재는 단순 이벤트 생성으로 매핑하나, 추후 선택된 노드 밑에 타겟 드래프트 노드를 스폰하도록 확장 가능
    EditorSyncBus.emit("SPAWN_GRAPH_DRAFT_NODE", { entityType: "Event", instant: false });
  };

  const handleLinkEntity = () => {
    EditorSyncBus.emit("OPEN_COMMAND_PALETTE", { mode: "Event" });
  };

  const renderNodeItem = (node: (typeof events)[0]) => {
    const isActive = selectedNodeId === node.id;
    return (
      <button
        key={node.id}
        type="button"
        onClick={() => selectNode(node.id)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-[5px] text-left text-[12px] transition-all",
          isActive
            ? "bg-primary/10 text-primary font-medium border border-primary/20"
            : "text-foreground/80 hover:bg-element/80",
        )}
      >
        <GitCommitHorizontal className="w-3 h-3 opacity-50" />
        <span className="flex-1 truncate">{node.name}</span>
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto w-full">
      {/* 1. 패널 상단: 메타포 명시 및 설명 */}
      <div className="px-4 pt-5 pb-3 border-b border-border/40">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Yggdrasil 타임라인 메타포
        </h2>
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed break-keep">
          시간은 하나의 줄기가 아닙니다. <br/>
          여러 갈래로 뻗어 나가는 시간선 위에 구체적인 사건과 인물 등 엔티티를 연결하여 맥락을 완성해보세요.
        </p>
      </div>

      {/* 2. 핵심 분기 관리 액션 (오른쪽 패널 즉시 노출) */}
      <div className="p-3 border-b border-border/40 flex flex-col gap-1.5 space-y-1">
        <button 
          onClick={handleCreateRoot}
          className="flex items-center gap-2 w-full px-3 py-2 text-[12px] font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>새 타임라인 (줄기) 추가</span>
        </button>
        
        <button 
          onClick={handleCreateBranch}
          disabled={!selectedNodeId}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 text-[12px] font-medium rounded-lg transition-colors",
            selectedNodeId 
              ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" 
              : "opacity-40 cursor-not-allowed bg-secondary/50 text-secondary-foreground"
          )}
        >
          <GitBranchPlus className="w-3.5 h-3.5" />
          <span>분기 (Branch) 추가</span>
        </button>

        <button 
          onClick={handleLinkEntity}
          disabled={!selectedNodeId}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 text-[12px] font-medium rounded-lg transition-colors border border-border/50",
            selectedNodeId 
              ? "bg-transparent text-foreground hover:bg-element" 
              : "opacity-40 cursor-not-allowed text-muted-foreground"
          )}
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>엔티티 연결하기</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Events */}
        <SidebarTreeSection
          title={t("world.graph.ide.sidebar.timeline.events", "사건 목록")}
          actionIcon={<CalendarDays className="h-3.5 w-3.5" />}
        >
          {events.length === 0 ? (
            <p className="px-2 py-1.5 text-[11px] text-muted-foreground/50">등록된 사건이 없습니다. 위 버튼을 눌러 추가해보세요.</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {events.map(renderNodeItem)}
            </div>
          )}
        </SidebarTreeSection>

        {/* Characters */}
        <SidebarTreeSection
          title={t("world.graph.ide.sidebar.timeline.characters", "Characters")}
          actionIcon={<Users className="h-3.5 w-3.5" />}
          defaultExpanded={false}
        >
          {characters.length === 0 ? (
            <p className="px-2 py-1.5 text-[11px] text-muted-foreground/50">캐릭터가 없습니다</p>
          ) : (
            characters.map(renderNodeItem)
          )}
        </SidebarTreeSection>

        {/* Era */}
        <SidebarTreeSection
          title={t("world.graph.ide.sidebar.timeline.era", "Era")}
          actionIcon={<Layers className="h-3.5 w-3.5" />}
          defaultExpanded={false}
        >
          {eras.length === 0 ? (
            <p className="px-2 py-1.5 text-[11px] text-muted-foreground/50">시기가 없습니다</p>
          ) : eras.map((era) => (
            <button
              key={era}
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-[5px] text-left text-[12px] text-foreground/60 transition-all hover:bg-element/80 hover:text-foreground"
            >
              <span className="flex-1 truncate">{era}</span>
            </button>
          ))}
        </SidebarTreeSection>
      </div>

      {/* 4. 하단 확장성 지표 (통계) */}
      <div className="mt-auto p-3 bg-element/30 border-t border-border/40 shrink-0">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
            <Link2 className="w-3 h-3" /> 연결된 전체 엔티티
          </span>
          <span className="text-[11px] font-bold text-primary">{totalConnectedEntities}개</span>
        </div>
      </div>
    </div>
  );
}
