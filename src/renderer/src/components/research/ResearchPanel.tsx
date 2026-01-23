import styles from "../../styles/components/ResearchPanel.module.css";
import { ICON_SIZE_LG } from "../../../shared/constants";
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
        return <User size={ICON_SIZE_LG} />;
      case "world":
        return <Globe size={ICON_SIZE_LG} />;
      case "scrap":
        return <StickyNote size={ICON_SIZE_LG} />;
      default:
        return <User size={ICON_SIZE_LG} />;
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
          <X size={ICON_SIZE_LG} />
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
