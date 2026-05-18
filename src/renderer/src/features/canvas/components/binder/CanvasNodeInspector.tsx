/**
 * CanvasNodeInspector — BinderBar panel for the selected canvas node.
 *
 * Shows: kind badge, name, description, connected relations list.
 * P7 will add chapter-level metadata (wordCount, scenes, etc.).
 */

import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { X } from "lucide-react";
import { useCanvasViewStore } from "@renderer/features/canvas/stores";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import {
  CANVAS_NODE_KIND_COLOUR,
  ENTITY_TYPE_TO_NODE_KIND,
} from "@renderer/features/canvas/types";
import type { CanvasNodeKind } from "@renderer/features/canvas/types";

interface CanvasNodeInspectorProps {
  nodeId: string;
}

export default function CanvasNodeInspector({ nodeId }: CanvasNodeInspectorProps) {
  const { t } = useTranslation();

  const graphData = useWorldBuildingStore((state) => state.graphData);
  const clearSelection = useCanvasViewStore(
    useShallow((state) => state.clearSelection),
  );

  const node = graphData?.nodes.find((n) => n.id === nodeId) ?? null;

  if (!node) {
    return (
      <div className="p-4 text-xs italic text-muted">
        {t("canvas.status.empty")}
      </div>
    );
  }

  const kind: CanvasNodeKind =
    ENTITY_TYPE_TO_NODE_KIND[node.entityType] ?? "world-entity";
  const colour = CANVAS_NODE_KIND_COLOUR[kind];

  const relations =
    graphData?.edges.filter(
      (e) => e.sourceId === nodeId || e.targetId === nodeId,
    ) ?? [];

  const connectedNodeIds = new Set(
    relations
      .flatMap((e) => [e.sourceId, e.targetId])
      .filter((id) => id !== nodeId),
  );
  const connectedNodes =
    graphData?.nodes.filter((n) => connectedNodeIds.has(n.id)) ?? [];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: colour }}
            aria-hidden
          />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">
            {t(`canvas.node.kind.${kind}`)}
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className="ml-auto rounded p-0.5 text-muted transition-colors hover:bg-surface-hover hover:text-fg"
            title={t("canvas.node.deselect")}
            aria-label={t("canvas.node.deselect")}
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </div>
        <h3 className="mt-1 text-sm font-bold leading-snug text-fg">
          {node.name}
        </h3>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {/* Description */}
        {node.description && (
          <section>
            <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
              {t("canvas.node.description")}
            </h4>
            <p className="text-xs leading-relaxed text-fg/80">
              {node.description}
            </p>
          </section>
        )}

        {/* Connections */}
        <section>
          <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted">
            {t("canvas.node.connections")} ({connectedNodes.length})
          </h4>
          {connectedNodes.length === 0 ? (
            <p className="text-xs italic text-muted">
              {t("canvas.status.empty")}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {connectedNodes.map((cn) => {
                const cnKind =
                  ENTITY_TYPE_TO_NODE_KIND[cn.entityType] ?? "world-entity";
                const cnColour = CANVAS_NODE_KIND_COLOUR[cnKind];
                const rel = relations.find(
                  (e) =>
                    (e.sourceId === nodeId && e.targetId === cn.id) ||
                    (e.targetId === nodeId && e.sourceId === cn.id),
                );
                return (
                  <li
                    key={cn.id}
                    className="flex items-center gap-2 text-xs text-fg/80"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: cnColour }}
                      aria-hidden
                    />
                    <span className="truncate">{cn.name}</span>
                    {rel?.relation && (
                      <span className="ml-auto shrink-0 text-[10px] text-muted">
                        {rel.relation}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
