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
    description?: string | null;
  };
  selected?: boolean;
};

export const CustomEntityNode = memo(({ id, data, selected }: CustomEntityNodeProps) => {
  const { label, subType, entityType, description } = data;
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

  const isNote = entityType === "Concept" && subType === "Note";
  const isEvent = entityType === "Event";
  
  const Handles = ({ x, y }: { x?: boolean; y?: boolean }) => (
    <>
      {y && (
        <>
          <Handle type="target" position={Position.Top} className="opacity-0 group-hover:opacity-100 transition-opacity h-2.5! w-2.5! border-2! border-background! bg-muted-foreground!" />
          <Handle type="source" position={Position.Bottom} className="opacity-0 group-hover:opacity-100 transition-opacity h-2.5! w-2.5! border-2! border-background! bg-muted-foreground!" />
        </>
      )}
      {x && (
        <>
          <Handle type="target" id="left" position={Position.Left} className="opacity-0 group-hover:opacity-100 transition-opacity h-2.5! w-2.5! border-2! border-background! bg-muted-foreground!" />
          <Handle type="source" id="right" position={Position.Right} className="opacity-0 group-hover:opacity-100 transition-opacity h-2.5! w-2.5! border-2! border-background! bg-muted-foreground!" />
        </>
      )}
    </>
  );

  if (isNote) {
    return (
      <div onDoubleClick={(e) => e.stopPropagation()}
        className={cn(
          "group relative min-w-[280px] max-w-[450px] rounded-lg border bg-[#1c1c1c] border-[#363636] p-6 shadow-sm transition-colors",
          selected ? "border-[#666]" : "hover:border-[#4a4a4a]"
        )}>
        <div className="flex flex-col gap-3">
          {isEditing ? (
            <input autoFocus value={editLabel} onChange={(e) => setEditLabel(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className="w-full text-[18px] font-bold text-[#e3e3e3] bg-transparent outline-none" placeholder="노트 제목" />
          ) : (
            <div className="text-[18px] font-bold text-[#e3e3e3] leading-snug cursor-text break-words" onDoubleClick={() => setIsEditing(true)}>
              {label || "빈 노트"}
            </div>
          )}
          {description && (
            <div className="text-[14px] leading-[1.6] text-[#a3a3a3] whitespace-pre-wrap break-words">
              {description}
            </div>
          )}
        </div>
        <Handles x y />
      </div>
    );
  }

  if (isEvent) {
    return (
      <div onDoubleClick={(e) => e.stopPropagation()} className={cn("group relative flex flex-col min-w-[200px] max-w-[300px] rounded-lg border bg-[#1c1c1c] border-[#363636] p-4 transition-colors shadow-sm", selected ? "border-[#666]" : "hover:border-[#4a4a4a]")}>
        <div className="flex flex-col gap-1.5">
           <span className="text-[11px] text-[#888] font-medium tracking-wider uppercase">Event</span>
          {isEditing ? (
            <input autoFocus value={editLabel} onChange={(e) => setEditLabel(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className="w-full text-[15px] font-medium text-[#e3e3e3] bg-transparent outline-none" placeholder="사건명" />
          ) : (
            <div className="text-[15px] font-medium text-[#e3e3e3] cursor-text break-words" onDoubleClick={() => setIsEditing(true)}>
              {label || "무명의 사건"}
            </div>
          )}
          {description && <div className="mt-1 text-[13px] text-[#a3a3a3] line-clamp-3">{description}</div>}
        </div>
        <Handles x y />
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
