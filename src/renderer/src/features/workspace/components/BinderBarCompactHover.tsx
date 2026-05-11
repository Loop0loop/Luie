import { useEffect, useMemo, useState } from "react";
import { ChevronsRight, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import FocusHoverSidebar from "@renderer/features/manuscript/components/FocusHoverSidebar";
import {
  buildBinderTabItems,
  type BinderTab,
} from "@renderer/features/manuscript/components/binderSidebar.shared";
import { BinderSidebarPanelBody } from "@renderer/features/manuscript/components/BinderSidebarPanelBody";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { api } from "@shared/api";

type BinderBarCompactHoverProps = {
  activeChapterId?: string;
  currentProjectId?: string;
  sidebarTopOffset: number;
  suppressHoverOpen?: boolean;
  onServingStateChange?: (serving: boolean) => void;
};

const RAIL_WIDTH_PX = 44;
const EXPANDED_WIDTH_PX = 120;
const CONTENT_WIDTH_PX = 420;

export function BinderBarCompactHover({
  activeChapterId,
  currentProjectId,
  sidebarTopOffset,
  suppressHoverOpen = false,
  onServingStateChange,
}: BinderBarCompactHoverProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCompactTab, setActiveCompactTab] = useState<BinderTab | null>(
    null,
  );
  const closeRightPanel = useUIStore((state) => state.closeRightPanel);
  const rightPanelOpen = useUIStore((state) => state.regions.rightPanel.open);

  const tabItems = useMemo(() => buildBinderTabItems(t), [t]);
  const activeTabLabel = useMemo(
    () => tabItems.find((item) => item.tab === activeCompactTab)?.title ?? "",
    [activeCompactTab, tabItems],
  );

  useEffect(() => {
    onServingStateChange?.(activeCompactTab !== null);
    void api.logger.debug("compact-binder.serving-state", {
      activeCompactTab,
      serving: activeCompactTab !== null,
      isExpanded,
    });
  }, [activeCompactTab, onServingStateChange, isExpanded]);

  useEffect(() => {
    if (!rightPanelOpen) return;
    void api.logger.warn("compact-binder.force-close-right-panel", {
      reason: "rightPanelOpen detected while compact binder is mounted",
      activeCompactTab,
      isExpanded,
    });
    closeRightPanel();
  }, [rightPanelOpen, closeRightPanel, activeCompactTab, isExpanded]);

  return (
    <FocusHoverSidebar
      side="right"
      topOffset={sidebarTopOffset}
      activationWidthPx={RAIL_WIDTH_PX}
      suppressHoverOpen={suppressHoverOpen}
    >
      <div
        className="h-full border-l border-border/40 bg-sidebar/75 shadow-lg backdrop-blur-sm overflow-hidden transition-[width] duration-150"
        style={{
          width:
            activeCompactTab !== null
              ? CONTENT_WIDTH_PX
              : isExpanded
                ? EXPANDED_WIDTH_PX
                : RAIL_WIDTH_PX,
        }}
      >
        <div className="h-full flex flex-col">
          {activeCompactTab === null ? (
            <div className="flex-1 overflow-y-auto py-2 flex flex-col items-center gap-1.5">
              {tabItems.map((item) => (
                <div
                  key={item.tab}
                  className={`w-full ${isExpanded ? "px-2" : "px-1"} flex items-center ${isExpanded ? "gap-2" : "justify-center"}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      void api.logger.info("compact-binder.open-tab", {
                        tab: item.tab,
                        source: "icon-button",
                      });
                      closeRightPanel();
                      setActiveCompactTab(item.tab);
                      setIsExpanded(true);
                    }}
                    title={item.title}
                    className="w-10 h-10 flex items-center justify-center rounded-full transition-[background-color,color,transform] duration-150 active:scale-95 text-muted hover:text-fg hover:bg-surface-hover"
                  >
                    {item.icon}
                  </button>
                  {isExpanded && (
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left text-xs text-fg/70 hover:text-fg truncate"
                      onClick={() => {
                        void api.logger.info("compact-binder.open-tab", {
                          tab: item.tab,
                          source: "label-button",
                        });
                        closeRightPanel();
                        setActiveCompactTab(item.tab);
                        setIsExpanded(true);
                      }}
                      title={item.title}
                    >
                      {item.title}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="h-10 px-3 border-b border-border/50 flex items-center text-xs font-medium text-fg/80">
                <span className="truncate">{activeTabLabel}</span>
              </div>
              <div className="h-[calc(100%-2.5rem)] overflow-hidden">
                <BinderSidebarPanelBody
                  activeChapterId={activeChapterId}
                  activeTab={activeCompactTab}
                  currentProjectId={currentProjectId}
                  onBackToSnapshotList={() => setActiveCompactTab("snapshot")}
                  onClose={() => setActiveCompactTab(null)}
                  t={t}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (activeCompactTab !== null) {
                void api.logger.info("compact-binder.close-content", {
                  activeCompactTab,
                });
                setActiveCompactTab(null);
                return;
              }
              void api.logger.info("compact-binder.toggle-expand", {
                nextExpanded: !isExpanded,
              });
              setIsExpanded((prev) => !prev);
            }}
            className="h-9 border-t border-border/40 flex items-center justify-center gap-1.5 text-[12px] text-muted hover:text-fg hover:bg-surface-hover transition-colors"
            title={
              activeCompactTab !== null || isExpanded
                ? t("sidebar.toggle.close")
                : t("sidebar.toggle.open")
            }
          >
            {activeCompactTab !== null || isExpanded ? (
              <>
                <ChevronRight size={13} />
                <span>{t("sidebar.toggle.close")}</span>
              </>
            ) : (
              <>
                <ChevronsRight size={13} />
                <span>{t("sidebar.expand")}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </FocusHoverSidebar>
  );
}
