import { memo, useState, useEffect } from "react";
import type { KeyboardEvent } from "react";
import { Handle, Position } from "reactflow";
import { cn } from "@renderer/lib/utils";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import type { WorldEntitySourceType } from "@shared/types";

type CustomEntityNodeProps = {
  id: string;
  data: {
    label: string;
    subType: string;
    entityType: string;
    isNote?: boolean;
    description?: string | null;
    tags?: string[];
  };
  selected?: boolean;
};

export const CustomEntityNode = memo(({ id, data, selected }: CustomEntityNodeProps) => {
  const { label, subType, entityType, description, tags = [] } = data;
  const updateGraphNode = useWorldBuildingStore((state) => state.updateGraphNode);

  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);

  useEffect(() => {
    setEditLabel(label);
  }, [label]);

  const handleSave = () => {
    setIsEditing(false);
    if (editLabel !== label) {
      void updateGraphNode({ id, entityType: entityType as WorldEntitySourceType, name: editLabel });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditLabel(label);
    }
  };

  const isNote = Boolean(data.isNote) || (entityType === "Concept" && subType === "Note");
  const isEvent = entityType === "Event";
  
  const Handles = ({ x, y }: { x?: boolean; y?: boolean }) => (
    <>
      {y && (
        <>
          <Handle type="target" id="target-top" position={Position.Top} className="opacity-0 group-hover:opacity-100 transition-opacity h-2.5! w-2.5! border-2! border-background! bg-muted-foreground!" />
          <Handle type="source" id="source-top" position={Position.Top} className="opacity-0 group-hover:opacity-100 transition-opacity h-2.5! w-2.5! border-2! border-background! bg-muted-foreground! translate-y-[7px]" />
          <Handle type="target" id="target-bottom" position={Position.Bottom} className="opacity-0 group-hover:opacity-100 transition-opacity h-2.5! w-2.5! border-2! border-background! bg-muted-foreground! -translate-y-[7px]" />
          <Handle type="source" id="source-bottom" position={Position.Bottom} className="opacity-0 group-hover:opacity-100 transition-opacity h-2.5! w-2.5! border-2! border-background! bg-muted-foreground!" />
        </>
      )}
      {x && (
        <>
          <Handle type="target" id="target-left" position={Position.Left} className="opacity-0 group-hover:opacity-100 transition-opacity h-2.5! w-2.5! border-2! border-background! bg-muted-foreground!" />
          <Handle type="source" id="source-left" position={Position.Left} className="opacity-0 group-hover:opacity-100 transition-opacity h-2.5! w-2.5! border-2! border-background! bg-muted-foreground! translate-x-[7px]" />
          <Handle type="target" id="target-right" position={Position.Right} className="opacity-0 group-hover:opacity-100 transition-opacity h-2.5! w-2.5! border-2! border-background! bg-muted-foreground! -translate-x-[7px]" />
          <Handle type="source" id="source-right" position={Position.Right} className="opacity-0 group-hover:opacity-100 transition-opacity h-2.5! w-2.5! border-2! border-background! bg-muted-foreground!" />
        </>
      )}
    </>
  );

  if (isNote) {
    return (
      <div onDoubleClick={(e) => e.stopPropagation()}
        className={cn(
          "group relative min-w-[280px] max-w-[450px] rounded-xl border bg-[#1e1e1e] border-[#363636] p-5 shadow-xl transition-all",
          selected ? "border-[#555] shadow-[#000000_0_8px_30px]" : "hover:border-[#444]"
        )}>
        <div className="flex flex-col">
          <div className="flex flex-col gap-2.5 mb-4">
            {isEditing ? (
              <input autoFocus value={editLabel} onChange={(e) => setEditLabel(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className="w-full text-[20px] font-bold text-[#e8e8e8] bg-transparent outline-none" placeholder="노트 제목" />
            ) : (
              <div className="text-[20px] font-bold text-[#e8e8e8] leading-snug cursor-text break-words tracking-tight" onDoubleClick={() => setIsEditing(true)}>
                {label || "빈 노트"}
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-1">
              {(tags && tags.length > 0 ? tags : ["설정", "아이디어"]).map((t, i) => (
                <span key={i} className="px-2.5 py-0.5 rounded-md bg-[#2a2a2a] text-[#8c8c8c] text-[12px] font-medium ring-1 ring-inset ring-[#3a3a3a]">#{t}</span>
              ))}
            </div>
          </div>
          
          <div className="w-full h-px bg-gradient-to-r from-[#333] to-transparent mb-4" />

          <div className="text-[14.5px] leading-[1.7] text-[#b0b0b0] whitespace-pre-wrap break-words min-h-[60px]">
            {description || <span className="italic opacity-40">이곳에 본문을 작성하세요...</span>}
          </div>
        </div>
        <Handles x y />
      </div>
    );
  }

  if (isEvent) {
    return (
      <div onDoubleClick={(e) => e.stopPropagation()} className={cn("group relative flex items-center min-w-[200px] max-w-[320px] p-2 transition-colors", selected ? "scale-105" : "")}>
        <Handles x y />
        
        {/* Glowing Timeline Branch Point */}
        <div className="relative flex items-center justify-center w-8 h-8 mr-4 z-10 shrink-0">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-md animate-pulse"></div>
          <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
          <div className="w-3 h-3 bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,1),0_0_20px_rgba(96,165,250,0.8)] z-10 border border-blue-200"></div>
          <div className="absolute w-[2px] h-20 bg-gradient-to-b from-transparent via-blue-400/30 to-transparent -z-10"></div>
        </div>

        <div className={cn("flex-1 flex flex-col gap-1.5 rounded-lg border bg-[#1c1c1c]/90 backdrop-blur-sm border-[#363636] p-4 shadow-lg", selected ? "border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]" : "hover:border-[#4a4a4a]")}>
          <span className="text-[10px] text-blue-400/80 font-bold tracking-widest uppercase mb-0.5">Timeline Event</span>
          {isEditing ? (
            <input autoFocus value={editLabel} onChange={(e) => setEditLabel(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className="w-full text-[16px] font-semibold text-[#f0f0f0] bg-transparent outline-none" placeholder="사건 / 분기명" />
          ) : (
            <div className="text-[16px] font-semibold text-[#f0f0f0] cursor-text break-words tracking-wide" onDoubleClick={() => setIsEditing(true)}>
              {label || "새 사건"}
            </div>
          )}
          {description && <div className="mt-1.5 text-[13px] text-[#999] line-clamp-3 leading-relaxed">{description}</div>}
        </div>
      </div>
    );
  }

  return (
    <div onDoubleClick={(e) => e.stopPropagation()} className={cn("group relative flex flex-col min-w-[80px] max-w-[250px] rounded-lg border bg-[#1c1c1c] border-[#363636] px-5 py-3 transition-colors shadow-sm", selected ? "border-[#666]" : "hover:border-[#4a4a4a]")}>
      {isEditing ? (
        <input autoFocus value={editLabel} onChange={(e) => setEditLabel(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className="w-full text-[14px] text-[#e3e3e3] bg-transparent outline-none text-center" placeholder="엔티티 이름" />
      ) : (
        <div className="text-[14px] text-[#e3e3e3] truncate cursor-text text-center" onDoubleClick={() => setIsEditing(true)}>
          {label || "무명의 엔티티"}
        </div>
      )}
      <Handles y x />
    </div>
  );
});

CustomEntityNode.displayName = "CustomEntityNode";
