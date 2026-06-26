import type { TFunction } from "i18next";
import type { Node } from "reactflow";
import { cn } from "@shared/types/utils";

import type { GraphNodeData } from "../../../types/graph";

interface GraphHoverCardProps {
  hoverNode: Node<GraphNodeData> | null;
  isRightPanelOpen: boolean;
  t: TFunction;
}

export function GraphHoverCard({
  hoverNode,
  isRightPanelOpen,
  t,
}: GraphHoverCardProps) {
  if (!hoverNode) return null;

  return (
    <div
      className={cn(
        "absolute top-16 z-30 w-[300px] rounded-panel border border-border/30 bg-panel p-4 shadow-panel animate-in fade-in duration-300 text-fg flex flex-col gap-3.5 select-none overflow-hidden transition-all duration-300",
        isRightPanelOpen ? "right-[340px]" : "right-6",
      )}
    >
      <div className="flex items-center justify-between border-b border-border/20 pb-2.5 relative z-10">
        <h4 className="text-[13px] font-black tracking-tight text-fg">{hoverNode.data.label}</h4>
        {hoverNode.data.type && (
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded">
            {t(`canvas.node.kind.${hoverNode.data.type}` as never, hoverNode.data.type)}
          </span>
        )}
      </div>

      {hoverNode.data.description && (
        <p className="text-[11px] leading-relaxed text-muted break-keep bg-element/40 p-3 rounded-panel border border-border/15 select-text relative z-10 font-normal">
          {hoverNode.data.description}
        </p>
      )}

      {hoverNode.data.relationships && hoverNode.data.relationships.length > 0 && (
        <div className="flex flex-col gap-2 pt-0.5 relative z-10">
          <div className="flex items-center gap-1 border-b border-border/15 pb-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted">
              {t("canvas.graph.details.relationships", "얽힌 인물 관계")}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {hoverNode.data.relationships.slice(0, 3).map((rel, index) => (
              <div
                key={index}
                className="flex flex-col gap-1.5 p-2.5 rounded-panel bg-element/20 border border-border/15 hover:border-border/30 hover:bg-element/30 transition-all duration-200 text-[10px]"
              >
                <div className="flex items-center justify-between font-extrabold">
                  <span className="text-fg">{hoverNode.data.label}</span>
                  <span className="text-[8.5px] bg-panel px-1.5 py-0.5 rounded text-muted border border-border/20 shrink-0 font-bold">
                    {rel.type}
                  </span>
                  <span className="text-fg">{rel.targetName}</span>
                </div>
                {rel.details && (
                  <span className="text-[9px] text-muted pl-1.5 border-l border-border/30 leading-normal break-keep font-medium">
                    {rel.details}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {hoverNode.data.relatedChapters && hoverNode.data.relatedChapters.length > 0 && (
        <div className="flex flex-col gap-2 pt-0.5 relative z-10">
          <div className="flex items-center gap-1 border-b border-border/15 pb-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted">
              {t("canvas.graph.details.chapters", "연관 등장 챕터")}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {hoverNode.data.relatedChapters.map((chapter, index) => (
              <span
                key={index}
                className="text-[9px] font-bold text-fg bg-element/60 border border-border/15 px-2.5 py-1 rounded-full hover:bg-element transition-all cursor-default"
              >
                {chapter}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
