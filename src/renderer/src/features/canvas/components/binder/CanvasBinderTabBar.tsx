/**
 * CanvasBinderTabBar — BinderBar 상단 탭 전환 (요소 | AI).
 *
 * UI-only. 상태는 CanvasInspectorPanel에서 로컬 useState로 관리.
 */

import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import type { CanvasBinderTab } from "../../types";

interface CanvasBinderTabBarProps {
  activeTab: CanvasBinderTab;
  onChange: (tab: CanvasBinderTab) => void;
}

const TABS: ReadonlyArray<{ id: CanvasBinderTab; i18nKey: string }> = [
  { id: "elements", i18nKey: "canvas.binder.tab.elements" },
  { id: "ai",       i18nKey: "canvas.binder.tab.ai" },
] as const;

export default function CanvasBinderTabBar({
  activeTab,
  onChange,
}: CanvasBinderTabBarProps) {
  const { t } = useTranslation();

  return (
    <div
      className="flex shrink-0 items-center gap-px border-b border-border/40 bg-panel px-3 pt-2"
      role="tablist"
      aria-label={t("canvas.binder.title")}
    >
      {TABS.map(({ id, i18nKey }) => {
        const isActive = id === activeTab;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={cn(
              "relative px-3 pb-2 text-[12px] font-medium transition-colors",
              isActive
                ? "text-fg after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:rounded-t-full after:bg-accent"
                : "text-subtle hover:text-fg",
            )}
          >
            {t(i18nKey)}
          </button>
        );
      })}
    </div>
  );
}
