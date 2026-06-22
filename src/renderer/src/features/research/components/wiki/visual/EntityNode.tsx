/**
 * Read-only custom node for the relation graph (reactflow).
 *
 * Memoized — reactflow re-renders nodes frequently during pan/zoom and we
 * don't want to re-render the inner DOM unless `data` actually changes.
 */

import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@shared/types/utils";
import { ENTITY_KIND_ICON, ENTITY_KIND_LABEL_KEY, ENTITY_KIND_TINT } from "./constants";
import type { EntityKind } from "./types";

export type EntityNodeData = {
  name: string;
  kind: EntityKind;
  role?: string;
  isCenter?: boolean;
};

function EntityNodeImpl({ data }: NodeProps<EntityNodeData>) {
  const { t } = useTranslation();
  const { name, kind, role, isCenter } = data;
  const tint = ENTITY_KIND_TINT[kind];
  const Icon = ENTITY_KIND_ICON[kind];

  return (
    <div
      className={cn(
        "rounded-lg border bg-surface text-center shadow-sm select-none",
        isCenter
          ? "px-4 py-3 min-w-[150px] border-2"
          : "px-3 py-2 min-w-[110px] border-border/60",
      )}
      style={
        isCenter
          ? { borderColor: tint, backgroundColor: `${tint}12` }
          : undefined
      }
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!opacity-0 !pointer-events-none"
      />
      <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-widest text-muted/60 mb-1">
        <Icon size={9} style={{ color: tint }} />
        {t(ENTITY_KIND_LABEL_KEY[kind])}
      </div>
      <div
        className={cn(
          "font-semibold text-fg leading-tight",
          isCenter ? "text-[14px]" : "text-[12px]",
        )}
      >
        {name}
      </div>
      {role && (
        <div className="text-[10px] text-muted/70 mt-0.5 leading-tight">{role}</div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!opacity-0 !pointer-events-none"
      />
    </div>
  );
}

export const EntityNode = memo(EntityNodeImpl);
