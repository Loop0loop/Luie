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
  Users,
  Brain,
  Search,
  type LucideIcon,
} from "lucide-react";
import { CANVAS_ICON_RAIL_WIDTH_PX } from "@shared/constants/layoutSizing";
import { cn } from "@shared/types/utils";
import { useCanvasViewStore } from "../../stores";
import { useCanvasView } from "../../hooks/useCanvasView";
import { CANVAS_RAIL_ITEMS } from "../../constants";

const ICON_MAP: Record<string, LucideIcon> = {
  Compass,
  LayoutGrid,
  Users,
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
      className="flex h-full shrink-0 flex-col items-center gap-0.5 border-r border-border/40 bg-sidebar px-1.5 py-2"
      style={{ width: CANVAS_ICON_RAIL_WIDTH_PX }}
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
              "relative flex h-8 w-8 items-center justify-center rounded-md transition-colors",
              isActive
                ? "bg-active text-fg"
                : "text-subtle hover:bg-surface hover:text-fg",
            )}
          >
            {isActive && (
              <span
                aria-hidden
                className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-accent"
              />
            )}
            <Icon className="h-[15px] w-[15px]" />
          </button>
        );
      })}
    </nav>
  );
}
