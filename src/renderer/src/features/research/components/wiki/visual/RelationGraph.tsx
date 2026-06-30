/**
 * Relation graph section — read-only reactflow canvas.
 *
 * Builds radial layout of related entities around the current entity.
 * No drag/connect/select; pan + pinch-zoom only.
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import ReactFlow, { Background, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { Network } from "lucide-react";
import { EntityNode, type EntityNodeData } from "./EntityNode";
import { ENTITY_KIND_TINT, RELATION_GRAPH } from "./constants";
import type { EntityKind, RelatedItem } from "./types";

const nodeTypes = { entity: EntityNode };

type RelationGraphProps = {
  centerName: string;
  centerKind: EntityKind;
  related: RelatedItem[];
};

function buildRadialLayout(
  centerName: string,
  centerKind: EntityKind,
  related: RelatedItem[],
): { nodes: Node<EntityNodeData>[]; edges: Edge[] } {
  const { CENTER_X: cx, CENTER_Y: cy, SATELLITE_RADIUS: r } = RELATION_GRAPH;

  const nodes: Node<EntityNodeData>[] = [
    {
      id: "center",
      type: "entity",
      position: { x: cx, y: cy },
      data: { name: centerName, kind: centerKind, isCenter: true },
      draggable: false,
      selectable: false,
    },
    ...related.map((item, i) => {
      const angle = (i / related.length) * Math.PI * 2 - Math.PI / 2;
      return {
        id: `n${i}`,
        type: "entity",
        position: {
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        },
        data: { name: item.name, kind: item.kind, role: item.role },
        draggable: false,
        selectable: false,
      } satisfies Node<EntityNodeData>;
    }),
  ];

  const edges: Edge[] = related.map((item, i) => ({
    id: `e${i}`,
    source: "center",
    target: `n${i}`,
    label: item.role.split(" · ")[0],
    labelStyle: { fontSize: 10, fill: "var(--muted, #888)" },
    labelBgStyle: { fill: "transparent" },
    style: { stroke: `${ENTITY_KIND_TINT[item.kind]}55`, strokeWidth: 1.2 },
  }));

  return { nodes, edges };
}

export function RelationGraph({ centerName, centerKind, related }: RelationGraphProps) {
  const { t } = useTranslation();
  const { nodes, edges } = useMemo(
    () => buildRadialLayout(centerName, centerKind, related),
    [centerName, centerKind, related],
  );

  return (
    <section className="rounded-panel border border-border bg-surface overflow-hidden">
      <header className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2">
        <Network size={12} className="text-muted" />
        <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">
          {t("entityVisual.graph.title")}
        </span>
        <span className="ml-auto text-[10px] text-muted/40">
          {t("entityVisual.graph.ragPending")}
        </span>
      </header>
      <div
        className="w-full bg-panel/40"
        style={{ height: RELATION_GRAPH.CANVAS_HEIGHT }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: RELATION_GRAPH.FIT_PADDING }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll={false}
          zoomOnPinch
          zoomOnDoubleClick={false}
          minZoom={RELATION_GRAPH.MIN_ZOOM}
          maxZoom={RELATION_GRAPH.MAX_ZOOM}
        >
          <Background color="currentColor" gap={20} size={1} className="opacity-[0.06]" />
        </ReactFlow>
      </div>
    </section>
  );
}
