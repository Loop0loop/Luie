import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { CanvasNodeKind } from "@renderer/features/canvas/types";
import {
  CANVAS_NODE_KIND_COLOUR,
  ENTITY_TYPE_TO_NODE_KIND,
} from "@renderer/features/canvas/types";
import type { WorldGraphNode, EntityRelation } from "@shared/types";

interface GenericEntityViewProps {
  node: WorldGraphNode;
  kind: CanvasNodeKind;
  kindColor: string;
  connectedNodes: WorldGraphNode[];
  connectedEdges: EntityRelation[];
  onSelectNode: (nodeId: string) => void;
  onClearSelection: () => void;
}

export default function GenericEntityView({
  node,
  kind,
  kindColor,
  connectedNodes,
  connectedEdges,
  onSelectNode,
  onClearSelection,
}: GenericEntityViewProps) {
  const { t } = useTranslation();

  return (
    <div className="h-full bg-panel overflow-y-auto">
      <div className="sticky top-0 z-10 bg-panel border-b border-border/40 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: kindColor }}
            >
              <span className="text-xs font-bold text-white">
                {kind.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="text-sm font-bold text-fg truncate">{node.name}</h3>
              <span className="text-xs text-muted">
                {t(`canvas.node.kind.${kind}`)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearSelection}
            className="rounded-control p-1 text-muted transition-colors hover:bg-surface-hover hover:text-fg"
            title={t("canvas.node.deselect")}
            aria-label={t("canvas.node.deselect")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {node.description && (
          <section>
            <h4 className="text-xs font-semibold text-fg/80 mb-2">
              {t("canvas.node.description")}
            </h4>
            <p className="text-xs text-muted leading-relaxed">
              {node.description}
            </p>
          </section>
        )}

        <section>
          <h4 className="text-xs font-semibold text-fg/80 mb-2">
            {t("canvas.node.connections")}
          </h4>
          <div className="flex gap-2">
            <div className="flex-1 rounded border border-border/40 bg-surface px-3 py-2 text-center">
              <div className="text-lg font-bold text-fg">{connectedNodes.length}</div>
              <div className="text-[10px] text-muted">{t("canvas.node.nodes")}</div>
            </div>
            <div className="flex-1 rounded border border-border/40 bg-surface px-3 py-2 text-center">
              <div className="text-lg font-bold text-fg">{connectedEdges.length}</div>
              <div className="text-[10px] text-muted">{t("canvas.node.edges")}</div>
            </div>
          </div>
        </section>

        {connectedNodes.length > 0 && (
          <section>
            <h4 className="text-xs font-semibold text-fg/80 mb-2">
              {t("canvas.node.connectedNodes")}
            </h4>
            <div className="flex flex-col gap-1.5">
              {connectedNodes.map((connectedNode) => {
                const connectedKind: CanvasNodeKind =
                  ENTITY_TYPE_TO_NODE_KIND[connectedNode.entityType as keyof typeof ENTITY_TYPE_TO_NODE_KIND] ?? "world-entity";
                const connectedColor =
                  CANVAS_NODE_KIND_COLOUR[connectedKind] ?? CANVAS_NODE_KIND_COLOUR["world-entity"];

                return (
                  <button
                    key={connectedNode.id}
                    type="button"
                    onClick={() => onSelectNode(connectedNode.id)}
                    className="flex items-center gap-2 rounded border border-border/40 bg-surface px-3 py-2 text-left transition-colors hover:bg-surface-hover"
                  >
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: connectedColor }}
                    >
                      <span className="text-[10px] font-bold text-white">
                        {connectedKind.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-medium text-fg truncate">
                        {connectedNode.name}
                      </span>
                      <span className="text-[10px] text-muted">
                        {t(`canvas.node.kind.${connectedKind}`)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
