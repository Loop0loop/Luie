import { useTranslation } from "react-i18next";
import type { WorldGraphNode } from "@shared/types";
import { cn } from "@renderer/lib/utils";
import {
  CANVAS_NODE_ICON,
  CANVAS_NODE_LABEL_KEY,
  CANVAS_NODE_TINT,
} from "../stage/nodes/nodeConstants";
import { ENTITY_TYPE_TO_CANVAS_KIND } from "../types";
import type { CanvasSelection } from "../types";

interface BinderInspectorProps {
  selection: CanvasSelection;
  /** 현재 그래프의 모든 노드 (선택된 노드를 lookup) */
  graphNodes: readonly WorldGraphNode[];
}

interface InspectorRowProps {
  label: string;
  children: React.ReactNode;
}

function InspectorRow({ label, children }: InspectorRowProps) {
  return (
    <div className="grid grid-cols-[72px_1fr] items-baseline gap-x-3 gap-y-0.5">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground/70">
        {label}
      </dt>
      <dd className="text-[12px] leading-snug text-foreground">{children}</dd>
    </div>
  );
}

/**
 * 선택된 노드/엣지의 메타 정보를 표시.
 *
 * - selection.kind === "none"  : 빈 상태
 * - selection.kind === "node"  : 노드 카드 헤더 + 필드 목록
 * - selection.kind === "edge"  : ID만 (다음 단계에서 EntityRelation lookup 추가)
 */
export function BinderInspector({
  selection,
  graphNodes,
}: BinderInspectorProps) {
  const { t } = useTranslation();

  if (selection.kind === "none") {
    return (
      <p className="py-1 text-[12px] text-muted-foreground">
        {t("canvas.binder.inspector.empty")}
      </p>
    );
  }

  if (selection.kind === "edge") {
    return (
      <div className="flex flex-col gap-2 py-1">
        <InspectorRow label={t("canvas.binder.inspector.field.type")}>
          {t("canvas.binder.inspector.type.edge")}
        </InspectorRow>
        <InspectorRow label={t("canvas.binder.inspector.field.id")}>
          <code className="font-mono text-[11px]">{selection.id}</code>
        </InspectorRow>
      </div>
    );
  }

  // selection.kind === "node"
  const node = graphNodes.find((n) => n.id === selection.id);
  if (!node) {
    return (
      <p className="py-1 text-[12px] text-muted-foreground">
        {t("canvas.binder.inspector.empty")}
      </p>
    );
  }

  const kind = ENTITY_TYPE_TO_CANVAS_KIND[node.entityType];
  const Icon = CANVAS_NODE_ICON[kind];
  const tint = CANVAS_NODE_TINT[kind];

  return (
    <div className="flex flex-col gap-3 py-1">
      {/* 헤더 카드: 아이콘 + 종류 + 이름 */}
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-md border border-border/60 bg-card px-2.5 py-2",
        )}
      >
        <div
          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: `${tint}1f`, color: tint }}
        >
          <Icon className="size-3.5" />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {t(CANVAS_NODE_LABEL_KEY[kind])}
          </span>
          <span className="truncate text-[13px] font-semibold leading-tight text-foreground">
            {node.name}
          </span>
        </div>
      </div>

      {/* 필드 */}
      <dl className="flex flex-col gap-1.5">
        {node.firstAppearance ? (
          <InspectorRow label={t("canvas.binder.inspector.field.firstAppearance")}>
            {node.firstAppearance}
          </InspectorRow>
        ) : null}
        {node.subType ? (
          <InspectorRow label={t("canvas.binder.inspector.field.subType")}>
            {node.subType}
          </InspectorRow>
        ) : null}
        {node.description ? (
          <InspectorRow label={t("canvas.binder.inspector.field.description")}>
            <span className="whitespace-pre-wrap text-foreground/80">
              {node.description}
            </span>
          </InspectorRow>
        ) : null}
        <InspectorRow label={t("canvas.binder.inspector.field.id")}>
          <code className="font-mono text-[11px] text-muted-foreground">
            {node.id}
          </code>
        </InspectorRow>
      </dl>
    </div>
  );
}
