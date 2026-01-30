import { Trash2 } from "lucide-react";
import styles from "../../../styles/components/CharacterWiki.module.css";
import { BufferedInput, BufferedTextArea } from "../../common/BufferedInput";

type WikiSectionProps = {
  id: string;
  label: string;
  content: string;
  onRename: (newLabel: string) => void;
  onUpdateContent: (newContent: string) => void;
  onDelete: () => void;
};

export function WikiSection({
  id,
  label,
  content,
  onRename,
  onUpdateContent,
  onDelete,
}: WikiSectionProps) {
  return (
    <div id={id} className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleWrapper}>
            <BufferedInput
            value={label}
            className={styles.cleanInputTitle}
            onSave={onRename}
            />
        </div>
        <div className={styles.sectionControls}>
          <button 
            type="button"
            className={styles.iconBtn} 
            onClick={onDelete}
            title="섹션 삭제"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <BufferedTextArea
        className={styles.textArea}
        value={content || ""}
        placeholder="내용을 입력하세요..."
        onSave={onUpdateContent}
      />
    </div>
  );
}
