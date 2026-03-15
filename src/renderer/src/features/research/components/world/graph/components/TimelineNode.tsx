import { memo, useState, useEffect, type KeyboardEvent } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@renderer/lib/utils";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import type { WorldEntitySourceType } from "@shared/types";

// 타임라인 특화 노드의 데이터 타입
type TimelineNodeData = {
  label: string;
  description?: string | null;
  date?: string; // 타임라인상의 시간/순서 정보
  entityType?: string;
  connectedEntities?: Array<{ id: string; name: string; type: string }>; // 연결된 컨셉/인물 등
};

export const TimelineNode = memo(({ id, data, selected }: NodeProps<TimelineNodeData>) => {
  const { label, description, date, entityType, connectedEntities = [] } = data;
  const updateGraphNode = useWorldBuildingStore((state) => state.updateGraphNode);

  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);

  useEffect(() => {
    setEditLabel(label);
  }, [label]);

  const handleSave = () => {
    setIsEditing(false);
    if (editLabel !== label && editLabel.trim()) {
      void updateGraphNode({ 
        id, 
        entityType: (entityType as WorldEntitySourceType) || "Event", 
        name: editLabel.trim() 
      });
    } else {
      setEditLabel(label);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setEditLabel(label);
      setIsEditing(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center w-10 h-10 group">
      {/* 중앙 코어 형태 (타임라인의 '분기점' 메타포) */}
      <div 
        className={cn(
          "w-5 h-5 rounded-full border-[3px] bg-background z-10 transition-all duration-300",
          selected 
            ? "border-primary shadow-[0_0_25px_hsl(var(--primary))] scale-125 bg-primary/20" 
            : "border-primary/60 shadow-[0_0_10px_hsl(var(--primary)/0.4)] group-hover:border-primary group-hover:scale-110"
        )}
      />

      {/* 내부 글로우 (Yggdrasil 느낌의 빛나는 뿌리 느낌 연출) */}
      <div className="absolute inset-0 rounded-full bg-primary/20 blur-md pointer-events-none -z-10" />

      {/* 타임라인 축 (가로선 기준 좌/우 연결) */}
      <Handle
        type="target"
        position={Position.Left}
        id="timeline-prev"
        className="w-2 h-2 opacity-0 left-2" // 보이지는 않지만 중앙 코어로 선이 빨려들어가도록 위치 조정
      />
      <Handle
        type="source"
        position={Position.Right}
        id="timeline-next"
        className="w-2 h-2 opacity-0 right-2"
      />

      {/* 가지치기 & 엔티티 연결 용 (위/아래) */}
      <Handle type="source" position={Position.Top} id="branch-top" className="w-2 h-2 opacity-0 top-2" />
      <Handle type="source" position={Position.Bottom} id="branch-bottom" className="w-2 h-2 opacity-0 bottom-2" />
      <Handle type="target" position={Position.Top} id="branch-in-top" className="w-2 h-2 opacity-0 top-2" />
      <Handle type="target" position={Position.Bottom} id="branch-in-bottom" className="w-2 h-2 opacity-0 bottom-2" />

      {/* 정보 표시/수정 카드 (점 하단에 메달린 형태) */}
      <div 
        className={cn(
          "absolute top-8 left-1/2 -translate-x-1/2 min-w-[220px] mt-2 flex flex-col gap-1.5 p-3 rounded-lg border bg-surface/80 backdrop-blur-md transition-all",
          selected ? "border-primary shadow-[0_4px_20px_hsl(var(--primary)/0.15)]" : "border-border/60 hover:border-primary/40",
          "origin-top"
        )}
      >
        <div className="flex flex-col gap-0.5">
          {date && <span className="text-[10px] font-medium text-primary tracking-wider">{date}</span>}
          
          {/* 원클릭 수정 기능 */}
          {isEditing ? (
            <input
              type="text"
              className="w-full bg-transparent border-b border-primary outline-none focus:ring-0 px-0 py-0.5 text-sm font-semibold text-foreground"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          ) : (
            <h3 
              className="text-sm font-bold text-foreground cursor-text hover:text-primary transition-colors"
              onClick={() => setIsEditing(true)}
            >
              {label}
            </h3>
          )}
          
          {description && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{description}</p>}
        </div>

        {/* 연결된 엔티티 슬롯들 */}
        {connectedEntities.length > 0 && (
          <div className="mt-1 flex flex-col gap-0.5 border-t border-border/40 pt-1.5">
            <span className="text-[9px] text-muted-foreground/80 flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-primary/50" />
              연결된 흐름 ({connectedEntities.length})
            </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {connectedEntities.map((ent) => (
                <div key={ent.id} className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[10px] text-primary/80">
                  {ent.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

TimelineNode.displayName = "TimelineNode";
