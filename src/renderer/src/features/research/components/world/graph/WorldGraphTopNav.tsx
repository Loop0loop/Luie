import { useTranslation } from "react-i18next";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { cn } from "@shared/types/utils";

export function WorldGraphTopNav() {
  const { t } = useTranslation();
  const mainView = useWorldBuildingStore((state) => state.mainView);
  const setMainView = useWorldBuildingStore((state) => state.setMainView);

  const tabs = [
    { id: "graph", label: t("world.mainView.graph", "Graph") },
    { id: "timeline", label: t("world.mainView.timeline", "Timeline") },
    { id: "map", label: t("world.mainView.map", "Map") },
  ] as const;

  return (
    <div className="flex bg-surface items-center shrink-0 border-b border-border pl-4 pr-4 h-[38px]">
      <div className="flex items-center p-0.5 bg-element rounded-md text-xs font-medium">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMainView(tab.id)}
            className={cn(
              "px-4 py-1.5 rounded-sm transition-all text-muted outline-none",
              mainView === tab.id
                ? "bg-element-active text-fg shadow-sm"
                : "hover:text-fg hover:bg-element-hover"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
