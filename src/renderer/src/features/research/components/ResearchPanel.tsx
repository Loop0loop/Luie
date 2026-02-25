import React from "react";
import { useTranslation } from "react-i18next";
import { Globe, User, X, Sparkles, FileText, BookOpen, Calendar, Shield } from "lucide-react";
import CharacterManager from "@renderer/features/research/components/CharacterManager";
import EventManager from "@renderer/features/research/components/event/EventManager";
import FactionManager from "@renderer/features/research/components/faction/FactionManager";
import MemoSection from "@renderer/features/research/components/MemoSection";
import WorldSection from "@renderer/features/research/components/WorldSection";
import AnalysisSection from "@renderer/features/research/components/AnalysisSection";
import SynopsisSection from "@renderer/features/research/components/SynopsisSection";
import { cn } from "@shared/types/utils";
import { FeatureErrorBoundary } from "@shared/ui/FeatureErrorBoundary";

interface ResearchPanelProps {
  activeTab: string; // 'character' | 'event' | 'faction' | 'world' | 'scrap' | 'analysis' | 'synopsis'
  onClose?: () => void;
  onTabChange?: (tab: "character" | "event" | "faction" | "world" | "scrap" | "analysis" | "synopsis") => void;
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
    synopsis: { title: t("sidebar.item.synopsis", "Synopsis"), icon: <FileText className="icon-lg" /> },
    character: { title: t("research.title.characters", "Characters"), icon: <User className="icon-lg" /> },
    event: { title: t("research.title.events", "Events"), icon: <Calendar className="icon-lg" /> },
    faction: { title: t("research.title.factions", "Factions"), icon: <Shield className="icon-lg" /> },
    world: { title: t("research.title.world", "World"), icon: <Globe className="icon-lg" /> },
    scrap: { title: t("research.title.scrap", "Scrap"), icon: <BookOpen className="icon-lg" /> },
    analysis: { title: t("research.title.analysis", "Analysis"), icon: <Sparkles className="icon-lg" /> },
  };

  // Safe fallback (keep tabConfig for future extensions if needed)
  if (!tabConfig[activeTab]) {
    // This just ensures tabConfig doesn't throw if not found
  }

  const tabs: { id: "character" | "event" | "faction" | "world" | "synopsis" | "scrap" | "analysis"; icon: React.ElementType; label: string }[] = [
    { id: 'character', label: t("research.title.characters", "Characters"), icon: User },
    { id: 'event', label: t("research.title.events", "Events"), icon: Calendar },
    { id: 'faction', label: t("research.title.factions", "Factions"), icon: Shield },
    { id: 'world', label: t("research.title.world", "World"), icon: Globe },
    { id: 'synopsis', label: t("sidebar.item.synopsis", "Synopsis"), icon: FileText },
    { id: 'scrap', label: t("research.title.scrap", "Scrap"), icon: BookOpen },
    { id: 'analysis', label: t("research.title.analysis", "Analysis"), icon: Sparkles }
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
        /* Standalone View (Close button only, floating) */
        onClose && (
          <button
            className="absolute top-3 right-3 z-10 p-2 rounded-lg text-subtle bg-bg-primary/50 backdrop-blur-sm cursor-pointer border border-border hover:bg-hover hover:text-fg shadow-sm transition-all"
            onClick={onClose}
            title={t("research.tooltip.closePanel")}
          >
            <X className="w-4 h-4" />
          </button>
        )
      )}

      <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary relative">
        {activeTab === "character" && <FeatureErrorBoundary featureName="Characters"><CharacterManager /></FeatureErrorBoundary>}
        {activeTab === "event" && <FeatureErrorBoundary featureName="Events"><EventManager /></FeatureErrorBoundary>}
        {activeTab === "faction" && <FeatureErrorBoundary featureName="Factions"><FactionManager /></FeatureErrorBoundary>}
        {activeTab === "world" && <FeatureErrorBoundary featureName="World"><WorldSection /></FeatureErrorBoundary>}
        {activeTab === "scrap" && <FeatureErrorBoundary featureName="Scrap"><MemoSection /></FeatureErrorBoundary>}
        {activeTab === "analysis" && <FeatureErrorBoundary featureName="Analysis"><AnalysisSection /></FeatureErrorBoundary>}
        {activeTab === "synopsis" && <FeatureErrorBoundary featureName="Synopsis"><SynopsisSection /></FeatureErrorBoundary>}
      </div>
    </div>
  );
}
