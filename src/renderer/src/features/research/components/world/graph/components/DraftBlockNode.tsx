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

  const stopCanvasInteraction = (
    event:
      | React.MouseEvent<HTMLElement>
      | React.PointerEvent<HTMLElement>
      | React.KeyboardEvent<HTMLElement>,
  ) => {
    event.stopPropagation();
  };

  return (
    <div ref={rootRef} className="group nodrag nopan nowheel relative">
      {entityType === "Event" ? (
        // Timeline Draft UI
        <div className="relative flex flex-col items-center justify-center group w-14 h-14">
          <div className="relative z-10 w-6 h-6 rounded-full border-4 border-primary bg-background shadow-[0_0_20px_hsl(var(--primary))] flex items-center justify-center scale-125">
            <div className="w-2 h-2 rounded-full bg-primary" />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary/20 blur-xl pointer-events-none -z-10" />
          
          {/* 입력 폼 (Timeline 스타일) */}
          <div className="absolute top-[calc(100%+12px)] flex flex-col rounded-lg border border-primary bg-background/90 p-2.5 shadow-[0_4px_25px_hsl(var(--primary)/0.2)] backdrop-blur-md min-w-[200px]">
            <textarea
              ref={inputRef}
              className="nodrag nopan nowheel min-h-[24px] w-full resize-none overflow-hidden border-b border-primary bg-transparent text-[13px] font-bold text-foreground outline-none placeholder:text-muted-foreground/40"
              placeholder="타임라인 사건 입력..."
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (e.target) {
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }
              }}
              onKeyDown={handleKeyDown}
              onBlur={handleTextareaBlur}
              onMouseDown={stopCanvasInteraction}
              onPointerDown={stopCanvasInteraction}
              autoFocus
            />
          </div>
          <Handle type="target" position={Position.Left} className="opacity-0 pointer-events-none" />
          <Handle type="source" position={Position.Right} className="opacity-0 pointer-events-none" />
        </div>
      ) : (
        // Block Draft UI
        <div className="min-w-[200px] max-w-[320px]">
          <div
            className={cn(
              "flex flex-col bg-background/95 backdrop-blur-xl text-foreground border border-border/80 rounded-2xl shadow-lg ring-1 ring-black/5 transition-all duration-300",
              selected ? "border-accent/80 ring-2 ring-accent/30 shadow-xl" : "hover:border-border-hover"
            )}
          >
            <div className="px-5 py-4 bg-transparent">
              <textarea
                ref={inputRef}
                className="nodrag nopan nowheel min-h-[48px] w-full resize-none overflow-hidden border-none bg-transparent text-[15px] font-semibold leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/40"
                placeholder={t("world.graph.ide.draftPlaceholder", "블록 내용 입력...")}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (e.target) {
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }
                }}
                onKeyDown={handleKeyDown}
                onBlur={handleTextareaBlur}
                onMouseDown={stopCanvasInteraction}
                onPointerDown={stopCanvasInteraction}
              />
            </div>
          </div>
          <Handle type="target" position={Position.Top} className="opacity-0 pointer-events-none" />
          <Handle type="source" position={Position.Bottom} className="opacity-0 pointer-events-none" />
        </div>
      )}
    </div>
  );
});
DraftBlockNode.displayName = "DraftBlockNode";
