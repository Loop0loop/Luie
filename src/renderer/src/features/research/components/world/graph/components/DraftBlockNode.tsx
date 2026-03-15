import { memo, useEffect, useRef, useState } from "react";
import { Handle, Position } from "reactflow";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import type { WORLD_ENTITY_TYPES } from "@shared/constants/world";

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
    initialEntityType = "Character",
  } = data;
  const [text, setText] = useState(initialValue);
  const [entityType] = useState<DraftEntityType>(initialEntityType);
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

  return (
    <div ref={rootRef} className="group relative min-w-[200px] max-w-[320px]">
      <div
        className={cn(
          "flex flex-col bg-card/95 backdrop-blur-sm text-card-foreground border border-border/60 rounded-md shadow-sm transition-all duration-200",
          selected ? "border-accent/80 ring-1 ring-accent/30 shadow-md" : "hover:border-border-hover"
        )}
      >
        <div className="px-4 py-3 bg-transparent">
          <textarea
            ref={inputRef}
            className="w-full bg-transparent border-none outline-none resize-none text-[14px] font-medium text-foreground placeholder:text-muted-foreground/40 leading-relaxed min-h-[48px] overflow-hidden"
            placeholder={t("world.graph.ide.draftPlaceholder", "블록 내용 입력...")}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              // auto resize logic
              if (e.target) {
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleTextareaBlur}
          />
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="opacity-0 pointer-events-none" />
      <Handle type="source" position={Position.Bottom} className="opacity-0 pointer-events-none" />
    </div>
  );
});
DraftBlockNode.displayName = "DraftBlockNode";
