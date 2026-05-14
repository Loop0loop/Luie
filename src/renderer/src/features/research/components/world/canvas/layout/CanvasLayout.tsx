import type { ReactNode, CSSProperties } from "react";
import { CANVAS_LAYOUT } from "../shared/constants";

interface CanvasLayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
  binder: ReactNode;
}

const SIDEBAR_STYLE: CSSProperties = { width: CANVAS_LAYOUT.SIDEBAR_WIDTH };
const BINDER_STYLE: CSSProperties = { width: CANVAS_LAYOUT.BINDER_WIDTH };

/**
 * 3분할 레이아웃: Sidebar | Main | BinderBar.
 *
 *   - Sidebar : 캔버스 보기 제어
 *   - Main    : 노드 조작
 *   - Binder  : 선택 대상 처리
 *
 * 너비는 CANVAS_LAYOUT 상수에서 관리한다. 사용자 리사이즈는
 * 다음 단계에서 react-resizable-panels로 붙인다.
 */
export function CanvasLayout({ sidebar, main, binder }: CanvasLayoutProps) {
  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-background">
      <div className="shrink-0" style={SIDEBAR_STYLE}>
        {sidebar}
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {main}
      </div>
      <div className="shrink-0" style={BINDER_STYLE}>
        {binder}
      </div>
    </div>
  );
}
