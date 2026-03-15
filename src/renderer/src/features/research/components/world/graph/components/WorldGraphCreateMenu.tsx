import { memo, useEffect, useRef, useState } from "react";
import { FileText, Clock, Box } from "lucide-react";
import { cn } from "@renderer/lib/utils";
import type { WorldEntitySourceType } from "@shared/types";

interface WorldGraphCreateMenuProps {
  left: number;
  top: number;
  onCreate: (entityType: WorldEntitySourceType, name?: string, subType?: string) => void;
}

export const WorldGraphCreateMenu = memo(function WorldGraphCreateMenu({
  left,
  top,
  onCreate,
}: WorldGraphCreateMenuProps) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"Entity" | "Note" | "Event">("Entity");

  useEffect(() => {
    inputRef.current?.focus();
  }, [mode]);

  const handleCreate = () => {
    if (!name.trim()) return;
    if (mode === "Note") onCreate("Concept", name.trim(), "Note");
    else if (mode === "Event") onCreate("Event", name.trim());
    else onCreate("Concept", name.trim(), "Concept");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <div
      className="absolute z-[100] flex flex-col gap-2 rounded-xl border border-[#363636] bg-[#1c1c1c]/95 p-2 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
      style={{ left, top, width: 260 }}
    >
      <div className="flex gap-1 p-1 bg-[#121212] rounded-lg">
        <button onClick={() => setMode("Entity")} className={cn("flex-1 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer", mode === "Entity" ? "bg-[#333] text-[#e3e3e3]" : "text-[#777] hover:text-[#aaa]")}>블록</button>
        <button onClick={() => setMode("Note")} className={cn("flex-1 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer", mode === "Note" ? "bg-[#333] text-[#e3e3e3]" : "text-[#777] hover:text-[#aaa]")}>노트</button>
        <button onClick={() => setMode("Event")} className={cn("flex-1 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer", mode === "Event" ? "bg-[#333] text-[#e3e3e3]" : "text-[#777] hover:text-[#aaa]")}>시간선</button>
      </div>
      <div className="flex items-center gap-2 px-2 py-1">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#333] text-[#aaa]">
          {mode === "Entity" ? <Box size={13} /> : mode === "Note" ? <FileText size={13} /> : <Clock size={13} />}
        </div>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`${mode === "Entity" ? "블록" : mode === "Note" ? "노트" : "시간선"} 이름 입력하고 Enter↵`}
          className="flex-1 bg-transparent text-[13px] font-medium text-[#e3e3e3] outline-none placeholder:text-[#555] placeholder:font-normal"
        />
      </div>
    </div>
  );
});
