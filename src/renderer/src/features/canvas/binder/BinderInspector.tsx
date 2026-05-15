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
    <div className="grid grid-cols-[80px_1fr] items-baseline gap-x-3 gap-y-0.5">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-muted">
        {label}
      </dt>
      <dd className="text-[12px] leading-snug text-fg">{children}</dd>
    </div>
  );
}

/**
 * 인스펙터 본문.
 *
 * - 선택 없음: 단일 안내문 (섹션 헤더는 BinderBar가 따로 그림)
 * - 노드/엣지 선택: 헤더 카드 + 메타 필드
 *
 * 빈 상태에서 다른 섹션은 BinderBar 레벨에서 렌더되지 않으므로
 * 여기서는 인스펙터 본문만 책임진다.
 */
export function BinderInspector({
  selection,
  graphNodes,
}: BinderInspectorProps) {
  const { t } = useTranslation();

  if (selection.kind === "none") {
    return (
      <p className="px-1 py-2 text-[12px] leading-relaxed text-muted">
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
          <code className="font-mono text-[11px] text-muted">
            {selection.id}
          </code>
        </InspectorRow>
      </div>
    );
  }

  // selection.kind === "node"
  const node = graphNodes.find((n) => n.id === selection.id);
  if (!node) {
    return (
      <p className="px-1 py-2 text-[12px] text-muted">
        {t("canvas.binder.inspector.empty")}
      </p>
    );
  }

  const kind = ENTITY_TYPE_TO_CANVAS_KIND[node.entityType];
  const Icon = CANVAS_NODE_ICON[kind];
  const tint = CANVAS_NODE_TINT[kind];

  return (
    <div className="flex flex-col gap-3 py-1">
      {/* 헤더 카드 — surface tone */}
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-md border border-border bg-surface px-2.5 py-2",
        )}
      >
        <div
          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: `${tint}1f`, color: tint }}
        >
          <Icon className="size-3.5" />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
            {t(CANVAS_NODE_LABEL_KEY[kind])}
          </span>
          <span className="truncate text-[13px] font-semibold leading-tight text-fg">
            {node.name}
          </span>
        </div>
      </div>

      {/* 필드 */}
      <dl className="flex flex-col gap-1.5">
        {node.firstAppearance ? (
          <InspectorRow
            label={t("canvas.binder.inspector.field.firstAppearance")}
          >
            {node.firstAppearance}
          </InspectorRow>
        ) : null}
        {node.subType ? (
          <InspectorRow label={t("canvas.binder.inspector.field.subType")}>
            {node.subType}
          </InspectorRow>
        ) : null}
        {node.description ? (
          <InspectorRow
            label={t("canvas.binder.inspector.field.description")}
          >
            <span className="whitespace-pre-wrap text-fg/85">
              {node.description}
            </span>
          </InspectorRow>
        ) : null}
        <InspectorRow label={t("canvas.binder.inspector.field.id")}>
          <code className="font-mono text-[11px] text-muted">{node.id}</code>
        </InspectorRow>
      </dl>
    </div>
  );
}
