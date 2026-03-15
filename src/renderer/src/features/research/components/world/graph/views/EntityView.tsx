import type { WorldGraphNode } from "@shared/types";
import { ENTITY_TYPE_COLORS } from "../constants";

type EntityViewProps = {
  nodes: WorldGraphNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
};

export function EntityView({
  nodes,
  selectedNodeId,
  onSelectNode,
}: EntityViewProps) {
  return (
    <div className="h-full overflow-y-auto bg-[#0f1319] px-8 py-8">
      {nodes.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <div className="rounded-[24px] border border-dashed border-border/60 bg-white/5 px-6 py-8 text-sm text-fg/65">
            아직 엔티티가 없습니다.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {nodes.map((node) => {
            const tone = ENTITY_TYPE_COLORS[node.entityType];
            const active = node.id === selectedNodeId;

            return (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelectNode(node.id)}
                className={[
                  "rounded-[24px] border p-5 text-left transition",
                  tone.card,
                  active ? "ring-2 ring-white/35" : "hover:-translate-y-0.5",
                ].join(" ")}
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
                    {node.subType ?? "기본"}
                  </span>
                </div>
                <p className="mt-4 text-lg font-semibold text-fg">{node.name}</p>
                <p className="mt-2 line-clamp-4 text-sm leading-7 text-fg/62">
                  {node.description?.trim() || "설명이 아직 없습니다."}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
