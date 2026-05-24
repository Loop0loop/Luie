/**
 * CanvasInspectorPanel — canvas 모드 전용 우측 패널.
 *
 * 탭 구조: 요소 | AI (로컬 useState, IPC 없음)
 *   요소 탭:
 *     selection.kind === "node" → CanvasNodeInspector
 *     selection.kind === "none" → 빈 상태 안내
 *   AI 탭:
 *     CanvasAIPlaceholder
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MousePointerClick } from "lucide-react";
import { useCanvasViewStore } from "@renderer/features/canvas/stores";
import CanvasNodeInspector from "./CanvasNodeInspector";
import CanvasBinderTabBar from "./CanvasBinderTabBar";
import type { CanvasBinderTab } from "../../types";
import CanvasAIPlaceholder from "./CanvasAIPlaceholder";

export default function CanvasInspectorPanel() {
  const { t } = useTranslation();
  const selection = useCanvasViewStore((state) => state.selection);
  const [activeTab, setActiveTab] = useState<CanvasBinderTab>("elements");
  
  
  // 캔버스 자체 Slide-out BinderBar 도입으로 전역 우측 패널 제어 로직을 격리합니다.
  // 이 컴포넌트는 전역 에디터 사이드바에서만 렌더링됩니다.
  
  return (
    <div className="flex h-full flex-col overflow-hidden bg-panel">
      <CanvasBinderTabBar activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "ai" ? (
        <CanvasAIPlaceholder />
      ) : selection.kind === "node" ? (
        <CanvasNodeInspector nodeId={selection.id} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-panel-gap px-6 text-center">
          <MousePointerClick className="h-7 w-7 text-subtle opacity-30" aria-hidden />
          <div className="space-y-1">
            <p className="text-xs font-medium text-fg/60">
              {t("canvas.inspector.emptyTitle")}
            </p>
            <p className="text-[11px] text-subtle">
              {t("canvas.inspector.emptyDescription")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
