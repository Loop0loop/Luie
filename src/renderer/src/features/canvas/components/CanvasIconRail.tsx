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
import { useCanvasViewStore } from "../stores";
import { useCanvasView } from "../hooks/useCanvasView";
import { CANVAS_RAIL_ITEMS } from "../constants";

// 아이콘 이름 → 컴포넌트 매핑 (constants의 iconName 필드와 연결)
const ICON_MAP: Record<string, LucideIcon> = {
  Compass:    Compass,
  LayoutGrid: LayoutGrid,
  Users:      Users,
  Brain:      Brain,
  Search:     Search,
};

export default function CanvasIconRail() {
  const { t } = useTranslation();

  // 안정적인 상태만 구독
  const { activePanel, isActivityCollapsed } = useCanvasView();

  // actions는 store에서 직접 가져옴 (shallow 비교 불필요)
  const setActivePanel  = useCanvasViewStore((s) => s.setActivePanel);
  const toggleActivity  = useCanvasViewStore((s) => s.toggleActivity);

  return (
    <nav
      aria-label={t("canvas.sidebar.activity")}
      className="flex h-full shrink-0 flex-col items-center gap-1 border-r border-border/40 bg-sidebar py-2"
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
              "relative flex h-9 w-9 items-center justify-center rounded-md transition-colors",
              isActive
                ? "text-fg"
                : "text-muted opacity-40 hover:opacity-70 hover:text-fg",
            )}
          >
            {isActive && (
              <span
                aria-hidden
                className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-accent"
              />
            )}
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </nav>
  );
}
