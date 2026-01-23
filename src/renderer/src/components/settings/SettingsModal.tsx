import { useMemo, useState } from "react";
import styles from "../../styles/components/SettingsModal.module.css";
import { X, Check, Download } from "lucide-react";
import type { EditorTheme, FontPreset } from "../../stores/editorStore";
import { useEditorStore } from "../../stores/editorStore";
import {
  EDITOR_FONT_FAMILIES,
  SETTINGS_ACTION_APPLY,
  SETTINGS_ACTION_INSTALL,
  SETTINGS_ACTION_INSTALLING,
  SETTINGS_BADGE_ACTIVE,
  SETTINGS_FONT_HELPER_PRIMARY,
  SETTINGS_FONT_HELPER_SECONDARY,
  SETTINGS_FONT_MONO_LABEL,
  SETTINGS_FONT_SANS_LABEL,
  SETTINGS_FONT_SERIF_LABEL,
  SETTINGS_OPTIONAL_FONT_LABEL_BITTER,
  SETTINGS_OPTIONAL_FONT_LABEL_LORA,
  SETTINGS_OPTIONAL_FONT_LABEL_MONTSERRAT,
  SETTINGS_OPTIONAL_FONT_LABEL_NUNITO_SANS,
  SETTINGS_OPTIONAL_FONT_LABEL_SOURCE_SERIF,
  SETTINGS_OPTIONAL_FONT_LABEL_VICTOR_MONO,
  SETTINGS_OPTIONAL_HELPER,
  SETTINGS_SAMPLE_TEXT,
  SETTINGS_SECTION_FONT,
  SETTINGS_SECTION_FONT_SIZE,
  SETTINGS_SECTION_LINE_HEIGHT,
  SETTINGS_SECTION_OPTIONAL_FONTS,
  SETTINGS_SECTION_THEME,
  SETTINGS_THEME_DARK,
  SETTINGS_THEME_LIGHT,
  SETTINGS_THEME_SEPIA,
  SETTINGS_TITLE_DISPLAY,
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
        label: SETTINGS_OPTIONAL_FONT_LABEL_LORA,
        family: "Lora Variable",
        stack: '"Lora Variable", "Lora", var(--font-serif)',
        pkg: "lora",
      },
      {
        id: "bitter",
        label: SETTINGS_OPTIONAL_FONT_LABEL_BITTER,
        family: "Bitter Variable",
        stack: '"Bitter Variable", "Bitter", var(--font-serif)',
        pkg: "bitter",
      },
      {
        id: "source-serif",
        label: SETTINGS_OPTIONAL_FONT_LABEL_SOURCE_SERIF,
        family: "Source Serif 4 Variable",
        stack: '"Source Serif 4 Variable", "Source Serif 4", var(--font-serif)',
        pkg: "source-serif-4",
      },
      {
        id: "montserrat",
        label: SETTINGS_OPTIONAL_FONT_LABEL_MONTSERRAT,
        family: "Montserrat Variable",
        stack: '"Montserrat Variable", "Montserrat", var(--font-sans)',
        pkg: "montserrat",
      },
      {
        id: "nunito-sans",
        label: SETTINGS_OPTIONAL_FONT_LABEL_NUNITO_SANS,
        family: "Nunito Sans Variable",
        stack: '"Nunito Sans Variable", "Nunito Sans", var(--font-sans)',
        pkg: "nunito-sans",
      },
      {
        id: "victor-mono",
        label: SETTINGS_OPTIONAL_FONT_LABEL_VICTOR_MONO,
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
          <div className={styles.title}>{SETTINGS_TITLE_DISPLAY}</div>
          <button className={styles.closeButton} onClick={onClose}>
            <X className="icon-xl" />
          </button>
        </div>

        {/* CONTENT - Single Column, Scrollable */}
        <div className={styles.content}>
          {/* FONT FAMILY */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>{SETTINGS_SECTION_FONT}</div>
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
                    {SETTINGS_SAMPLE_TEXT}
                  </div>
                  <div className={styles.fontName}>
                    {f === "serif"
                      ? SETTINGS_FONT_SERIF_LABEL
                      : f === "sans"
                        ? SETTINGS_FONT_SANS_LABEL
                        : SETTINGS_FONT_MONO_LABEL}
                  </div>
                </button>
              ))}
            </div>
            <div className={styles.helperText}>
              {SETTINGS_FONT_HELPER_PRIMARY}
            </div>
            <div className={styles.helperText}>
              {SETTINGS_FONT_HELPER_SECONDARY}
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.section}>
            <div className={styles.sectionLabel}>{SETTINGS_SECTION_OPTIONAL_FONTS}</div>
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
                        {SETTINGS_SAMPLE_TEXT}
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
                          <Download className="icon-sm" />
                          {isInstalling ? SETTINGS_ACTION_INSTALLING : SETTINGS_ACTION_INSTALL}
                        </button>
                      ) : isActive ? (
                        <div className={styles.activeBadge}>{SETTINGS_BADGE_ACTIVE}</div>
                      ) : (
                        <button
                          className={styles.applyButton}
                          onClick={() => updateSettings({ fontPreset: font.id })}
                        >
                          {SETTINGS_ACTION_APPLY}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className={styles.helperText}>
              {SETTINGS_OPTIONAL_HELPER}
            </div>
          </div>

          <div className={styles.divider} />

          {/* FONT SIZE & LINE HEIGHT */}
          <div className={styles.section}>
            <div className={styles.row}>
              <div className={styles.labelGroup}>
                <div className={styles.sectionLabel}>{SETTINGS_SECTION_FONT_SIZE}</div>
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
                <div className={styles.sectionLabel}>{SETTINGS_SECTION_LINE_HEIGHT}</div>
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
            <div className={styles.sectionLabel}>{SETTINGS_SECTION_THEME}</div>
            <div className={styles.themeGrid}>
              {(["light", "sepia", "dark"] as EditorTheme[]).map((t) => (
                <button
                  key={t}
                  className={`${styles.themeCard} ${t} ${theme === t ? styles.active : ""}`}
                  onClick={() => updateSettings({ theme: t })}
                >
                  {theme === t && (
                    <div className={styles.checkBadge}>
                      <Check className="icon-xs" />
                    </div>
                  )}
                  <div className={styles.themeName}>
                    {t === "light"
                      ? SETTINGS_THEME_LIGHT
                      : t === "sepia"
                        ? SETTINGS_THEME_SEPIA
                        : SETTINGS_THEME_DARK}
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
