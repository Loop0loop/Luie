import React from "react";
import { useTranslation } from "react-i18next";
import { Globe, User, X, Sparkles, FileText, BookOpen } from "lucide-react";
import CharacterManager from "@renderer/features/research/components/CharacterManager";
import MemoSection from "@renderer/features/research/components/MemoSection";
import WorldSection from "@renderer/features/research/components/WorldSection";
import AnalysisSection from "@renderer/features/research/components/AnalysisSection";
import SynopsisSection from "@renderer/features/research/components/SynopsisSection";
import { cn } from "@shared/types/utils";
import { FeatureErrorBoundary } from "@shared/ui/FeatureErrorBoundary";

interface ResearchPanelProps {
  activeTab: string; // 'character' | 'world' | 'scrap' | 'analysis' | 'synopsis'
  onClose?: () => void;
  onTabChange?: (tab: "character" | "world" | "scrap" | "analysis" | "synopsis") => void;
}

export default function ResearchPanel({
  activeTab,
  onClose,
  onTabChange,
}: ResearchPanelProps) {
  const { t } = useTranslation();

  const tabConfig: Record<
    string,
    { title: string; icon: React.JSX.Element }
  > = {
    synopsis: { title: t("sidebar.item.synopsis"), icon: <FileText className="icon-lg" /> },
    character: { title: t("research.title.characters"), icon: <User className="icon-lg" /> },
    world: { title: t("research.title.world"), icon: <Globe className="icon-lg" /> },
    scrap: { title: t("research.title.scrap"), icon: <BookOpen className="icon-lg" /> },
    analysis: { title: t("research.title.analysis"), icon: <Sparkles className="icon-lg" /> },
  };

  // Safe fallback
  const { title, icon } = tabConfig[activeTab] ?? {
    title: t("research.title.default"),
    icon: <User className="icon-lg" />,
  };

  const tabs: { id: "character" | "world" | "synopsis" | "scrap" | "analysis"; icon: React.ElementType; label: string }[] = [
    { id: 'character', label: t("research.title.characters"), icon: User },
    { id: 'world', label: t("research.title.world"), icon: Globe },
    { id: 'synopsis', label: t("sidebar.item.synopsis"), icon: FileText },
    { id: 'scrap', label: t("research.title.scrap"), icon: BookOpen },
    { id: 'analysis', label: t("research.title.analysis"), icon: Sparkles }
  ];

  return (
    <div className="flex flex-col h-full w-full bg-sidebar border-l border-border overflow-hidden">
      {onTabChange ? (
        /* Tab Navigation Header (Google Docs Mode) */
        <div className="flex items-center border-b border-border bg-background overflow-x-auto no-scrollbar shrink-0 h-12 px-2 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
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
            <button onClick={onClose} className="ml-auto p-1 text-muted hover:text-fg">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        /* Standard Header (Standard View) */
        <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-bg-primary shrink-0">
          <div className="font-semibold text-sm text-fg flex items-center gap-2">
            {icon}
            <span>{title}</span>
          </div>
          {onClose && (
            <button
              className="p-1 rounded text-muted cursor-pointer border-none bg-transparent flex items-center justify-center hover:bg-hover hover:text-fg"
              onClick={onClose}
              title={t("research.tooltip.closePanel")}
            >
              <X className="icon-lg" />
            </button>
          )}
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary relative">
        {activeTab === "character" && <FeatureErrorBoundary featureName="Characters"><CharacterManager /></FeatureErrorBoundary>}
        {activeTab === "world" && <FeatureErrorBoundary featureName="World"><WorldSection /></FeatureErrorBoundary>}
        {activeTab === "scrap" && <FeatureErrorBoundary featureName="Scrap"><MemoSection /></FeatureErrorBoundary>}
        {activeTab === "analysis" && <FeatureErrorBoundary featureName="Analysis"><AnalysisSection /></FeatureErrorBoundary>}
        {activeTab === "synopsis" && <FeatureErrorBoundary featureName="Synopsis"><SynopsisSection /></FeatureErrorBoundary>}
      </div>
    </div>
  );
}
