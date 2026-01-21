import styles from "../../styles/components/SettingsModal.module.css";
import { X, Check } from "lucide-react";
import type {
  EditorTheme,
  FontFamily} from "../../stores/editorStore";
import {
  useEditorStore
} from "../../stores/editorStore";

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { theme, fontFamily, fontSize, lineHeight, updateSettings } =
    useEditorStore();

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
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
              {(["serif", "sans", "mono"] as FontFamily[]).map((f) => (
                <button
                  key={f}
                  className={`${styles.fontCard} ${fontFamily === f ? styles.active : ""}`}
                  onClick={() => updateSettings({ fontFamily: f })}
                >
                  <div
                    className={styles.fontPreview}
                    style={{
                      fontFamily:
                        f === "serif"
                          ? "var(--font-serif)"
                          : f === "sans"
                            ? "var(--font-sans)"
                            : "var(--font-mono)",
                    }}
                  >
                    Ag
                  </div>
                  <div className={styles.fontName}>
                    {f === "serif"
                      ? "명조체"
                      : f === "sans"
                        ? "고딕체 (Inter + Noto Sans KR/JP)"
                        : "모노"}
                  </div>
                </button>
              ))}
            </div>
            <div className={styles.helperText}>
              기본 내장: Inter Variable + Noto Sans KR/JP (다국어 기본 폴백)
            </div>
            <div className={styles.helperText}>
              추가 폰트는 설정에서 선택 시 설치하도록 설계할 예정입니다.
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
                type="range"
                min="14"
                max="32"
                step="1"
                value={fontSize}
                className={styles.slider}
                onChange={(e) =>
                  updateSettings({ fontSize: Number(e.target.value) })
                }
              />
            </div>

            <div style={{ height: 24 }} />

            <div className={styles.row}>
              <div className={styles.labelGroup}>
                <div className={styles.sectionLabel}>줄 간격</div>
                <div className={styles.valueDisplay}>{lineHeight}</div>
              </div>
              <input
                type="range"
                min="1.4"
                max="2.4"
                step="0.1"
                value={lineHeight}
                className={styles.slider}
                onChange={(e) =>
                  updateSettings({ lineHeight: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <div className={styles.divider} />

          {/* THEME */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>테마 (Theme)</div>
            <div className={styles.themeGrid}>
              {(["light", "sepia", "dark"] as EditorTheme[]).map((t) => (
                <button
                  key={t}
                  className={`${styles.themeCard} ${t} ${theme === t ? styles.active : ""}`}
                  onClick={() => updateSettings({ theme: t })}
                >
                  {theme === t && (
                    <div className={styles.checkBadge}>
                      <Check size={12} />
                    </div>
                  )}
                  <div className={styles.themeName}>
                    {t === "light" ? "Light" : t === "sepia" ? "Sepia" : "Dark"}
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
