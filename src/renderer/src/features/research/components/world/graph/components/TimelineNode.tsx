import { memo, useState, useEffect, type KeyboardEvent } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@renderer/lib/utils";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import type { WorldEntitySourceType } from "@shared/types";
import { Plus } from "lucide-react";

// 타임라인 특화 노드의 데이터 타입
type TimelineNodeData = {
  label: string;
  description?: string | null;
  date?: string; // 타임라인상의 시간/순서 정보
  entityType?: string;
  connectedEntities?: Array<{ id: string; name: string; type: string }>; // 연결된 컨셉/인물 등
};

export const TimelineNode = memo(
  ({ id, data, selected }: NodeProps<TimelineNodeData>) => {
    const {
      label,
      description,
      date,
      entityType,
      connectedEntities = [],
    } = data;
    const updateGraphNode = useWorldBuildingStore(
      (state) => state.updateGraphNode,
    );

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
          name: editLabel.trim(),
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
      <div className="relative flex flex-col items-center group w-14 h-14 justify-center">
        {/* ─── Yggdrasil Timeline Core (Glowing Nexus) ─── */}
        <div
          className={cn(
            "relative z-10 w-4 h-4 rounded-full bg-white flex items-center justify-center transition-all duration-300",
            selected
              ? "shadow-[0_0_20px_6px_#00ffff,0_0_40px_10px_#6a0dad] scale-125"
              : "shadow-[0_0_15px_4px_#00ffff,0_0_30px_8px_#6a0dad] group-hover:shadow-[0_0_20px_5px_#00ffff,0_0_35px_10px_#6a0dad] group-hover:scale-110",
          )}
        />

        {/* Layered Cosmic Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-[#00ffff]/40 blur-2xl pointer-events-none -z-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-[#6a0dad]/30 blur-3xl pointer-events-none -z-20" />

        {/* ─── 연결 포트 (Seamless Handles) ─── */}

        {/* 주 시간축 (좌/우) */}
        <Handle
          type="target"
          position={Position.Left}
          id="target-timeline-prev"
          className="!w-3 !h-3 !rounded-full !border-0 !bg-transparent hover:!bg-white/80 hover:!shadow-[0_0_10px_#00ffff] transition-all !-left-2 flex items-center justify-center -translate-y-1/2"
        />
        <Handle
          type="source"
          position={Position.Left}
          id="source-timeline-prev"
          className="!w-3 !h-3 !rounded-full !border-0 !bg-transparent hover:!bg-white/80 hover:!shadow-[0_0_10px_#00ffff] transition-all !-left-2 flex items-center justify-center translate-x-[6px] -translate-y-1/2"
        />

        <Handle
          type="source"
          position={Position.Right}
          id="source-timeline-next"
          className="!w-3 !h-3 !rounded-full !border-0 !bg-transparent hover:!bg-white/80 hover:!shadow-[0_0_10px_#00ffff] transition-all !-right-2 flex items-center justify-center -translate-y-1/2"
        />
        <Handle
          type="target"
          position={Position.Right}
          id="target-timeline-next"
          className="!w-3 !h-3 !rounded-full !border-0 !bg-transparent hover:!bg-white/80 hover:!shadow-[0_0_10px_#00ffff] transition-all !-right-2 flex items-center justify-center -translate-x-[6px] -translate-y-1/2"
        />

        {/* 가지치기 분기점 (상/하) */}
        <Handle
          type="target"
          position={Position.Top}
          id="target-branch-in-top"
          className="!w-3 !h-3 !rounded-full !border-0 !bg-transparent hover:!bg-white/80 hover:!shadow-[0_0_10px_#6a0dad] transition-all !-top-2 flex items-center justify-center"
        >
          <Plus className="w-2 h-2 text-white opacity-0 hover:opacity-100 pointer-events-none transition-opacity" />
        </Handle>
        <Handle
          type="source"
          position={Position.Top}
          id="source-branch-top"
          className="!w-3 !h-3 !rounded-full !border-0 !bg-transparent hover:!bg-white/80 hover:!shadow-[0_0_10px_#6a0dad] transition-all !-top-2 flex items-center justify-center translate-y-[6px]"
        />

        <Handle
          type="source"
          position={Position.Bottom}
          id="source-branch-bottom"
          className="!w-3 !h-3 !rounded-full !border-0 !bg-transparent hover:!bg-white/80 hover:!shadow-[0_0_10px_#6a0dad] transition-all !-bottom-2 flex items-center justify-center"
        >
          <Plus className="w-2 h-2 text-white opacity-0 hover:opacity-100 pointer-events-none transition-opacity" />
        </Handle>
        <Handle
          type="target"
          position={Position.Bottom}
          id="target-branch-in-bottom"
          className="!w-3 !h-3 !rounded-full !border-0 !bg-transparent hover:!bg-white/80 hover:!shadow-[0_0_10px_#6a0dad] transition-all !-bottom-2 flex items-center justify-center -translate-y-[6px]"
        />

        {/* ─── Floating Information ─── */}
        <div
          className={cn(
            "absolute top-[calc(100%+16px)] flex flex-col gap-1 min-w-[200px] w-max max-w-[300px] pointer-events-none",
            "transition-all duration-300",
            selected
              ? "opacity-100 translate-y-0"
              : "opacity-70 group-hover:opacity-100 translate-y-1",
          )}
        >
          <div className="flex flex-col gap-1 w-full pointer-events-auto items-center text-center">
            {date && (
              <span className="text-[10px] font-bold text-[#00ffff] uppercase tracking-widest drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]">
                {date}
              </span>
            )}

            {isEditing ? (
              <input
                type="text"
                className="w-full bg-black/40 backdrop-blur-sm border-b border-[#00ffff] outline-none focus:ring-0 px-2 py-1 text-[14px] font-bold text-white text-center rounded-t-sm shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            ) : (
              <div
                className="text-[14px] font-bold text-white cursor-text hover:text-[#00ffff] transition-colors flex flex-col items-center justify-center group/title w-full drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)]"
                onClick={() => setIsEditing(true)}
              >
                <span className="truncate w-full">{label}</span>
                <span className="opacity-0 group-hover/title:opacity-100 text-[9px] font-normal text-[#00ffff]/80 mt-0.5 shrink-0 transition-opacity">
                  클릭하여 수정
                </span>
              </div>
            )}

            {description && (
              <p className="text-[11px] text-white/80 line-clamp-2 mt-0.5 leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                {description}
              </p>
            )}
          </div>

          {connectedEntities.length > 0 && (
            <div className="mt-2 flex flex-col items-center gap-1.5 pt-1 pointer-events-auto">
              <div className="flex flex-wrap justify-center gap-1.5">
                {connectedEntities.map((ent) => (
                  <div
                    key={ent.id}
                    className="rounded-full bg-black/40 backdrop-blur-md border border-[#00ffff]/30 px-2 py-0.5 text-[10px] text-white/90 font-medium shadow-[0_0_10px_rgba(0,255,255,0.15)] hover:border-[#00ffff]/60 transition-colors"
                  >
                    {ent.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

TimelineNode.displayName = "TimelineNode";
