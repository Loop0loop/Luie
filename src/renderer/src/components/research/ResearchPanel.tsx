import styles from "../../styles/components/ResearchPanel.module.css";
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
    <div className={styles.panelContainer}>
      <div className={styles.header}>
        <div className={styles.title}>
          {getIcon()}
          <span>{getTitle()}</span>
        </div>
        <button
          className={styles.closeButton}
          onClick={onClose}
          title={TOOLTIP_CLOSE_PANEL}
        >
          <X className="icon-lg" />
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === "character" && <CharacterManager />}
        {activeTab === "world" && <WorldSection />}
        {activeTab === "scrap" && <MemoSection />}
      </div>
    </div>
  );
}
