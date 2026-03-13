import { memo } from "react";
import { useWorldBuildingStore, useFilteredGraph } from "@renderer/features/research/stores/worldBuildingStore";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { WORLD_GRAPH_ICON_MAP } from "@shared/constants/worldGraphUI";

export const EntityInspectorPanel = memo(() => {
  const selectedNodeId = useWorldBuildingStore((state) => state.selectedNodeId);
  const { nodes } = useFilteredGraph();
  
  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  if (!selectedNode) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-panel/50 text-sm text-muted-foreground">
        <p>선택된 요소가 없습니다.</p>
      </div>
    );
  }

  const { name, description, entityType, subType } = selectedNode;
  const Icon = WORLD_GRAPH_ICON_MAP[subType ?? entityType] ?? WORLD_GRAPH_ICON_MAP["WorldEntity"];

  return (
    <div className="flex h-full w-full flex-col bg-panel border-l border-border/40 overflow-hidden">
      <div className="flex flex-col gap-3 p-4 shrink-0 bg-background/50 border-b border-border/40">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon size={16} />
          <span className="text-xs font-semibold tracking-wider uppercase opacity-80">{subType ?? entityType}</span>
        </div>
        <h2 className="text-xl font-bold text-foreground leading-tight tracking-tight break-keep">
          {name}
        </h2>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-8 pb-8">
          
          {/* 1. 기본 정보 (Basic Info) */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-1">1. 기본 정보</h3>
            <div className="text-sm mt-1">
              {description ? (
                <p className="leading-relaxed text-foreground/90 whitespace-pre-wrap">{description}</p>
              ) : (
                <p className="italic text-muted-foreground/60">설명이 없습니다.</p>
              )}
            </div>
          </section>

          {/* 2. 속성 편집 (Attributes) */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-1">2. 속성 (Attributes)</h3>
            <div className="rounded-md border border-border/40 bg-background/50 p-3 text-sm mt-1 flex flex-col gap-2">
              <div className="grid grid-cols-[80px_1fr] items-center gap-2 text-muted-foreground">
                <span className="text-xs text-muted-foreground/80">타입</span>
                <span className="font-medium text-foreground">{entityType} {subType && `(${subType})`}</span>
              </div>
              
              {/* Importance */}
              <div className="grid grid-cols-[80px_1fr] items-center gap-2 text-muted-foreground">
                <span className="text-xs text-muted-foreground/80">중요도</span>
                <span className="font-medium text-foreground">
                  {typeof selectedNode.attributes === "object" && selectedNode.attributes && "importance" in selectedNode.attributes 
                    ? String((selectedNode.attributes as Record<string, unknown>).importance) 
                    : "보통"}
                </span>
              </div>

              {/* Entity Type Specific Fields */}
              {entityType === "Character" && (
                <>
                  <div className="grid grid-cols-[80px_1fr] items-center gap-2 text-muted-foreground">
                    <span className="text-xs text-muted-foreground/80">나이</span>
                    <span className="font-medium text-foreground">{String((selectedNode.attributes as Record<string, unknown>)?.age || "알 수 없음")}</span>
                  </div>
                  <div className="grid grid-cols-[80px_1fr] items-center gap-2 text-muted-foreground">
                    <span className="text-xs text-muted-foreground/80">역할</span>
                    <span className="font-medium text-foreground">{String((selectedNode.attributes as Record<string, unknown>)?.role || "미정")}</span>
                  </div>
                </>
              )}

              {entityType === "Event" && (
                <>
                  <div className="grid grid-cols-[80px_1fr] items-center gap-2 text-muted-foreground">
                    <span className="text-xs text-muted-foreground/80">발생 시점</span>
                    <span className="font-medium text-foreground">{String((selectedNode.attributes as Record<string, unknown>)?.time || "미정")}</span>
                  </div>
                </>
              )}

              {entityType === "Place" && (
                <>
                  <div className="grid grid-cols-[80px_1fr] items-center gap-2 text-muted-foreground">
                    <span className="text-xs text-muted-foreground/80">위치</span>
                    <span className="font-medium text-foreground">{String((selectedNode.attributes as Record<string, unknown>)?.region || "알 수 없음")}</span>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* 3. 관계 설정 (Relations) */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-1">3. 관계 (Relations)</h3>
            <div className="text-sm mt-1 text-muted-foreground/80 italic">
              관계선은 캔버스에서 직접 클릭하여 수정할 수 있습니다.
            </div>
          </section>

          {/* 4. 타임라인 (Timeline) */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-1">4. 타임라인</h3>
            <div className="text-sm mt-1 text-muted-foreground/80 italic">
              관련 사건 및 시간 순서 정보가 올 예정입니다.
            </div>
          </section>

          {/* 5. 메모 및 스크랩 (Notes/Scrap) */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-1">5. 메모/스크랩</h3>
            <div className="text-sm mt-1 text-muted-foreground/80 italic">
              해당 엔티티와 연결된 노트 리스트가 표시됩니다.
            </div>
          </section>

          {/* 6. 파일/미디어 첨부 (Attachments) */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-1">6. 첨부파일</h3>
            <div className="text-sm mt-1 text-muted-foreground/80 italic">
              첨부된 이미지나 미디어가 없습니다.
            </div>
          </section>

          {/* 7. 상태 및 중요도 (Status/Importance) */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-1">7. 상태/중요도</h3>
            <div className="text-sm mt-1 text-muted-foreground/80 italic">
              집필 상태 및 비중 정보 패널
            </div>
          </section>

          {/* 8. 추가 기능 (Advanced) */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-1">8. 고급 추가 기능</h3>
            <div className="mt-2 text-sm text-muted-foreground/80 italic">
              엔티티 삭제 등 고급 동작 지원
            </div>
          </section>

        </div>
      </ScrollArea>
    </div>
  );
});

EntityInspectorPanel.displayName = "EntityInspectorPanel";
