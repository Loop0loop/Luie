import { useState } from 'react';
import styles from '../../styles/components/SettingsModal.module.css';
import { X, Check } from 'lucide-react';
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
        
        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.title}>화면 설정</div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* CONTENT - Single Column, Scrollable */}
        <div className={styles.content}>
          
          {/* FONT FAMILY */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>글꼴 (Font)</div>
            <div className={styles.fontGrid}>
              {(['serif', 'sans', 'mono'] as FontFamily[]).map(f => (
                <button
                  key={f}
                  className={`${styles.fontCard} ${fontFamily === f ? styles.active : ''}`}
                  onClick={() => updateSettings({ fontFamily: f })}
                >
                  <div className={styles.fontPreview} style={{ fontFamily: f === 'serif' ? 'Merriweather, serif' : f === 'sans' ? 'Inter, sans-serif' : 'JetBrains Mono, monospace' }}>
                    Ag
                  </div>
                  <div className={styles.fontName}>
                    {f === 'serif' ? '명조체' : f === 'sans' ? '고딕체' : '모노'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.divider} />

          {/* FONT SIZE & LINE HEIGHT */}
          <div className={styles.section}>
            <div className={styles.row}>
              <div className={styles.labelGroup}>
                <div className={styles.sectionLabel}>글자 크기</div>
                <div className={styles.valueDisplay}>{fontSize}px</div>
              </div>
              <input 
                type="range" min="14" max="32" step="1" 
                value={fontSize}
                className={styles.slider}
                onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
              />
            </div>
            
            <div style={{ height: 24 }} />

            <div className={styles.row}>
               <div className={styles.labelGroup}>
                <div className={styles.sectionLabel}>줄 간격</div>
                <div className={styles.valueDisplay}>{lineHeight}</div>
              </div>
              <input 
                type="range" min="1.4" max="2.4" step="0.1" 
                value={lineHeight}
                className={styles.slider}
                onChange={(e) => updateSettings({ lineHeight: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className={styles.divider} />

          {/* THEME */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>테마 (Theme)</div>
            <div className={styles.themeGrid}>
              {(['light', 'sepia', 'dark'] as EditorTheme[]).map(t => (
                <button
                  key={t}
                  className={`${styles.themeCard} ${t} ${theme === t ? styles.active : ''}`}
                  onClick={() => updateSettings({ theme: t })}
                >
                  {theme === t && <div className={styles.checkBadge}><Check size={12}/></div>}
                  <div className={styles.themeName}>
                    {t === 'light' ? 'Light' : t === 'sepia' ? 'Sepia' : 'Dark'}
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
