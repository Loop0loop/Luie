import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, PanelBottomOpen } from "lucide-react";
import { Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import { cn } from "@shared/types/utils";

// Currently a local state component for the graph bottom panel.
// We might move its open/close state to worldBuildingStore later if needed.
type BottomPanelTab = "mentions" | "consistency" | "evidence" | "suggestions" | "quickCapture";

export function WorldGraphBottomPanel() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<BottomPanelTab>("mentions");

  const tabs = [
    { id: "mentions", label: t("world.bottomPanel.mentions", "Mentions") },
    { id: "consistency", label: t("world.bottomPanel.consistency", "Consistency") },
    { id: "evidence", label: t("world.bottomPanel.evidence", "Evidence") },
    { id: "suggestions", label: t("world.bottomPanel.suggestions", "Suggestions") },
    { id: "quickCapture", label: t("world.bottomPanel.quickCapture", "Quick Capture") },
  ] as const;

  return (
    <>
      {/* Toggle Button when Closed */}
      {!isOpen && (
        <div className="absolute bottom-4 left-4 z-20">
          <button
            onClick={() => setIsOpen(true)}
            title={t("world.bottomPanel.open", "Open Graph Context Panel")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-panel/95 border border-border/50 text-muted shadow-lg hover:shadow-xl hover:text-fg hover:border-border transition-all"
          >
            <PanelBottomOpen size={16} />
            <span className="text-[11px] font-semibold tracking-wide">
              {t("world.bottomPanel.title", "Context Panel")}
            </span>
          </button>
        </div>
      )}

      {/* Panel when Open */}
      {isOpen && (
        <>
          <PanelResizeHandle className="h-1 bg-border/40 hover:bg-accent/50 active:bg-accent/80 transition-colors cursor-row-resize z-20 relative w-full shrink-0" />
          <Panel id="world-graph-bottom-panel" defaultSize={25} minSize={10} maxSize={60} className="w-full flex flex-col bg-sidebar border-t border-border z-10 min-h-0">
            {/* Header / Tabs */}
            <div className="flex bg-surface items-center shrink-0 border-b border-border px-2 min-h-[32px]">
              <div className="flex-1 flex gap-4 h-full">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as BottomPanelTab)}
                    className={cn(
                      "h-full px-2 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors flex items-center",
                      activeTab === tab.id
                        ? "border-accent text-accent"
                        : "border-transparent text-muted hover:text-fg"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                title={t("world.bottomPanel.close", "Close Panel")}
                className="p-1 rounded text-muted hover:text-fg hover:bg-surface-hover transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-app text-fg min-h-0">
              <div className="text-muted text-sm pb-8">
                {t("world.bottomPanel.placeholder", { defaultValue: "Content for {{tab}} will appear here.", tab: activeTab })}
              </div>
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
