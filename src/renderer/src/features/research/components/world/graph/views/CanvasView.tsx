import { useMemo } from "react";
import type { EntityRelation, WorldGraphNode } from "@shared/types";
import {
  ENTITY_TYPE_COLORS,
  GRAPH_FALLBACK_CANVAS_SIZE,
  GRAPH_NODE_CARD_SIZE,
} from "../constants";

type CanvasViewProps = {
  nodes: WorldGraphNode[];
  edges: EntityRelation[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
};

function readPosition(node: WorldGraphNode, index: number) {
  const fallbackColumn = index % 4;
  const fallbackRow = Math.floor(index / 4);

  return {
    x:
      Number.isFinite(node.positionX) && node.positionX !== 0
        ? node.positionX
        : 120 + fallbackColumn * 280,
    y:
      Number.isFinite(node.positionY) && node.positionY !== 0
        ? node.positionY
        : 120 + fallbackRow * 220,
  };
}

export function CanvasView({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
}: CanvasViewProps) {
  const nodesWithPosition = useMemo(
    () => nodes.map((node, index) => ({ node, position: readPosition(node, index) })),
    [nodes],
  );

  const nodeById = useMemo(
    () =>
      new Map(
        nodesWithPosition.map(({ node, position }) => [node.id, { node, position }] as const),
      ),
    [nodesWithPosition],
  );

  const canvasSize = useMemo(() => {
    const maxX = Math.max(
      GRAPH_FALLBACK_CANVAS_SIZE.width,
      ...nodesWithPosition.map(({ position }) => position.x + GRAPH_NODE_CARD_SIZE.width + 200),
    );
    const maxY = Math.max(
      GRAPH_FALLBACK_CANVAS_SIZE.height,
      ...nodesWithPosition.map(({ position }) => position.y + GRAPH_NODE_CARD_SIZE.height + 240),
    );

    return { width: maxX, height: maxY };
  }, [nodesWithPosition]);

  return (
    <div className="h-full overflow-auto bg-[#0f1319]">
      <div
        className="relative"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {edges.map((edge) => {
            const source = nodeById.get(edge.sourceId);
            const target = nodeById.get(edge.targetId);
            if (!source || !target) {
              return null;
            }

            const x1 = source.position.x + GRAPH_NODE_CARD_SIZE.width / 2;
            const y1 = source.position.y + GRAPH_NODE_CARD_SIZE.height / 2;
            const x2 = target.position.x + GRAPH_NODE_CARD_SIZE.width / 2;
            const y2 = target.position.y + GRAPH_NODE_CARD_SIZE.height / 2;
            const delta = Math.abs(x2 - x1) / 2;
            const path = `M ${x1} ${y1} C ${x1 + delta} ${y1}, ${x2 - delta} ${y2}, ${x2} ${y2}`;

            return (
              <g key={edge.id}>
                <path
                  d={path}
                  fill="none"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="2"
                />
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 8}
                  fill="rgba(255,255,255,0.48)"
                  fontSize="11"
                  textAnchor="middle"
                >
                  {edge.relation}
                </text>
              </g>
            );
          })}
        </svg>

        {nodesWithPosition.map(({ node, position }) => {
          const tone = ENTITY_TYPE_COLORS[node.entityType];
          const active = selectedNodeId === node.id;

          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelectNode(node.id)}
              className={[
                "absolute rounded-[22px] border p-4 text-left shadow-[0_18px_60px_rgba(0,0,0,0.25)] transition",
                tone.card,
                active
                  ? "ring-2 ring-white/40"
                  : "hover:-translate-y-0.5 hover:border-white/30",
              ].join(" ")}
              style={{
                left: position.x,
                top: position.y,
                width: GRAPH_NODE_CARD_SIZE.width,
                minHeight: GRAPH_NODE_CARD_SIZE.height,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={[
                    "rounded-full border px-2 py-1 text-[11px]",
                    tone.chip,
                  ].join(" ")}
                >
                  {node.entityType}
                </span>
                <span className="text-[11px] text-fg/45">
                  {Math.round(position.x)}, {Math.round(position.y)}
                </span>
              </div>
              <p className="mt-4 line-clamp-2 text-base font-semibold text-fg">
                {node.name}
              </p>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-fg/60">
                {node.description?.trim() || "설명이 아직 없습니다."}
              </p>
            </button>
          );
        })}

        {nodes.length === 0 ? (
          <div className="absolute left-8 top-8 max-w-md rounded-[24px] border border-dashed border-border/60 bg-white/5 px-6 py-5 text-sm text-fg/65">
            엔티티를 추가하면 Obsidian 스타일 카드 보드가 여기서 시작됩니다.
          </div>
        ) : null}
      </div>
    </div>
  );
}
