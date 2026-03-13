import { memo, useEffect, useRef, useState } from "react";
import { Handle, Position } from "reactflow";
import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import { Sparkles } from "lucide-react";

export type DraftBlockNodeProps = {
  data: {
    onConvert: (id: string, text: string) => void;
    id: string;
    initialValue?: string;
  };
  selected?: boolean;
};

export const DraftBlockNode = memo(({ data, selected }: DraftBlockNodeProps) => {
  const { onConvert, id, initialValue = "" } = data;
  const [text, setText] = useState(initialValue);
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
    if (trimmed) {
      isConverting.current = true;
      onConvert(id, trimmed);
    } else {
      // If empty and blurred, maybe we just want to remove it?
      // but without text, onConvert handles empty text by removing node if we pass it, 
      // but let's pass it empty anyway to let canvas remove it.
      isConverting.current = true;
      onConvert(id, "");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Shift+Enter to newline, Enter to submit
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleConvert();
    }
  };

  const handleBlur = () => {
    handleConvert();
  };

  return (
    <div className="group relative min-w-[240px]">
      <div
        className={cn(
          "flex flex-col bg-surface border rounded-[10px] overflow-hidden shadow-sm transition-all duration-200",
          selected ? "border-accent ring-1 ring-accent/20" : "border-border hover:border-border-hover/80"
        )}
      >
        <div className="px-3 py-2 bg-surface">
          <textarea
            ref={inputRef}
            className="w-full bg-transparent border-none outline-none resize-none text-[13px] text-foreground placeholder:text-muted-foreground/50 leading-relaxed min-h-[40px]"
            placeholder={t("world.graph.ide.draftPlaceholder", "캐릭터, 장소 등을 입력하세요...")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
          />
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/20 border-t border-border/50 text-[10px] text-muted-foreground">
          <Sparkles className="w-3 h-3 text-accent" />
          <span>Enter를 누르면 자동으로 엔티티가 파악되어 생성됩니다.</span>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="opacity-0 pointer-events-none" />
      <Handle type="source" position={Position.Bottom} className="opacity-0 pointer-events-none" />
    </div>
  );
});
DraftBlockNode.displayName = "DraftBlockNode";