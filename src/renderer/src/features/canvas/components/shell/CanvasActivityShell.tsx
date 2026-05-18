/**
 * CanvasActivityShell — canvas 모드 전용 사이드바 셸.
 *
 * Sidebar.tsx의 `canvasContent` prop으로 주입되어 기존 원고 바인더를
 * 완전히 대체합니다. 외부 패널 크기/테두리는 Sidebar 래퍼가 유지하므로
 * 이 컴포넌트는 내부 레이아웃만 담당합니다.
 *
 * 구조:
 *   ┌──────────────────────────────────────┐
 *   │  CanvasIconRail (44px 고정 아이콘 레일) │
 *   │  SidePanelRouter (활성 패널 콘텐츠)    │
 *   └──────────────────────────────────────┘
 */

import CanvasIconRail from "./CanvasIconRail";
import SidePanelRouter from "./SidePanelRouter";

export default function CanvasActivityShell() {
  return (
    <div
      className="flex h-full w-full overflow-hidden"
      data-testid="canvas-activity-shell"
    >
      <CanvasIconRail />
      <SidePanelRouter />
    </div>
  );
}
