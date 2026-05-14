import { useTranslation } from "react-i18next";
import type { CanvasSelection } from "../types";

interface BinderInspectorProps {
  selection: CanvasSelection;
}

/**
 * 선택된 노드/엣지의 메타 정보를 표시한다.
 *
 * 노드 타입(Episode/Character/Event/Place/Note)과 엣지에 따라
 * 보여줄 필드가 달라진다. 셸 단계에서는 type/id만 노출.
 */
export function BinderInspector({ selection }: BinderInspectorProps) {
  const { t } = useTranslation();

  if (selection.kind === "none") {
    return (
      <p className="py-1 text-[12px] text-muted-foreground">
        {t("canvas.binder.inspector.empty")}
      </p>
    );
  }

  const typeLabel =
    selection.kind === "node"
      ? t("canvas.binder.inspector.type.node")
      : t("canvas.binder.inspector.type.edge");

  return (
    <dl className="grid grid-cols-[64px_1fr] gap-x-3 gap-y-1.5 py-1 text-[12px]">
      <dt className="text-muted-foreground">
        {t("canvas.binder.inspector.field.type")}
      </dt>
      <dd className="text-foreground">{typeLabel}</dd>
      <dt className="text-muted-foreground">
        {t("canvas.binder.inspector.field.id")}
      </dt>
      <dd className="truncate font-mono text-[11px] text-foreground">
        {selection.id}
      </dd>
    </dl>
  );
}
