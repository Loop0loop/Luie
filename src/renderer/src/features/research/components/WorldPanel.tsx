import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, FileText, Map, Kanban, X } from "lucide-react";
import { cn } from "@shared/types/utils";
import WorldSection from "@renderer/features/research/components/WorldSection";
import SynopsisSection from "@renderer/features/research/components/SynopsisSection";
import { MindMapBoard } from "@renderer/features/research/components/world/MindMapBoard";
import { PlotBoard } from "@renderer/features/research/components/world/PlotBoard";

interface WorldPanelProps {
  onClose?: () => void;
}

export default function WorldPanel({ onClose }: WorldPanelProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"terms" | "synopsis" | "map" | "plot">("terms");

  const tabs = [
    { id: "terms", label: t("sidebar.item.world"), icon: Globe }, // Terms/Proper Nouns
    { id: "synopsis", label: t("sidebar.item.synopsis"), icon: FileText },
    { id: "map", label: "Map", icon: Map }, // Need translation keys? t("research.title.map")
    { id: "plot", label: "Plot", icon: Kanban } // t("research.title.plot")
  ] as const;

  return (
    <div className="research-surface flex h-full w-full flex-col overflow-hidden">
      <div className="flex h-12 shrink-0 items-center gap-2 overflow-x-auto px-2 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium whitespace-nowrap rounded-full transition-colors",
                isActive
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:bg-surface-hover hover:text-fg"
              )}
              title={tab.label}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("sidebar.toggle.close")}
            title={t("sidebar.toggle.close")}
          >
            <X className="icon-sm" />
          </button>
        )}
      </div>

      <div className="relative flex flex-1 flex-col overflow-hidden">
        {activeTab === "terms" && <WorldSection />}
        {activeTab === "synopsis" && <SynopsisSection />}
        {activeTab === "map" && <MindMapBoard />}
        {activeTab === "plot" && <PlotBoard />}
      </div>
    </div>
  );
}
