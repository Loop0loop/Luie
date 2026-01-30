import { Plus, X } from "lucide-react";
import styles from "../../../styles/components/CharacterWiki.module.css";
import { BufferedInput } from "../../common/BufferedInput";

type InfoboxRowProps = {
  label: string;
  value?: string;
  onSave?: (v: string) => void;
  onLabelSave?: (v: string) => void;
  placeholder?: string;
  type?: "text" | "textarea" | "select";
  options?: string[];
  isCustom?: boolean;
  onDelete?: () => void;
};

export function InfoboxRow({
  label,
  value,
  onSave,
  onLabelSave,
  placeholder,
  type = "text",
  options = [],
  isCustom = false,
  onDelete,
}: InfoboxRowProps) {
  return (
    <div className={styles.infoboxRow}>
      <div className={styles.infoboxLabel}>
        {isCustom ? (
          <div className={styles.customLabelWrapper}>
             <BufferedInput
              className={styles.cleanInputCenter}
              value={label}
              onSave={onLabelSave || (() => {})}
            />
            {onDelete && (
                <button 
                    type="button"
                    className={styles.deleteLabelBtn} 
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    title="항목 삭제"
                >
                    <X size={10} />
                </button>
            )}
          </div>
        ) : (
          label
        )}
      </div>
      <div className={styles.infoboxValue}>
        {type === "select" ? (
          <select
            className={styles.cleanInput}
            value={value || ""}
            onChange={(e) => onSave?.(e.target.value)}
          >
            <option value="">- 선택 -</option>
            {options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <BufferedInput
            className={styles.cleanInput}
            value={value || ""}
            placeholder={placeholder || "-"}
            onSave={onSave || (() => {})}
          />
        )}
      </div>
    </div>
  );
}

export function Infobox({
  title,
  image, // Placeholder for future
  rows,
  onAddField,
}: {
  title: string;
  image?: React.ReactNode;
  rows: InfoboxRowProps[];
  onAddField: () => void;
}) {
  return (
    <div className={styles.infobox}>
      <div className={styles.infoboxHeader}>{title}</div>
      {image && <div className={styles.infoboxImage}>{image}</div>}

      <div className={styles.infoboxBody}>
        {rows.map((row) => (
            <InfoboxRow key={row.label + (row.isCustom ? 'cust' : 'fixed')} {...row} />
        ))}
      </div>

       <button type="button" className={styles.addFieldBtn} onClick={onAddField}>
        <Plus size={12} />
        <span>필드 추가</span>
      </button>
    </div>
  );
}
