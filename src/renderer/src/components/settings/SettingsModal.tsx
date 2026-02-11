import { memo, useMemo, useState, useEffect, useTransition } from "react";
import { X, Check, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Virtuoso } from "react-virtuoso";
import type { EditorTheme, FontPreset } from "../../stores/editorStore";
import { useEditorStore } from "../../stores/editorStore";
import { useShortcutStore } from "../../stores/shortcutStore";
import type { ShortcutMap } from "../../../../shared/types";
import {
  EDITOR_FONT_FAMILIES,
  SHORTCUT_ACTIONS,
  STORAGE_KEY_FONTS_INSTALLED,
} from "../../../../shared/constants";
import { setLanguage, type SupportedLanguage } from "../../i18n";

interface SettingsModalProps {
  onClose: () => void;
}

const ShortcutRow = memo(function ShortcutRow({
  label,
  value,
  placeholder,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className="grid grid-cols-[1fr,220px] gap-3 items-center border border-border rounded-[10px] bg-surface px-3 py-2">
      <div className="text-sm text-fg font-medium">{label}</div>
      <input
        className="bg-transparent text-sm font-semibold border-b border-border hover:border-text-primary focus:outline-none transition-colors py-1"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </div>
  );
});

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const theme = useEditorStore((state) => state.theme);
  const fontFamily = useEditorStore((state) => state.fontFamily);
  const fontPreset = useEditorStore((state) => state.fontPreset);
  const fontSize = useEditorStore((state) => state.fontSize);
  const lineHeight = useEditorStore((state) => state.lineHeight);
  const updateSettings = useEditorStore((state) => state.updateSettings);
  const { t, i18n } = useTranslation();

  const [isPending, startTransition] = useTransition();
  const applySettings = (next: Partial<{ theme: EditorTheme; fontFamily: "serif" | "sans" | "mono"; fontPreset?: FontPreset; fontSize: number; lineHeight: number }>) => {
    startTransition(() => {
      updateSettings(next);
    });
  };

  const handleLanguageChange = async (next: SupportedLanguage) => {
    setLanguageState(next);
    await setLanguage(next);
  };

  const handleShortcutChange = (actionId: string, value: string) => {
    setShortcutDrafts((prev) => ({ ...prev, [actionId]: value }));
  };

  const commitShortcuts = async () => {
    if (Object.keys(shortcutDrafts).length === 0) return;
    await setShortcuts(shortcutDrafts as ShortcutMap);
  };

  const runRecovery = async (dryRun: boolean) => {
    setIsRecovering(true);
    setRecoveryMessage(null);
    setRecoveryDetails(null);
    try {
      const response = await window.api.recovery.runDb({ dryRun });
      if (response.success && response.data) {
        const result = response.data as {
          success: boolean;
          message: string;
          backupDir?: string;
        };
        setRecoveryMessage(result.message);
        if (result.backupDir) {
          setRecoveryDetails(`Backup: ${result.backupDir}`);
        }
      } else {
        setRecoveryMessage(response.error?.message ?? "Recovery failed");
      }
    } catch (error) {
      setRecoveryMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRecovering(false);
    }
  };

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
        label: t("settings.optionalFonts.lora"),
        family: "Lora Variable",
        stack: '"Lora Variable", "Lora", var(--font-serif)',
        pkg: "lora",
      },
      {
        id: "bitter",
        label: t("settings.optionalFonts.bitter"),
        family: "Bitter Variable",
        stack: '"Bitter Variable", "Bitter", var(--font-serif)',
        pkg: "bitter",
      },
      {
        id: "source-serif",
        label: t("settings.optionalFonts.sourceSerif"),
        family: "Source Serif 4 Variable",
        stack: '"Source Serif 4 Variable", "Source Serif 4", var(--font-serif)',
        pkg: "source-serif-4",
      },
      {
        id: "montserrat",
        label: t("settings.optionalFonts.montserrat"),
        family: "Montserrat Variable",
        stack: '"Montserrat Variable", "Montserrat", var(--font-sans)',
        pkg: "montserrat",
      },
      {
        id: "nunito-sans",
        label: t("settings.optionalFonts.nunitoSans"),
        family: "Nunito Sans Variable",
        stack: '"Nunito Sans Variable", "Nunito Sans", var(--font-sans)',
        pkg: "nunito-sans",
      },
      {
        id: "victor-mono",
        label: t("settings.optionalFonts.victorMono"),
        family: "Victor Mono Variable",
        stack: '"Victor Mono Variable", "Victor Mono", var(--font-mono)',
        pkg: "victor-mono",
      },
    ],
    [t],
  );

  const [installing, setInstalling] = useState<Record<string, boolean>>({});
  const [language, setLanguageState] = useState<SupportedLanguage>(
    (i18n.language as SupportedLanguage) || "ko",
  );
  const shortcuts = useShortcutStore((state) => state.shortcuts);
  const shortcutDefaults = useShortcutStore((state) => state.defaults);
  const shortcutsLoading = useShortcutStore((state) => state.isLoading);
  const loadShortcuts = useShortcutStore((state) => state.loadShortcuts);
  const setShortcuts = useShortcutStore((state) => state.setShortcuts);
  const resetToDefaults = useShortcutStore((state) => state.resetToDefaults);
  const [shortcutDrafts, setShortcutDrafts] = useState<Record<string, string>>({});
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [recoveryDetails, setRecoveryDetails] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
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

  useEffect(() => {
    const nextLanguage = (i18n.language as SupportedLanguage) || "ko";
    setLanguageState(nextLanguage);
  }, [i18n.language]);

  useEffect(() => {
    if (activeTab !== "shortcuts") return;
    const hasShortcuts = Object.keys(shortcuts ?? {}).length > 0;
    const hasDefaults = Object.keys(shortcutDefaults ?? {}).length > 0;
    if (!hasShortcuts || !hasDefaults) {
      void loadShortcuts();
    }
  }, [activeTab, loadShortcuts, shortcutDefaults, shortcuts]);

  useEffect(() => {
    setShortcutDrafts(shortcuts as Record<string, string>);
  }, [shortcuts]);

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

  const [activeTab, setActiveTab] = useState("editor");

  const sidebarItems = useMemo(
    () => [
      { id: "editor", label: t("settings.sidebar.editor") },
      { id: "appearance", label: t("settings.sidebar.appearance") },
      { id: "features", label: t("settings.sidebar.features") },
      { id: "shortcuts", label: t("settings.sidebar.shortcuts") },
      { id: "recovery", label: t("settings.sidebar.recovery") },
      { id: "sync", label: t("settings.sidebar.sync") },
      { id: "language", label: t("settings.sidebar.language") },
    ],
    [t],
  );

  const shortcutItems = useMemo(
    () =>
      SHORTCUT_ACTIONS.map((action) => ({
        id: action.id,
        label: t(action.labelKey),
        value: shortcutDrafts[action.id] ?? shortcutDefaults[action.id] ?? "",
        placeholder: shortcutDefaults[action.id] ?? "",
      })),
    [shortcutDefaults, shortcutDrafts, t],
  );

  // Local state for performance (avoid re-rendering entire app on every slider move)
  const [localFontSize, setLocalFontSize] = useState(fontSize);
  const [localLineHeight, setLocalLineHeight] = useState(lineHeight);

  // Sync local state if global changes (e.g. reset)
  useEffect(() => {
    setLocalFontSize(fontSize);
  }, [fontSize]);

  useEffect(() => {
    setLocalLineHeight(lineHeight);
  }, [lineHeight]);

  return (
    <div 
      className="fixed inset-0 w-screen h-screen bg-black/60 flex items-center justify-center z-1000 backdrop-blur-sm animate-in fade-in duration-200" 
      onClick={onClose}
    >
      <div 
        className="w-240 h-160 bg-surface border border-white/10 rounded-xl shadow-2xl flex overflow-hidden max-h-[95vh] animate-in slide-in-from-bottom-5 duration-200 relative will-change-[transform,opacity]" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER is removed, using sidebar layout instead */}
        <div className="flex w-full h-full">
          {/* SIDEBAR */}
          <div className="w-65 bg-sidebar border-r border-border flex flex-col pt-3">
            <div className="p-6 pb-4">
              <div className="text-lg font-bold text-fg">{t("settings.title")}</div>
            </div>
            <div className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
              {sidebarItems.map((item) => (
                <div
                  key={item.id}
                  className={`
                    px-4 py-3 text-sm rounded-md cursor-pointer transition-all font-medium
                    ${activeTab === item.id ? "bg-active text-fg font-semibold" : "text-muted hover:bg-active hover:text-fg"}
                  `}
                  onClick={() => {
                    startTransition(() => setActiveTab(item.id));
                  }}
                >
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div
            className="flex-1 flex flex-col bg-surface relative overflow-hidden"
            aria-busy={isPending}
          >
            <button 
              className="absolute top-5 right-5 bg-transparent border-none cursor-pointer text-subtle p-2 rounded-full z-10 transition-all flex items-center justify-center hover:bg-active hover:text-fg" 
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </button>
            
            {activeTab === "editor" && (
              <div className="flex-1 px-15 py-12 overflow-y-auto flex flex-col gap-8">
                {/* FONT FAMILY */}
                <div className="flex flex-col gap-3">
                  <div className="text-[13px] font-semibold text-muted uppercase tracking-[0.5px] mb-1">{t("settings.section.font")}</div>
                  <div className="grid grid-cols-3 gap-3">
                    {EDITOR_FONT_FAMILIES.map((f) => (
                      <button
                        key={f}
                        className={`
                          border rounded-xl bg-surface px-2 py-4 cursor-pointer transition-all flex flex-col items-center gap-2
                          ${fontFamily === f 
                            ? "border-accent bg-surface-hover shadow-sm" 
                            : "border-border hover:border-active hover:-translate-y-px"}
                        `}
                        onClick={() => applySettings({ fontFamily: f })}
                      >
                        <div
                          className="text-[28px] text-fg leading-none"
                          style={{
                            fontFamily:
                              f === "serif"
                                ? "var(--font-serif)"
                                : f === "sans"
                                  ? "var(--font-sans)"
                                  : "var(--font-mono)",
                          }}
                        >
                          {t("settings.sampleText")}
                        </div>
                        <div className="text-xs text-muted font-medium">
                          {f === "serif"
                            ? t("settings.font.serif")
                            : f === "sans"
                              ? t("settings.font.sans")
                              : t("settings.font.mono")}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-subtle leading-[1.4]">
                    {t("settings.font.helper.primary")}
                  </div>
                </div>

                <div className="h-px bg-border w-full" />

                {/* OPTIONAL FONTS */}
                <div className="flex flex-col gap-3">
                  <div className="text-[13px] font-semibold text-muted uppercase tracking-[0.5px] mb-1">{t("settings.section.optionalFonts")}</div>
                  <div className="flex flex-col gap-2.5">
                    {OPTIONAL_FONTS.map((font) => {
                      const isInstalled = installed[font.id];
                      const isInstalling = installing[font.id];
                      const isActive = fontPreset === font.id;

                      return (
                        <div key={font.id} className="flex items-center justify-between px-3 py-2.5 border border-border rounded-[10px] bg-surface">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10.5 h-10.5 rounded-lg border border-border flex items-center justify-center text-lg text-fg bg-surface-hover"
                              style={{ fontFamily: font.stack }}
                            >
                              {t("settings.sampleText")}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <div className="text-[13px] font-semibold text-fg">{font.label}</div>
                              <div className="text-[11px] text-subtle">{font.family}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isInstalled ? (
                              <button
                                className="rounded-lg px-2.5 py-1.5 text-xs border border-border bg-surface text-fg cursor-pointer inline-flex items-center gap-1.5 hover:border-active hover:bg-surface-hover disabled:opacity-60 disabled:cursor-not-allowed"
                                onClick={() => handleInstall(font.id, font.pkg)}
                                disabled={isInstalling}
                              >
                                <Download className="w-3.5 h-3.5" />
                                {isInstalling
                                  ? t("settings.optionalFonts.action.installing")
                                  : t("settings.optionalFonts.action.install")}
                              </button>
                            ) : isActive ? (
                              <div className="text-xs px-2 py-1 rounded-full text-accent-fg bg-accent">{t("settings.optionalFonts.action.active")}</div>
                            ) : (
                              <button
                                className="rounded-lg px-2.5 py-1.5 text-xs border border-border bg-surface text-fg cursor-pointer inline-flex items-center gap-1.5 hover:border-active hover:bg-surface-hover"
                                onClick={() => applySettings({ fontPreset: font.id })}
                              >
                                {t("settings.optionalFonts.action.apply")}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="h-px bg-border w-full" />

                {/* FONT SIZE & LINE HEIGHT */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <div className="text-[13px] font-semibold text-muted uppercase tracking-[0.5px] mb-1">{t("settings.section.fontSize")}</div>
                      <div className="text-sm font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded">{localFontSize}px</div>
                    </div>
                    <input
                      type="range"
                      min="14"
                      max="32"
                      step="1"
                      value={localFontSize}
                      className="w-full h-1 bg-border rounded-sm appearance-none outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb:hover]:scale-110"
                      onChange={(e) => setLocalFontSize(Number(e.target.value))}
                      onMouseUp={() => applySettings({ fontSize: localFontSize })}
                      onTouchEnd={() => applySettings({ fontSize: localFontSize })}
                    />
                  </div>

                  <div style={{ height: 24 }} />

                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <div className="text-[13px] font-semibold text-muted uppercase tracking-[0.5px] mb-1">{t("settings.section.lineHeight")}</div>
                      <div className="text-sm font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded">{localLineHeight}</div>
                    </div>
                    <input
                      type="range"
                      min="1.4"
                      max="2.4"
                      step="0.1"
                      value={localLineHeight}
                      className="w-full h-1 bg-border rounded-sm appearance-none outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb:hover]:scale-110"
                      onChange={(e) => setLocalLineHeight(Number(e.target.value))}
                      onMouseUp={() => applySettings({ lineHeight: localLineHeight })}
                      onTouchEnd={() => applySettings({ lineHeight: localLineHeight })}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="flex-1 px-15 py-12 overflow-y-auto flex flex-col gap-8">
                <div className="flex flex-col gap-3">
                  <div className="text-[13px] font-semibold text-muted uppercase tracking-[0.5px] mb-1">{t("settings.section.theme")}</div>
                  <div className="grid grid-cols-3 gap-3">
                    {(["light", "sepia", "dark"] as EditorTheme[]).map((themeOption) => (
                      <button
                        key={themeOption}
                        className={`
                          h-20 rounded-xl border-2 cursor-pointer relative flex items-center justify-center text-sm font-semibold transition-all hover:scale-[1.02]
                          ${themeOption === "light" ? "bg-white border-zinc-200 text-zinc-800" : ""}
                          ${themeOption === "sepia" ? "bg-[#fbf0d9] border-[#f0e6d2] text-[#5f4b32]" : ""}
                          ${themeOption === "dark" ? "bg-[#222] border-[#333] text-[#eee]" : ""}
                          ${theme === themeOption ? "border-accent!" : ""}
                        `}
                        onClick={() => applySettings({ theme: themeOption })}
                      >
                        {theme === themeOption && (
                          <div className="absolute top-1.5 right-1.5 bg-accent text-accent-fg w-4.5 h-4.5 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        <div className="themeName">
                          {themeOption === "light"
                            ? t("settings.theme.light")
                            : themeOption === "sepia"
                              ? t("settings.theme.sepia")
                              : t("settings.theme.dark")}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "shortcuts" && (
              <div className="flex-1 px-15 py-12 overflow-y-auto flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-semibold text-muted uppercase tracking-[0.5px]">{t("settings.shortcuts.title")}</div>
                  <button
                    className="text-xs font-semibold tracking-wide px-3 py-1 rounded-full border border-border text-text-secondary hover:text-text-primary hover:border-text-primary transition-colors disabled:opacity-50"
                    onClick={() => void resetToDefaults()}
                    disabled={shortcutsLoading}
                  >
                    {t("settings.shortcuts.reset")}
                  </button>
                </div>

                <div className="grid grid-cols-[1fr,220px] gap-3 text-xs text-muted uppercase tracking-[0.5px]">
                  <div>{t("settings.shortcuts.action")}</div>
                  <div>{t("settings.shortcuts.key")}</div>
                </div>

                <div className="flex-1 min-h-0">
                  <Virtuoso
                    className="h-full"
                    data={shortcutItems}
                    itemContent={(_index, item) => (
                      <ShortcutRow
                        label={item.label}
                        value={item.value}
                        placeholder={item.placeholder}
                        onChange={(value) => handleShortcutChange(item.id, value)}
                        onBlur={() => void commitShortcuts()}
                      />
                    )}
                  />
                </div>
              </div>
            )}

            {activeTab === "recovery" && (
              <div className="flex-1 px-15 py-12 overflow-y-auto flex flex-col gap-6">
                <div className="text-[13px] font-semibold text-muted uppercase tracking-[0.5px]">{t("settings.recovery.title")}</div>
                <div className="text-sm text-subtle leading-[1.6]">
                  {t("settings.recovery.description")}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    className="text-xs font-semibold tracking-wide px-3 py-1 rounded-full border border-border text-text-secondary hover:text-text-primary hover:border-text-primary transition-colors disabled:opacity-50"
                    onClick={() => void runRecovery(true)}
                    disabled={isRecovering}
                  >
                    {t("settings.recovery.dryRun")}
                  </button>
                  <button
                    className="text-xs font-semibold tracking-wide px-3 py-1 rounded-full border border-border text-text-secondary hover:text-text-primary hover:border-text-primary transition-colors disabled:opacity-50"
                    onClick={() => void runRecovery(false)}
                    disabled={isRecovering}
                  >
                    {isRecovering ? t("settings.recovery.running") : t("settings.recovery.run")}
                  </button>
                </div>
                {recoveryMessage && (
                  <div className="text-sm text-fg">
                    {recoveryMessage}
                    {recoveryDetails && (
                      <div className="text-xs text-subtle mt-2">{recoveryDetails}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "language" && (
              <div className="flex-1 px-15 py-12 overflow-y-auto flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <div className="text-[13px] font-semibold text-muted uppercase tracking-[0.5px] mb-1">{t("settings.section.language")}</div>
                  <div className="flex items-center gap-3">
                    <select
                      className="bg-transparent text-sm font-semibold border-b border-border hover:border-text-primary cursor-pointer focus:outline-none transition-colors py-1"
                      value={language}
                      onChange={(e) => void handleLanguageChange(e.target.value as SupportedLanguage)}
                    >
                      <option value="ko">{t("settings.language.options.ko")}</option>
                      <option value="en">{t("settings.language.options.en")}</option>
                      <option value="ja">{t("settings.language.options.ja")}</option>
                    </select>
                  </div>
                  <div className="text-xs text-subtle leading-[1.4]">
                    {t("settings.language.helper")}
                  </div>
                </div>
              </div>
            )}

            {activeTab !== "editor" && activeTab !== "appearance" && activeTab !== "language" && activeTab !== "shortcuts" && activeTab !== "recovery" && (
              <div className="flex-1 flex items-center justify-center text-subtle text-sm">
                <div className="placeholderText">{t("settings.placeholder")}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
