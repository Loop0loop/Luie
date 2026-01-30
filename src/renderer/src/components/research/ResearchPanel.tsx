// Monolithic CSS is still used by children (WorldSection, MemoSection), so we cannot remove the file yet.
// But this component no longer needs it.
import {
  LABEL_RESEARCH_CHARACTERS,
  LABEL_RESEARCH_DEFAULT,
  LABEL_RESEARCH_SCRAP,
  LABEL_RESEARCH_WORLD,
  TOOLTIP_CLOSE_PANEL,
} from "../../../../shared/constants";
import { Globe, StickyNote, User, X } from "lucide-react";
import CharacterManager from "./CharacterManager";
import MemoSection from "./MemoSection";
import WorldSection from "./WorldSection";

interface ResearchPanelProps {
  activeTab: string; // 'character' | 'world' | 'scrap'
  onClose: () => void;
}

export default function ResearchPanel({
  activeTab,
  onClose,
}: ResearchPanelProps) {
  const getTitle = () => {
    switch (activeTab) {
      case "character":
        return LABEL_RESEARCH_CHARACTERS;
      case "world":
        return LABEL_RESEARCH_WORLD;
      case "scrap":
        return LABEL_RESEARCH_SCRAP;
      default:
        return LABEL_RESEARCH_DEFAULT;
    }
  };

  const getIcon = () => {
    switch (activeTab) {
      case "character":
        return <User className="icon-lg" />;
      case "world":
        return <Globe className="icon-lg" />;
      case "scrap":
        return <StickyNote className="icon-lg" />;
      default:
        return <User className="icon-lg" />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-sidebar border-l border-border overflow-hidden">
      <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-bg-primary shrink-0">
        <div className="font-semibold text-sm text-fg flex items-center gap-2">
          {getIcon()}
          <span>{getTitle()}</span>
        </div>
        <button
          className="p-1 rounded text-muted cursor-pointer border-none bg-transparent flex items-center justify-center hover:bg-hover hover:text-fg"
          onClick={onClose}
          title={TOOLTIP_CLOSE_PANEL}
        >
          <X className="icon-lg" />
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary relative">
        {activeTab === "character" && <CharacterManager />}
        {activeTab === "world" && <WorldSection />}
        {activeTab === "scrap" && <MemoSection />}
      </div>
    </div>
  );
}
