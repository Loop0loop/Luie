import { useTranslation } from "react-i18next";
import { ListTree, LayoutGrid, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@renderer/lib/utils";
import {
  CANVAS_ACTIVITY_KEYS,
  CANVAS_LAYOUT,
  type CanvasActivityDef,
} from "../shared/constants";
import { useCanvasUiStore } from "../store/canvasUiStore";

/**
 * VS Code Activity Bar 모델을 캔버스 도메인으로 옮긴 좁은 세로 레일.
 *
 * - 폭 44px(VS Code 기본). Editor `Sidebar.tsx`의 hover/active 톤을 인용:
 *   - hover  : `hover:bg-surface-hover hover:text-fg`
 *   - active : `bg-active text-fg` + 좌측 `border-l-[3px] border-accent`
 * - 항목은 캔버스 작업에 직접 필요한 3개로 제한 (View / Outline / Search).
 *   Memory/Entities 같은 앱 전역 활동은 워크스페이스 사이드바 영역이다.
 */
const ACTIVITIES: readonly (CanvasActivityDef & { icon: LucideIcon })[] = [
  { id: "view", labelKey: CANVAS_ACTIVITY_KEYS.view, icon: LayoutGrid },
  { id: "outline", labelKey: CANVAS_ACTIVITY_KEYS.outline, icon: ListTree },
  { id: "search", labelKey: CANVAS_ACTIVITY_KEYS.search, icon: Search },
];

export function ActivityRail() {
  const { t } = useTranslation();
  const activity = useCanvasUiStore((s) => s.activity);
  const setActivity = useCanvasUiStore((s) => s.setActivity);

  return (
    <nav
      aria-label={t("canvas.sidebar.activity.view")}
      className="flex h-full shrink-0 flex-col items-stretch border-r border-border bg-sidebar"
      style={{ width: CANVAS_LAYOUT.ACTIVITY_RAIL_PX }}
    >
      <ul className="flex flex-col">
        {ACTIVITIES.map((item) => {
          const Icon = item.icon;
          const active = activity === item.id;
          const label = t(item.labelKey);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setActivity(item.id)}
                aria-pressed={active}
                title={label}
                aria-label={label}
                className={cn(
                  "relative flex h-11 w-full items-center justify-center transition-colors",
                  "border-l-[3px]",
                  active
                    ? "border-accent bg-active text-fg"
                    : "border-transparent text-muted hover:bg-surface-hover hover:text-fg",
                )}
              >
                <Icon className="size-[18px]" strokeWidth={active ? 2.25 : 1.75} />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
