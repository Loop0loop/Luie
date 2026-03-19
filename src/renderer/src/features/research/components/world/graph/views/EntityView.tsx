import type { WorldGraphNode } from "@shared/types";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@renderer/components/ui/card";
import { ENTITY_TYPE_CANVAS_THEME } from "../constants";

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
  const { t } = useTranslation();

  return (
    <div className="h-full overflow-y-auto bg-canvas px-8 py-8">
      {nodes.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <div className="rounded-[24px] border border-dashed border-border/60 bg-white/5 px-6 py-8 text-sm text-fg/65">
            {t("research.graph.entity.empty")}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {nodes.map((node) => {
            const active = node.id === selectedNodeId;
            const entityTheme =
              ENTITY_TYPE_CANVAS_THEME[
                node.entityType as keyof typeof ENTITY_TYPE_CANVAS_THEME
              ] ?? ENTITY_TYPE_CANVAS_THEME.WorldEntity;

            return (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelectNode(node.id)}
                className="text-left"
              >
                <Card
                  className={[
                    "rounded-[24px] border text-left transition",
                    active
                      ? "ring-1"
                      : "border-white/8 hover:-translate-y-0.5 hover:border-white/14",
                  ].join(" ")}
                  style={
                    active
                      ? {
                          background: entityTheme.surface,
                          borderColor: `${entityTheme.accent}66`,
                          boxShadow: `0 18px 38px rgba(0,0,0,0.3), 0 0 0 1px ${entityTheme.glow}`,
                        }
                      : {
                          background: "hsl(var(--secondary) / 0.72)",
                        }
                  }
                >
                  <CardHeader className="pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-fg/38">
                        {t("research.graph.entity.linked")}
                      </span>
                      <span className="text-[11px] text-fg/45">
                        {node.subType ?? t("research.graph.entity.canvas")}
                      </span>
                    </div>
                    <CardTitle className="text-lg text-fg">
                      {node.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-4 text-sm leading-7 text-fg/62">
                      {node.description?.trim() ||
                        t("research.graph.entity.noDescription")}
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
