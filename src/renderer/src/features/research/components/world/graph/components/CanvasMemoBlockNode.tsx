import { memo, useState, useCallback, useRef } from "react";
import { Edit2, Maximize2, Palette, Tag, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { NodeProps } from "reactflow";
import { Handle, Position, NodeToolbar, useReactFlow } from "reactflow";
import { Button } from "@renderer/components/ui/button";

export type CanvasMemoBlockData = {
  title: string;
  tags: string[];
  body: string;
  color?: string;
  onDelete?: (id: string) => void;
  onChangeColor?: (id: string) => void;
  onDataChange?: (
    id: string,
    patch: Partial<Omit<CanvasMemoBlockData, "onDelete" | "onDataChange">>,
  ) => void;
};

function CanvasMemoBlockNodeInner({
  id,
  data,
  selected,
}: NodeProps<CanvasMemoBlockData>) {
  const { t } = useTranslation();
  const [tagInput, setTagInput] = useState("");
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const reactFlow = useReactFlow();

  const commitTagInput = useCallback(() => {
    const value = tagInput.trim();
    if (!value) return;
    const next = [...(data.tags ?? []), value];
    data.onDataChange?.(id, { tags: next });
    setTagInput("");
  }, [id, tagInput, data]);

  const removeTag = useCallback(
    (index: number) => {
      const next = (data.tags ?? []).filter((_, i) => i !== index);
      data.onDataChange?.(id, { tags: next });
    },
    [id, data],
  );

  return (
    <div className="group relative cursor-default">
      <NodeToolbar isVisible={selected} position={Position.Top} offset={8}>
        <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#11151c]/95 p-1 shadow-xl backdrop-blur-md">
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="h-7 w-7 rounded-md text-fg/60 hover:bg-white/8 hover:text-fg"
            onClick={(e) => {
              e.stopPropagation();
              data.onChangeColor?.(id);
            }}
            title={t("research.graph.canvas.memo.changeColor")}
          >
            <Palette className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="h-7 w-7 rounded-md text-fg/60 hover:bg-white/8 hover:text-fg"
            onClick={(e) => {
              e.stopPropagation();
              titleInputRef.current?.focus();
              titleInputRef.current?.select();
            }}
            title={t("research.graph.canvas.memo.edit")}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="h-7 w-7 rounded-md text-fg/60 hover:bg-white/8 hover:text-fg"
            onClick={(e) => {
              e.stopPropagation();
              const node = reactFlow.getNode(id);
              if (!node) return;
              void reactFlow.fitBounds(
                {
                  x: node.position.x,
                  y: node.position.y,
                  width: node.width ?? 280,
                  height: node.height ?? 190,
                },
                { padding: 0.5, duration: 220 },
              );
            }}
            title={t("research.graph.canvas.memo.zoom")}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="h-7 w-7 rounded-md text-fg/60 hover:bg-white/8 hover:text-red-400"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete?.(id);
            }}
            title={t("research.graph.canvas.memo.delete")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </NodeToolbar>

      {(
        [Position.Top, Position.Bottom, Position.Left, Position.Right] as const
      ).map((position) => (
        <span key={`${id}-${position}-handles`}>
          <Handle
            type="source"
            position={position}
            id={`${position}-out`}
            className={
              selected
                ? "!h-2 !w-2 !border-0 opacity-100 pointer-events-auto"
                : "!h-2 !w-2 !border-0 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
            }
            style={{ background: "rgba(255,255,255,0.5)" }}
          />
          <Handle
            type="target"
            position={position}
            id={`${position}-in`}
            className={
              selected
                ? "!h-2 !w-2 !border-0 opacity-100 pointer-events-auto"
                : "!h-2 !w-2 !border-0 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
            }
            style={{ background: "rgba(255,255,255,0.5)" }}
          />
        </span>
      ))}

      <div
        className="flex w-[280px] flex-col overflow-hidden rounded-xl border transition-all"
        style={{
          background: data.color ?? (selected ? "#1a1f28" : "#171c24"),
          borderColor: selected
            ? "rgba(255,255,255,0.28)"
            : "rgba(255,255,255,0.10)",
          boxShadow: selected
            ? "0 0 0 1px rgba(255,255,255,0.1), 0 8px 24px rgba(0,0,0,0.28)"
            : "0 2px 8px rgba(0,0,0,0.18)",
        }}
      >
        <div
          className="border-b px-4 py-2.5"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          <input
            ref={titleInputRef}
            type="text"
            value={data.title}
            onChange={(e) => data.onDataChange?.(id, { title: e.target.value })}
            placeholder={t("research.graph.canvas.memo.titlePlaceholder")}
            className="w-full bg-transparent text-[14px] font-semibold text-fg/90 placeholder:text-fg/28 focus:outline-none"
          />
        </div>

        <div
          className="border-b px-4 py-2"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag className="h-3 w-3 shrink-0 text-fg/30" />
            {(data.tags ?? []).map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-fg/65"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="text-fg/30 hover:text-fg/70"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  commitTagInput();
                }
              }}
              onBlur={commitTagInput}
              placeholder={t("research.graph.canvas.memo.tagPlaceholder")}
              className="min-w-[64px] flex-1 bg-transparent text-[11px] text-fg/65 placeholder:text-fg/25 focus:outline-none"
            />
          </div>
        </div>

        <div className="px-4 py-3">
          <textarea
            value={data.body}
            onChange={(e) => data.onDataChange?.(id, { body: e.target.value })}
            placeholder={t("research.graph.canvas.memo.bodyPlaceholder")}
            rows={4}
            className="w-full resize-none bg-transparent text-[12px] leading-relaxed text-fg/65 placeholder:text-fg/25 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

export const CanvasMemoBlockNode = memo(CanvasMemoBlockNodeInner);
