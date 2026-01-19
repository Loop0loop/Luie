import styles from "../../styles/components/ResearchPanel.module.css";
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
        return "Characters";
      case "world":
        return "World";
      case "scrap":
        return "Scrap";
      default:
        return "Research";
    }
  };

  const getIcon = () => {
    switch (activeTab) {
      case "character":
        return <User size={18} />;
      case "world":
        return <Globe size={18} />;
      case "scrap":
        return <StickyNote size={18} />;
      default:
        return <User size={18} />;
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
          title="Close Panel"
        >
          <X size={18} />
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
