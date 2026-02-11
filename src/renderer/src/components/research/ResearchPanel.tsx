// Monolithic CSS is still used by children (WorldSection, MemoSection), so we cannot remove the file yet.
// But this component no longer needs it.
import React from "react";
import { useTranslation } from "react-i18next";
import { Globe, StickyNote, User, X, Sparkles } from "lucide-react";
import CharacterManager from "./CharacterManager";
import MemoSection from "./MemoSection";
import WorldSection from "./WorldSection";
import AnalysisSection from "./AnalysisSection";

interface ResearchPanelProps {
  activeTab: string; // 'character' | 'world' | 'scrap'
  onClose: () => void;
}

export default function ResearchPanel({
  activeTab,
  onClose,
}: ResearchPanelProps) {
  const { t } = useTranslation();
  const tabConfig: Record<
    string,
    { title: string; icon: React.JSX.Element }
  > = {
    character: { title: t("research.title.characters"), icon: <User className="icon-lg" /> },
    world: { title: t("research.title.world"), icon: <Globe className="icon-lg" /> },
    scrap: { title: t("research.title.scrap"), icon: <StickyNote className="icon-lg" /> },
    analysis: { title: t("research.title.analysis"), icon: <Sparkles className="icon-lg" /> },
  };

  const { title, icon } = tabConfig[activeTab] ?? {
    title: t("research.title.default"),
    icon: <User className="icon-lg" />,
  };

  return (
    <div className="flex flex-col h-full w-full bg-sidebar border-l border-border overflow-hidden">
      <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-bg-primary shrink-0">
        <div className="font-semibold text-sm text-fg flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </div>
        <button
          className="p-1 rounded text-muted cursor-pointer border-none bg-transparent flex items-center justify-center hover:bg-hover hover:text-fg"
          onClick={onClose}
          title={t("research.tooltip.closePanel")}
        >
          <X className="icon-lg" />
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary relative">
        {activeTab === "character" && <CharacterManager />}
        {activeTab === "world" && <WorldSection />}
        {activeTab === "scrap" && <MemoSection />}
        {activeTab === "analysis" && <AnalysisSection />}
      </div>
    </div>
  );
}
