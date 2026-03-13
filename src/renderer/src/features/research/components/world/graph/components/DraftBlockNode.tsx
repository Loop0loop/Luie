import { memo, useEffect, useRef, useState } from "react";
import { Handle, Position } from "reactflow";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import { Sparkles } from "lucide-react";
import { WORLD_ENTITY_TYPES } from "@shared/constants/world";
import type { WorldEntitySourceType } from "@shared/types";

type DraftEntityType = (typeof WORLD_ENTITY_TYPES)[number];

export type DraftBlockNodeProps = {
  data: {
    onConvert: (
      id: string,
      payload: {
        text: string;
        entityType: DraftEntityType;
      },
    ) => void;
    id: string;
    initialValue?: string;
    initialEntityType?: DraftEntityType;
  };
  selected?: boolean;
};

export const DraftBlockNode = memo(({ data, selected }: DraftBlockNodeProps) => {
  const {
    onConvert,
    id,
    initialValue = "",
    initialEntityType = "Concept",
  } = data;
  const [text, setText] = useState(initialValue);
  const [entityType, setEntityType] = useState<DraftEntityType>(initialEntityType);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isConverting = useRef(false);
  const { t } = useTranslation();

  useEffect(() => {
    // Focus automatically and set cursor to end
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
    }
  }, []);

  const handleConvert = () => {
    if (isConverting.current) return;
    const trimmed = text.trim();
    isConverting.current = true;
    onConvert(id, {
      text: trimmed,
      entityType,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Shift+Enter to newline, Enter to submit
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleConvert();
    }
  };

  const isFocusMovingInsideBlock = (nextTarget: EventTarget | null) => {
    return nextTarget instanceof Node && Boolean(rootRef.current?.contains(nextTarget));
  };

  const handleTextareaBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    if (isFocusMovingInsideBlock(event.relatedTarget)) {
      return;
    }
    handleConvert();
  };

  const handleTypeBlur = (event: React.FocusEvent<HTMLSelectElement>) => {
    if (isFocusMovingInsideBlock(event.relatedTarget)) {
      return;
    }
    handleConvert();
  };

  return (
    <div ref={rootRef} className="group relative min-w-[160px] max-w-[280px]">
      <div
        className={cn(
          "flex flex-col bg-card text-card-foreground border rounded-lg overflow-hidden shadow-sm transition-all duration-200",
          selected ? "border-accent ring-1 ring-accent/20 shadow-md" : "border-border hover:border-border-hover/80"
        )}
      >
        <div className="px-3 py-2 bg-transparent">
          <textarea
            ref={inputRef}
            className="w-full bg-transparent border-none outline-none resize-none text-[13px] font-medium text-foreground placeholder:text-muted-foreground/50 leading-snug min-h-[40px]"
            placeholder={t("world.graph.ide.draftPlaceholder", "블록 제목 입력...")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleTextareaBlur}
          />
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-t border-border/50 text-[10px] text-muted-foreground">
          <Sparkles className="w-3 h-3 text-accent" />
          <select
            value={entityType}
            onChange={(event) =>
              setEntityType(event.target.value as WorldEntitySourceType as DraftEntityType)
            }
            onMouseDown={(event) => event.stopPropagation()}
            onBlur={handleTypeBlur}
            className="h-6 min-w-0 flex-1 rounded border border-border/50 bg-background/80 px-2 text-[10px] text-foreground outline-none"
          >
            {WORLD_ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`world.graph.entityTypes.${type}`, { defaultValue: type })}
              </option>
            ))}
          </select>
          <span className="shrink-0">Enter</span>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="opacity-0 pointer-events-none" />
      <Handle type="source" position={Position.Bottom} className="opacity-0 pointer-events-none" />
    </div>
  );
});
DraftBlockNode.displayName = "DraftBlockNode";
