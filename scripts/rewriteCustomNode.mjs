import fs from "fs";

const content = `import { memo, useState, useEffect } from "react";
import type { KeyboardEvent } from "react";
import { Handle, Position } from "reactflow";
import { cn } from "@renderer/lib/utils";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import type { WorldEntitySourceType } from "@shared/types";
import { WORLD_GRAPH_MINIMAP_COLORS } from "@shared/constants/worldGraphUI";
import { StickyNote, Clock, Box, User, MapPin, Sparkles, FileText } from "lucide-react";

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

const getEntityIcon = (entityType: string, subType: string) => {
  if (entityType === "Event") return <Clock className="w-4 h-4 text-sky-400" />;
  if (entityType === "Concept" && subType === "Note") return <FileText className="w-5 h-5 text-amber-500/80" />;
  if (entityType === "Character") return <User className="w-4 h-4 text-indigo-400" />;
  if (entityType === "Place") return <MapPin className="w-4 h-4 text-emerald-400" />;
  if (entityType === "Rule") return <Sparkles className="w-4 h-4 text-purple-400" />;
  return <Box className="w-4 h-4 text-muted-foreground/70" />;
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
  
  const accentColor = WORLD_GRAPH_MINIMAP_COLORS[subType] || WORLD_GRAPH_MINIMAP_COLORS[entityType] || "#94a3b8";

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
      <div className={cn(
        "group relative min-w-[260px] max-w-[340px] rounded-bl-3xl rounded-tr-xl rounded-tl-sm rounded-br-sm border border-amber-500/30 bg-amber-50 dark:bg-[#282215] p-0 shadow-lg shadow-amber-900/5 transition-all duration-300",
        selected ? "ring-2 ring-amber-500/40 shadow-amber-500/20 scale-[1.02]" : "hover:shadow-xl hover:-translate-y-0.5"
      )}>
        {/* 상단 마스킹 테이프 UI */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-14 h-6 bg-white/40 dark:bg-white/10 rounded-sm backdrop-blur-md shadow-sm rotate-2 z-10 border border-white/20"></div>
        
        {/* 메모지 접힌 느낌 (우측 하단) */}
        <div className="absolute bottom-0 left-0 w-4 h-4 bg-gradient-to-tr from-transparent via-amber-500/20 to-amber-500/5 dark:via-amber-500/10 rounded-tr-lg"></div>

        <div className="px-5 pt-6 pb-4">
          <div className="flex items-start gap-2.5 mb-3">
            <div className="mt-0.5">{getEntityIcon(entityType, subType)}</div>
            {isEditing ? (
              <input autoFocus value={editLabel} onChange={(e) => setEditLabel(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className="w-full text-[15px] font-bold text-amber-950 dark:text-amber-100 bg-transparent border-b border-amber-500/40 outline-none pb-1" placeholder="노트 제목" />
            ) : (
              <div className="text-[15px] font-bold text-amber-950 dark:text-amber-100 leading-tight flex-1 break-words cursor-text" onDoubleClick={() => setIsEditing(true)}>
                {label || "빈 노트"}
              </div>
            )}
          </div>
          <div className="text-[13px] leading-[1.8] text-amber-900/80 dark:text-amber-100/70 line-clamp-6 whitespace-pre-wrap pl-7">
            {description || <span className="italic opacity-50">아이디어와 설정을 자유롭게 기록하세요...</span>}
          </div>
        </div>
        <Handles x y />
      </div>
    );
  }

  if (isEvent) {
    return (
      <div className={cn("group relative flex items-center gap-3 min-w-[260px] max-w-[360px] transition-all duration-300", selected ? "scale-[1.02]" : "")}>
        <Handles x />
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[3px] bg-background z-10 transition-colors shadow-sm", selected ? "border-sky-500 shadow-sky-500/30" : "border-sky-500/60 group-hover:border-sky-400 group-hover:shadow-sky-400/20")}>
          {getEntityIcon(entityType, subType)}
        </div>
        <div className={cn("flex-1 flex flex-col rounded-2xl border bg-background/95 backdrop-blur-xl p-3.5 shadow-md transition-all relative overflow-hidden", selected ? "border-sky-500/60 ring-1 ring-sky-500/40 shadow-sky-500/20" : "border-border/60 hover:border-sky-500/40")}>
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-sky-400 to-sky-600" />
          <div className="pl-3 relative">
            {/* 연결선 UI (내부) */}
            <div className="absolute -left-[22px] top-1/2 w-[22px] h-[2px] bg-sky-500/30 -translate-y-1/2 -z-10" />
            
            {isEditing ? (
              <input autoFocus value={editLabel} onChange={(e) => setEditLabel(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className="w-full text-[14px] font-bold text-foreground bg-transparent outline-none border-b border-sky-500/40 pb-0.5" placeholder="시간 / 사건명" />
            ) : (
              <div className="w-full text-[14px] font-bold text-foreground truncate cursor-text" onDoubleClick={() => setIsEditing(true)}>
                {label || "무명의 사건"}
              </div>
            )}
            {description && <div className="mt-2 text-[12px] leading-relaxed text-muted-foreground/80 line-clamp-3 bg-muted/30 p-2 rounded-lg">{description}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group relative flex flex-col min-w-[220px] max-w-[300px] rounded-2xl border bg-background/95 backdrop-blur-xl shadow-sm transition-all duration-300 overflow-hidden", selected ? "border-accent ring-2 ring-accent/20 shadow-lg shadow-accent/10 transform -translate-y-0.5" : "border-border/60 hover:border-accent/40 hover:shadow-md")}>
      <div className="h-1.5 w-full opacity-90" style={{ backgroundColor: accentColor }} />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted/60 border border-border/40 shadow-sm" style={{ color: accentColor }}>
            {getEntityIcon(entityType, subType)}
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: accentColor }}>
              {subType && subType !== "Entity" ? subType : entityType}
            </div>
            {isEditing ? (
              <input autoFocus value={editLabel} onChange={(e) => setEditLabel(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className="w-full text-[15px] font-bold text-foreground bg-transparent border-b border-accent outline-none pb-0.5" placeholder="엔티티 이름" />
            ) : (
              <div className="text-[15px] font-bold text-foreground leading-tight truncate cursor-text" onDoubleClick={() => setIsEditing(true)}>
                {label || "무명의 엔티티"}
              </div>
            )}
          </div>
        </div>
        {description && <div className="mt-3 pt-3 border-t border-border/40 text-[12.5px] leading-relaxed text-muted-foreground/85 line-clamp-3">{description}</div>}
      </div>
      <Handles y x />
    </div>
  );
});

CustomEntityNode.displayName = "CustomEntityNode";
`;
fs.writeFileSync("/Users/user/Luie/src/renderer/src/features/research/components/world/graph/components/CustomEntityNode.tsx", content);
console.log("Written file using script!");
