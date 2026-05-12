import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import type { WorldGraphNode } from "@shared/types";
import type { WorldEntitySourceType } from "@shared/types";
import { GRAPH_ENTITY_BADGE_COLOR_TOKENS } from "../shared/theme/graphThemeConstants";
import { cn } from "@renderer/lib/utils";

const ENTITY_TYPES: WorldEntitySourceType[] = [
  "Character", "Event", "Faction", "Place", "Term", "Concept", "Rule", "Item", "WorldEntity",
];

interface EntityViewProps {
  nodes: WorldGraphNode[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}

export function EntityView({ nodes, selectedNodeId, onSelectNode }: EntityViewProps) {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<WorldEntitySourceType | "all">("all");

  const filtered = activeFilter === "all"
    ? nodes
    : nodes.filter((n) => n.entityType === activeFilter);

  const typeCount = (type: WorldEntitySourceType) => nodes.filter((n) => n.entityType === type).length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border/30 px-5 py-3">
        <Users size={14} className="text-muted" />
        <span className="text-[12px] font-semibold text-fg">{t("canvas.tab.entity")}</span>
        <span className="rounded-full border border-border/40 bg-element px-2 py-0.5 text-[10px] text-muted">
          {filtered.length}
        </span>
      </div>

      {/* Type filter pills */}
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-border/20 px-4 py-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={cn(
            "shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-colors",
            activeFilter === "all"
              ? "border-border/60 bg-element text-fg"
              : "border-border/30 text-muted hover:border-border/50 hover:text-fg",
          )}
        >
          {t("canvas.entity.all")} ({nodes.length})
        </button>

        {ENTITY_TYPES.filter((t) => typeCount(t) > 0).map((type) => {
          const colors = GRAPH_ENTITY_BADGE_COLOR_TOKENS[type];
          const isActive = activeFilter === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setActiveFilter(type)}
              className={cn(
                "shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-colors",
                isActive ? colors.chip : "border-border/30 text-muted hover:border-border/50 hover:text-fg",
              )}
            >
              {type} ({typeCount(type)})
            </button>
          );
        })}
      </div>

      {/* Entity grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Users size={32} className="text-muted/30" strokeWidth={1} />
            <p className="text-[12px] text-muted">{t("canvas.entity.empty")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((node) => {
              const colors = GRAPH_ENTITY_BADGE_COLOR_TOKENS[node.entityType as WorldEntitySourceType]
                ?? GRAPH_ENTITY_BADGE_COLOR_TOKENS.WorldEntity;
              const isSelected = selectedNodeId === node.id;

              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => onSelectNode(isSelected ? null : node.id)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all duration-150",
                    isSelected
                      ? `${colors.card} shadow-md`
                      : "border-border/30 bg-panel/60 hover:border-border/60 hover:bg-element/60",
                  )}
                >
                  <div className="mb-2 flex items-center gap-1.5">
                    <span className={cn("rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest", colors.chip)}>
                      {node.entityType}
                    </span>
                  </div>
                  <p className="truncate text-[12px] font-semibold text-fg">{node.name}</p>
                  {node.description && (
                    <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted">
                      {node.description}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
