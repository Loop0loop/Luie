import type { WorldGraphNode } from "@shared/types";
import { useCanvasUiStore } from "../store/canvasUiStore";
import { ActivityRail } from "./ActivityRail";
import { ViewPanel } from "./ViewPanel";
import { OutlinePanel } from "./OutlinePanel";
import { SearchPanel } from "./SearchPanel";

interface CanvasSidebarProps {
  graphNodes: readonly WorldGraphNode[];
}

/**
 * 캔버스 좌측 사이드바 — VS Code Activity Bar + SidePanel 모델.
 *
 *   ┌────┬────────────────┐
 *   │Rail│ SidePanel      │
 *   │ 📐 │ View           │
 *   │ 🌳 │   Scope        │
 *   │ 🔎 │   Display      │
 *   │    │   Filters      │
 *   └────┴────────────────┘
 *
 * Activity 전환은 `canvasUiStore.activity`만 바뀌고, 패널 자체는
 * 헤더 톤이 동일해 흐름이 끊기지 않는다. SidePanelRouter는 활성 activity에
 * 맞는 패널을 렌더한다.
 */
export function CanvasSidebar({ graphNodes }: CanvasSidebarProps) {
  const activity = useCanvasUiStore((s) => s.activity);

  return (
    <aside className="flex h-full w-full overflow-hidden bg-sidebar text-fg">
      <ActivityRail />
      <div className="flex min-w-0 flex-1 flex-col">
        {activity === "view" ? <ViewPanel /> : null}
        {activity === "outline" ? (
          <OutlinePanel graphNodes={graphNodes} />
        ) : null}
        {activity === "search" ? (
          <SearchPanel graphNodes={graphNodes} />
        ) : null}
      </div>
    </aside>
  );
}
