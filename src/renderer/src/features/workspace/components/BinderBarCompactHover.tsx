import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import FocusHoverSidebar from "@renderer/features/manuscript/components/FocusHoverSidebar";
import {
  BINDER_VALID_TABS,
  buildBinderTabItems,
  type BinderTab,
} from "@renderer/features/manuscript/components/binderSidebar.shared";
import { BinderTabButton } from "@renderer/features/manuscript/components/BinderTabButton";
import { openEditorBinderTab } from "@renderer/features/workspace/services/layoutRegionActions";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";

type BinderBarCompactHoverProps = {
  sidebarTopOffset: number;
  suppressHoverOpen?: boolean;
};

const RAIL_WIDTH_PX = 44;
const EXPANDED_WIDTH_PX = 120;

export function BinderBarCompactHover({
  sidebarTopOffset,
  suppressHoverOpen = false,
}: BinderBarCompactHoverProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const rightPanelOpen = useUIStore((state) => state.regions.rightPanel.open);
  const rightPanelActiveTab = useUIStore(
    (state) => state.regions.rightPanel.activeTab,
  );

  const activeRightTab: BinderTab | null =
    rightPanelOpen &&
    rightPanelActiveTab &&
    BINDER_VALID_TABS.includes(rightPanelActiveTab as BinderTab)
      ? (rightPanelActiveTab as BinderTab)
      : null;

  const tabItems = useMemo(() => buildBinderTabItems(t), [t]);

  if (activeRightTab) return null;

  return (
    <FocusHoverSidebar
      side="right"
      topOffset={sidebarTopOffset}
      activationWidthPx={RAIL_WIDTH_PX}
      suppressHoverOpen={suppressHoverOpen}
    >
      <div
        className="h-full border-l border-border bg-surface/95 shadow-lg backdrop-blur-sm overflow-hidden transition-[width] duration-150"
        style={{ width: isExpanded ? EXPANDED_WIDTH_PX : RAIL_WIDTH_PX }}
      >
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto py-2 flex flex-col items-center gap-1.5">
            {tabItems.map((item) => (
              <div
                key={item.tab}
                className={`w-full ${isExpanded ? "px-2" : "px-1"} flex items-center ${isExpanded ? "gap-2" : "justify-center"}`}
              >
                <BinderTabButton
                  icon={item.icon}
                  isActive={false}
                  onClick={() => openEditorBinderTab(item.tab)}
                  title={item.title}
                  type={item.type}
                />
                {isExpanded && (
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left text-xs text-fg/70 hover:text-fg truncate"
                    onClick={() => openEditorBinderTab(item.tab)}
                    title={item.title}
                  >
                    {item.title}
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="h-9 border-t border-border/50 flex items-center justify-center gap-1 text-xs text-muted hover:text-fg hover:bg-surface-hover transition-colors"
            title={
              isExpanded ? t("sidebar.toggle.close") : t("sidebar.toggle.open")
            }
          >
            {isExpanded ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            {isExpanded && <span>{t("sidebar.toggle.close")}</span>}
          </button>
        </div>
      </div>
    </FocusHoverSidebar>
  );
}
