import { useMemo, useState } from "react";
import styles from "../../styles/components/SettingsModal.module.css";
import { X, Check, Download } from "lucide-react";
import type { EditorTheme, FontPreset } from "../../stores/editorStore";
import { useEditorStore } from "../../stores/editorStore";
import {
  EDITOR_FONT_FAMILIES,
  ICON_SIZE_SM,
  ICON_SIZE_XL,
  ICON_SIZE_XS,
  STORAGE_KEY_FONTS_INSTALLED,
} from "../../../../shared/constants";

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { theme, fontFamily, fontPreset, fontSize, lineHeight, updateSettings } =
    useEditorStore();

  const OPTIONAL_FONTS: Array<{
    id: FontPreset;
    label: string;
    family: string;
    stack: string;
    pkg: string;
  }> = useMemo(
    () => [
      {
        id: "lora",
        label: "Lora (Serif)",
        family: "Lora Variable",
        stack: '"Lora Variable", "Lora", var(--font-serif)',
        pkg: "lora",
      },
      {
        id: "bitter",
        label: "Bitter (Serif)",
        family: "Bitter Variable",
        stack: '"Bitter Variable", "Bitter", var(--font-serif)',
        pkg: "bitter",
      },
      {
        id: "source-serif",
        label: "Source Serif 4",
        family: "Source Serif 4 Variable",
        stack: '"Source Serif 4 Variable", "Source Serif 4", var(--font-serif)',
        pkg: "source-serif-4",
      },
      {
        id: "montserrat",
        label: "Montserrat (Sans)",
        family: "Montserrat Variable",
        stack: '"Montserrat Variable", "Montserrat", var(--font-sans)',
        pkg: "montserrat",
      },
      {
        id: "nunito-sans",
        label: "Nunito Sans",
        family: "Nunito Sans Variable",
        stack: '"Nunito Sans Variable", "Nunito Sans", var(--font-sans)',
        pkg: "nunito-sans",
      },
      {
        id: "victor-mono",
        label: "Victor Mono",
        family: "Victor Mono Variable",
        stack: '"Victor Mono Variable", "Victor Mono", var(--font-mono)',
        pkg: "victor-mono",
      },
    ],
    [],
  );

  const [installing, setInstalling] = useState<Record<string, boolean>>({});
  const [installed, setInstalled] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_FONTS_INSTALLED);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  const persistInstalled = (next: Record<string, boolean>) => {
    setInstalled(next);
    try {
      localStorage.setItem(STORAGE_KEY_FONTS_INSTALLED, JSON.stringify(next));
    } catch {
      // best-effort
    }
  };

  const ensureFontLoaded = async (pkg: string) => {
    const id = `fontsource-variable-${pkg}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://cdn.jsdelivr.net/npm/@fontsource-variable/${pkg}/index.css`;
    document.head.appendChild(link);
  };

  const handleInstall = async (preset: FontPreset, pkg: string) => {
    setInstalling((prev) => ({ ...prev, [preset]: true }));
    try {
      await ensureFontLoaded(pkg);
      persistInstalled({ ...installed, [preset]: true });
    } finally {
      setInstalling((prev) => ({ ...prev, [preset]: false }));
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.title}>화면 설정</div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={ICON_SIZE_XL} />
          </button>
        </div>

        {/* CONTENT - Single Column, Scrollable */}
        <div className={styles.content}>
          {/* FONT FAMILY */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>글꼴 (Font)</div>
            <div className={styles.fontGrid}>
              {EDITOR_FONT_FAMILIES.map((f) => (
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

          <div className={styles.section}>
            <div className={styles.sectionLabel}>옵션 폰트 (선택 설치)</div>
            <div className={styles.optionalFontList}>
              {OPTIONAL_FONTS.map((font) => {
                const isInstalled = installed[font.id];
                const isInstalling = installing[font.id];
                const isActive = fontPreset === font.id;

                return (
                  <div key={font.id} className={styles.optionalFontRow}>
                    <div className={styles.optionalFontInfo}>
                      <div
                        className={styles.optionalFontPreview}
                        style={{ fontFamily: font.stack }}
                      >
                        Ag
                      </div>
                      <div className={styles.optionalFontMeta}>
                        <div className={styles.optionalFontName}>{font.label}</div>
                        <div className={styles.optionalFontFamily}>{font.family}</div>
                      </div>
                    </div>
                    <div className={styles.optionalFontActions}>
                      {!isInstalled ? (
                        <button
                          className={styles.installButton}
                          onClick={() => handleInstall(font.id, font.pkg)}
                          disabled={isInstalling}
                        >
                          <Download size={ICON_SIZE_SM} />
                          {isInstalling ? "설치 중" : "설치"}
                        </button>
                      ) : isActive ? (
                        <div className={styles.activeBadge}>사용 중</div>
                      ) : (
                        <button
                          className={styles.applyButton}
                          onClick={() => updateSettings({ fontPreset: font.id })}
                        >
                          적용
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className={styles.helperText}>
              설치된 폰트만 적용됩니다. 설치하지 않으면 기본 폰트로 자동 폴백됩니다.
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
                      <Check size={ICON_SIZE_XS} />
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
