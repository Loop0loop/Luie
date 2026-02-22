import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, FileText, Map, Kanban, X } from "lucide-react";
import { cn } from "@shared/types/utils";
// Tab Components
import WorldSection from "@renderer/features/research/components/WorldSection"; // Terms/Proper Nouns
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
    <div className="flex flex-col h-full w-full bg-sidebar border-l border-border overflow-hidden">
      {/* Sub-Tabs Header (Material 3 Pill Style) */}
      <div className="flex items-center border-b border-border bg-background overflow-x-auto no-scrollbar shrink-0 h-12 px-2 gap-2">
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
                  ? "bg-[#c2e7ff] text-[#001d35]"
                  : "text-[#444746] dark:text-[#c4c7c5] hover:bg-[#1f1f1f]/5 dark:hover:bg-white/10"
              )}
              title={tab.label}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
        {onClose && (
            <button onClick={onClose} className="ml-auto p-1 text-muted hover:text-fg rounded-full hover:bg-black/5">
                <X className="w-4 h-4" />
            </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary relative">
        {activeTab === "terms" && <WorldSection />}
        {activeTab === "synopsis" && <SynopsisSection />}
        {activeTab === "map" && <MindMapBoard />}
        {activeTab === "plot" && <PlotBoard />}
      </div>
    </div>
  );
}
