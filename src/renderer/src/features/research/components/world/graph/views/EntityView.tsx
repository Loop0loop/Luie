import type { WorldGraphNode } from "@shared/types";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";

type EntityViewProps = {
  nodes: WorldGraphNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
};

export function EntityView({
  nodes,
  selectedNodeId,
  onSelectNode,
}: EntityViewProps) {
  return (
    <div className="h-full overflow-y-auto bg-canvas px-8 py-8">
      {nodes.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <div className="rounded-[24px] border border-dashed border-border/60 bg-white/5 px-6 py-8 text-sm text-fg/65">
            아직 엔티티가 없습니다.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {nodes.map((node) => {
            const active = node.id === selectedNodeId;

            return (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelectNode(node.id)}
                className="text-left"
              >
                <Card
                  className={[
                    "rounded-[24px] border bg-[linear-gradient(180deg,rgba(20,24,31,0.94)_0%,rgba(13,17,22,0.98)_100%)] text-left transition",
                    active
                      ? "border-cyan-300/40 shadow-[0_18px_38px_rgba(0,0,0,0.3)] ring-1 ring-cyan-200/30"
                      : "border-white/8 hover:-translate-y-0.5 hover:border-white/14",
                  ].join(" ")}
                >
                  <CardHeader className="pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-fg/38">
                        linked
                      </span>
                      <span className="text-[11px] text-fg/45">
                        {node.subType ?? "Canvas"}
                      </span>
                    </div>
                    <CardTitle className="text-lg text-fg">{node.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-4 text-sm leading-7 text-fg/62">
                      {node.description?.trim() || "설명이 아직 없습니다."}
                    </p>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
