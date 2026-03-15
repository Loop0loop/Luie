import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import { Badge } from "@renderer/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@renderer/components/ui/card";
import { ENTITY_TYPE_COLORS } from "../constants";

export type CanvasGraphNodeData = {
  label: string;
  entityType: string;
  description: string;
  isActive: boolean;
  relationCount: number;
  subType?: string;
};

export function CanvasGraphNodeCard({
  data,
  selected,
}: NodeProps<CanvasGraphNodeData>) {
  const tone =
    ENTITY_TYPE_COLORS[data.entityType as keyof typeof ENTITY_TYPE_COLORS];

  return (
    <div className="group relative">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-border/70 !bg-background"
      />
      <Card
        size="sm"
        className={[
          "w-[240px] border border-white/10 bg-[#191d24]/95 text-left shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur",
          selected || data.isActive
            ? "ring-2 ring-sky-300/45"
            : "hover:border-white/20",
          tone?.card ?? "",
        ].join(" ")}
      >
        <CardHeader className="gap-2 border-b border-white/6">
          <div className="flex items-center justify-between gap-3">
            <Badge variant="outline" className={tone?.chip ?? ""}>
              {data.entityType}
            </Badge>
            <span className="text-[10px] uppercase tracking-[0.18em] text-fg/40">
              {data.relationCount} links
            </span>
          </div>
          <CardTitle className="line-clamp-2 text-[15px] font-semibold text-fg">
            {data.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="line-clamp-4 text-[12px] leading-6 text-fg/65">
            {data.description || "설명이 아직 없습니다."}
          </p>
          <div className="flex items-center justify-between text-[11px] text-fg/45">
            <span>{data.subType || "base"}</span>
            <span>Obsidian Card</span>
          </div>
        </CardContent>
      </Card>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-border/70 !bg-background"
      />
    </div>
  );
}
