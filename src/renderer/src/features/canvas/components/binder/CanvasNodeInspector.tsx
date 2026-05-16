/**
 * CanvasNodeInspector — shows details for the selected canvas node.
 *
 * P6: reads from canvasViewStore.selection + worldBuildingStore.graphData.
 * Displays: name, kind, description, connected relations.
 * P7 will add chapter-level metadata (wordCount, scenes, etc.).
 */
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { useCanvasViewStore } from "@renderer/features/canvas/stores";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { ENTITY_TYPE_TO_NODE_KIND } from "@renderer/features/canvas/types";
import type { CanvasNodeKind } from "@renderer/features/canvas/types";

const KIND_LABEL: Record<CanvasNodeKind, string> = {
  chapter: "Chapter",
  character: "Character",
  event: "Event",
  faction: "Faction",
  term: "Term",
  "world-entity": "World Entity",
};

const KIND_COLOUR: Record<CanvasNodeKind, string> = {
  chapter: "var(--color-accent, #3b82f6)",
  character: "#f97316",
  event: "#a855f7",
  faction: "#ef4444",
  term: "#22c55e",
  "world-entity": "#64748b",
};

interface CanvasNodeInspectorProps {
  nodeId: string;
}

export default function CanvasNodeInspector({ nodeId }: CanvasNodeInspectorProps) {
  const { t } = useTranslation();

  const graphData = useWorldBuildingStore((state) => state.graphData);

  const selection = useCanvasViewStore(
    useShallow((state) => state.selection),
  );

  const node = graphData?.nodes.find((n) => n.id === nodeId) ?? null;

  if (!node) {
    return (
      <div className="p-4 text-xs text-muted italic">
        {t("canvas.status.empty")}
      </div>
    );
  }

  const kind: CanvasNodeKind =
    ENTITY_TYPE_TO_NODE_KIND[node.entityType] ?? "world-entity";
  const colour = KIND_COLOUR[kind];

  // Connected relations
  const relations = graphData?.edges.filter(
    (e) => e.sourceId === nodeId || e.targetId === nodeId,
  ) ?? [];

  const connectedNodeIds = new Set(
    relations.flatMap((e) => [e.sourceId, e.targetId]).filter((id) => id !== nodeId),
  );
  const connectedNodes = graphData?.nodes.filter((n) =>
    connectedNodeIds.has(n.id),
  ) ?? [];

  void selection; // used by parent to decide which component to render

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ background: colour }}
            aria-hidden
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {KIND_LABEL[kind]}
          </span>
        </div>
        <h3 className="mt-1 text-sm font-bold text-fg leading-snug">
          {node.name}
        </h3>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Description */}
        {node.description && (
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
              {t("common.description") || "Description"}
            </div>
            <p className="text-xs text-fg/80 leading-relaxed">
              {node.description}
            </p>
          </div>
        )}

        {/* Connections */}
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
            {t("canvas.activity.entities")} ({connectedNodes.length})
          </div>
          {connectedNodes.length === 0 ? (
            <p className="text-xs text-muted italic">{t("canvas.status.empty")}</p>
          ) : (
            <ul className="space-y-1">
              {connectedNodes.map((cn) => {
                const cnKind = ENTITY_TYPE_TO_NODE_KIND[cn.entityType] ?? "world-entity";
                return (
                  <li
                    key={cn.id}
                    className="flex items-center gap-2 text-xs text-fg/80"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ background: KIND_COLOUR[cnKind] }}
                      aria-hidden
                    />
                    {cn.name}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
