/**
 * EntityNode — modern, neutral Obsidian Canvas-style entity card.
 *
 * No kind colours inside the canvas block; all distinction comes from
 * typography and spacing. The inspector panel keeps colour coding.
 *
 * Design:
 *   - Top color strip per kind (from CANVAS_NODE_KIND_COLOUR tokens)
 *   - Header row: kind label (left) + connection count (right)
 *   - Body: label (bold) + description (muted, line-clamp-2)
 */

import { memo, useCallback } from "react";
import { Handle, Position, NodeToolbar, type NodeProps } from "reactflow";
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

function EntityNodeInner({ id, data, selected }: NodeProps<RFEntityNodeData>) {
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

      {/* Push pin indicating node kind color */}
      <div className="node-push-pin" />

      {/* Node context toolbar on selection - Obsidian style */}
      <NodeToolbar
        isVisible={selected}
        position={Position.Top}
        className="flex items-center gap-0.5 rounded-control border border-border bg-panel p-0.5 shadow-md z-dropdown animate-in fade-in slide-in-from-bottom-1 duration-150"
      >
        <button
          type="button"
          onClick={handleOpenInspector}
          className="flex h-7 w-7 items-center justify-center rounded-control hover:bg-surface-hover text-muted hover:text-fg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          title={t("canvas.node.openInspector", "상세 정보")}
          aria-label={t("canvas.node.openInspector", "상세 정보")}
        >
          <BookOpen className="h-4 w-4" />
        </button>
        <div className="w-[1px] h-3.5 bg-border/80 mx-0.5" />
        <button
          type="button"
          onClick={handleDelete}
          className="flex h-7 w-7 items-center justify-center rounded-control hover:bg-danger-fg/10 text-muted hover:text-danger-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-fg/50 cursor-pointer"
          title={t("canvas.node.delete", "노드 삭제")}
          aria-label={t("canvas.node.delete", "노드 삭제")}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </NodeToolbar>

      <div
        className={cn(
          "canvas-entity-node-obsidian flex h-full w-full flex-col overflow-hidden bg-panel transition-[border-color,box-shadow,transform] duration-150",
          data.isSelected ? "canvas-node-selected" : "canvas-node-normal"
        )}
        style={{
          "--node-color": kindColor,
        } as React.CSSProperties}
      >
        <div className="flex min-w-0 flex-1 flex-col px-4.5 py-4">
          {/* Header: kind label + connection count */}
          <div className="flex items-center justify-between gap-2 text-canvas-node-meta text-muted font-sans">
            <span className="font-semibold uppercase tracking-wider opacity-70" translate="no">
              {t(`canvas.node.kind.${data.kind}`)}
            </span>
            <span className="shrink-0 tabular-nums text-[10px] opacity-50">
              {t("canvas.node.connectionCount", { count: data.connectionCount })}
            </span>
          </div>

          {/* Label */}
          <span className="mt-2 line-clamp-1 text-canvas-node-label font-bold leading-tight text-fg font-serif">
            {data.label}
          </span>

          {/* Description */}
          {data.description ? (
            <p className="mt-2 line-clamp-2 text-canvas-node-desc leading-5 text-muted font-serif">
              {data.description}
            </p>
          ) : (
            <p className="mt-2 text-canvas-node-desc leading-5 text-subtle italic font-serif">
              {t("canvas.node.emptyDescription")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export const EntityNode = memo(EntityNodeInner);
