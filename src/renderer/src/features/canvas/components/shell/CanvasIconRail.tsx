/**
 * CanvasIconRail — canvas 전용 아이콘 탭 스트립.
 *
 * SRP:
 *   - 아이템 구성 데이터(CANVAS_RAIL_ITEMS)는 constants/index.ts에 위치합니다.
 *   - 이 컴포넌트는 렌더링과 인터랙션만 담당합니다.
 *
 * 활성 아이콘 재클릭 → 사이드 패널 접기(toggleActivity).
 */

import { useTranslation } from "react-i18next";
import {
  Compass,
  LayoutGrid,
  Waypoints,
  Brain,
  Search,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@shared/types/utils";
import { useCanvasViewStore } from "../../stores";
import { useCanvasView } from "../../hooks/useCanvasView";
import { CANVAS_RAIL_ITEMS } from "../../constants";

const ICON_MAP: Record<string, LucideIcon> = {
  Compass,
  LayoutGrid,
  Waypoints,
  Brain,
  Search,
};

export default function CanvasIconRail() {
  const { t } = useTranslation();
  const { activePanel, isActivityCollapsed } = useCanvasView();
  const setActivePanel = useCanvasViewStore((s) => s.setActivePanel);
  const toggleActivity = useCanvasViewStore((s) => s.toggleActivity);

  return (
    <nav
      aria-label={t("canvas.sidebar.activity")}
      className="flex h-full shrink-0 flex-col items-center gap-1.5 border-r border-border/40 bg-sidebar/95 py-3"
      style={{ width: 48 }}
      data-testid="canvas-icon-rail"
    >
      {CANVAS_RAIL_ITEMS.map(({ panel, iconName, i18nKey }) => {
        const Icon = ICON_MAP[iconName];
        const isActive = panel === activePanel && !isActivityCollapsed;
        const label = t(`canvas.activity.${i18nKey}`);

        return (
          <button
            key={panel}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={isActive}
            onClick={() => {
              if (panel === activePanel) {
                toggleActivity();
                return;
              }
              setActivePanel(panel);
            }}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-md transition-all active:scale-95",
              isActive
                ? "bg-accent/10 text-accent font-medium"
                : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
            )}
          >
            {isActive && (
              <span
                aria-hidden
                className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-accent"
              />
            )}
            <Icon className="h-5 w-5" />
          </button>
        );
      })}
    </nav>
  );
}
