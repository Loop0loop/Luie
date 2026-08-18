import { memo, useCallback } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { useTranslation } from "react-i18next";
import { Trash2, BookOpen } from "lucide-react";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useCanvasViewStore } from "../../../stores";
import "@renderer/styles/components/canvas.css";
import { cn } from "@shared/types/utils";
import type { RFEntityNodeData } from "../../../types/reactFlow.types";
import {
  CANVAS_HANDLE_CLASS,
} from "../../../constants";
import { CANVAS_NODE_KIND_COLOUR } from "../../../types/canvasTokens";

function EntityNodeInner({ id, data, selected, dragging }: NodeProps<RFEntityNodeData>) {
  const { t } = useTranslation();
  const deleteGraphNode = useWorldBuildingStore((s) => s.deleteGraphNode);
  const selectNode = useCanvasViewStore((s) => s.selectNode);
  const kindColor = CANVAS_NODE_KIND_COLOUR[data.kind] ?? CANVAS_NODE_KIND_COLOUR["world-entity"];

  const handleDelete = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const confirmMsg = t("canvas.node.confirmDelete", {
        defaultValue: "이 노드를 프로젝트에서 삭제하시겠습니까?",
      });
      if (window.confirm(confirmMsg)) {
        await deleteGraphNode(id);
      }
    },
    [id, deleteGraphNode, t],
  );

  const handleOpenInspector = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      selectNode(id);
      useUIStore.getState().setRegionOpen("rightPanel", true);
    },
    [id, selectNode],
  );

  return (
    <div className="group relative h-full w-full">
      <Handle type="target" position={Position.Top} className={CANVAS_HANDLE_CLASS} />
      <Handle type="source" position={Position.Bottom} className={CANVAS_HANDLE_CLASS} />
      <Handle type="target" position={Position.Left} className={CANVAS_HANDLE_CLASS} />
      <Handle type="source" position={Position.Right} className={CANVAS_HANDLE_CLASS} />

      {selected && !dragging && (
        <div
          className="pointer-events-auto absolute -top-11 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-full border border-border/40 bg-panel/95 backdrop-blur-md px-1.5 py-1 shadow-panel"
        >
          <button
            type="button"
            onClick={handleOpenInspector}
            className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-surface-hover text-muted hover:text-fg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            title={t("canvas.node.openInspector", "상세 정보")}
            aria-label={t("canvas.node.openInspector", "상세 정보")}
          >
            <BookOpen className="h-3.5 w-3.5" />
          </button>
          <div className="w-[1px] h-3 bg-border/60" />
          <button
            type="button"
            onClick={handleDelete}
            className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-danger-fg/15 text-muted hover:text-danger-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-fg/50 cursor-pointer"
            title={t("canvas.node.delete", "노드 삭제")}
            aria-label={t("canvas.node.delete", "노드 삭제")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div
        className={cn(
          "canvas-glass-node flex h-full w-full flex-col overflow-hidden transition-[border-color,box-shadow,transform,background-color] duration-200 select-none",
          data.isSelected ? "canvas-node-selected" : "canvas-node-normal"
        )}
        style={{
          "--node-color": kindColor,
        } as React.CSSProperties}
      >
        <div className="flex min-w-0 flex-1 flex-col p-4 justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-border/40 bg-element/60 backdrop-blur-sm">
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: kindColor }}
              />
              <span className="text-[10px] font-semibold tracking-wide text-fg/90 uppercase" translate="no">
                {t(`canvas.node.kind.${data.kind}`)}
              </span>
            </div>

            <span className="shrink-0 tabular-nums text-[10px] font-medium text-muted/60">
              {t("canvas.node.connectionCount", { count: data.connectionCount })}
            </span>
          </div>

          <div className="mt-2.5 min-w-0 flex-1">
            <span className="line-clamp-1 text-[13px] font-semibold leading-snug tracking-tight text-fg font-sans">
              {data.label}
            </span>

            {data.description ? (
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted font-sans">
                {data.description}
              </p>
            ) : (
              <p className="mt-1 text-[11px] leading-relaxed text-subtle/70 italic font-sans">
                {t("canvas.node.emptyDescription")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const EntityNode = memo(EntityNodeInner);
