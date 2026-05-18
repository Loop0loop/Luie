/**
 * CanvasInspectorPanel — canvas 모드 전용 우측 패널.
 *
 * EditorRoot에서 canvas 모드일 때 기존 ContextPanel 대신 주입됩니다.
 * BinderBar 탭 구조 없이 노드 인스펙터를 직접 표시합니다.
 *
 * 상태:
 *   selection.kind === "node" → CanvasNodeInspector
 *   selection.kind === "none" → 빈 상태 안내
 */

import { useTranslation } from "react-i18next";
import { MousePointerClick } from "lucide-react";
import { useCanvasViewStore } from "@renderer/features/canvas/stores";
import CanvasNodeInspector from "./CanvasNodeInspector";

export default function CanvasInspectorPanel() {
  const { t } = useTranslation();
  const selection = useCanvasViewStore((state) => state.selection);

  if (selection.kind === "node") {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-panel">
        <CanvasNodeInspector nodeId={selection.id} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-muted bg-panel">
      <MousePointerClick className="h-8 w-8 opacity-40" aria-hidden />
      <div className="space-y-1">
        <p className="text-xs font-medium text-fg/70">
          {t("canvas.inspector.emptyTitle")}
        </p>
        <p className="text-xs">{t("canvas.inspector.emptyDescription")}</p>
      </div>
    </div>
  );
}
