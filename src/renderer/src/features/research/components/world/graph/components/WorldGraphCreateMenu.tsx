import { memo, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
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

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate("Concept", name.trim(), "엔티티");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <div
      className="absolute z-[100] flex items-center gap-2.5 rounded-xl border border-border/50 bg-card/95 px-3 py-2.5 shadow-lg backdrop-blur-sm animate-in fade-in zoom-in-95 duration-100"
      style={{ left, top, width: 260 }}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
        <Sparkles size={14} />
      </div>
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="블록 이름을 입력하고 Enter↵"
        className="flex-1 bg-transparent text-[13px] font-medium text-foreground outline-none placeholder:text-muted-foreground/50 placeholder:font-normal"
      />
    </div>
  );
});
