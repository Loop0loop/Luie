import styles from '../../styles/components/SettingsModal.module.css';
import { X } from 'lucide-react';
import { useEditorStore, EditorTheme, FontFamily } from '../../stores/editorStore';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { 
    theme, fontFamily, fontSize, lineHeight,
    updateSettings 
  } = useEditorStore();

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>환경 설정 (Settings)</div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <div className={styles.content}>
          {/* THEME SECTION */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>테마 (Theme)</div>
            <div className={styles.row}>
              {(['light', 'sepia', 'dark'] as EditorTheme[]).map(t => (
                <button
                  key={t}
                  className={theme === t ? styles.optionActive : styles.optionButton}
                  onClick={() => updateSettings({ theme: t })}
                >
                  {t === 'light' ? '라이트' : t === 'sepia' ? '세피아' : '다크'}
                </button>
              ))}
            </div>
          </div>

          {/* FONT FAMILY */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>글꼴 (Font)</div>
            <div className={styles.row}>
              {(['serif', 'sans', 'mono'] as FontFamily[]).map(f => (
                <button
                  key={f}
                  className={fontFamily === f ? styles.optionActive : styles.optionButton}
                  onClick={() => updateSettings({ fontFamily: f })}
                >
                  {f === 'serif' ? '명조' : f === 'sans' ? '고딕' : '모노'}
                </button>
              ))}
            </div>
          </div>

          {/* FONT SIZE */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>글자 크기: {fontSize}px</div>
            <input 
              type="range" 
              min="12" max="24" step="1" 
              value={fontSize}
              className={styles.rangeInput}
              onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
            />
          </div>

          {/* LINE HEIGHT */}
          <div className={styles.section}>
             <div className={styles.sectionLabel}>줄 간격: {lineHeight}</div>
             <input 
              type="range" 
              min="1.2" max="2.4" step="0.1" 
              value={lineHeight}
              className={styles.rangeInput}
              onChange={(e) => updateSettings({ lineHeight: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
