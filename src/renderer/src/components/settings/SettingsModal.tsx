import { memo, useMemo, useState, useEffect, useTransition } from "react";
import { X, Check, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Virtuoso } from "react-virtuoso";
import type { FontPreset, EditorSettings } from "../../stores/editorStore";
import { useEditorStore } from "../../stores/editorStore";
import { useShortcutStore } from "../../stores/shortcutStore";
import type { ShortcutMap } from "../../../../shared/types";
import {
  EDITOR_FONT_FAMILIES,
} from "../../../../shared/constants/configs";
import {
  SHORTCUT_ACTIONS
} from "../../../../shared/constants/shortcuts";
import { setLanguage } from "../../i18n";

const STORAGE_KEY_FONTS_INSTALLED = "luie:fonts-installed";

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
  const { t, i18n } = useTranslation();

  const theme = useEditorStore((state) => state.theme);
  const themeTemp = useEditorStore((state) => state.themeTemp);
  const themeContrast = useEditorStore((state) => state.themeContrast);
  const fontSize = useEditorStore((state) => state.fontSize);
  const lineHeight = useEditorStore((state) => state.lineHeight);
  const fontFamily = useEditorStore((state) => state.fontFamily);
  const fontPreset = useEditorStore((state) => state.fontPreset);
  const updateSettings = useEditorStore((state) => state.updateSettings);

  const [activeTab, setActiveTab] = useState("appearance");
  const [localFontSize, setLocalFontSize] = useState(fontSize);
  const [localLineHeight, setLocalLineHeight] = useState(lineHeight);
  const [isPending, startTransition] = useTransition();

  // Sync local state if global changes
  useEffect(() => {
    setLocalFontSize(fontSize);
  }, [fontSize]);

  useEffect(() => {
    setLocalLineHeight(lineHeight);
  }, [lineHeight]);

  const applySettings = (next: Partial<EditorSettings>) => {
     updateSettings(next);
  };

  // Shortcuts logic
  const shortcuts = useShortcutStore((state) => state.shortcuts);
  const shortcutDefaults = useShortcutStore((state) => state.defaults);
  const loadShortcuts = useShortcutStore((state) => state.loadShortcuts);
  const setShortcuts = useShortcutStore((state) => state.setShortcuts);
  const resetToDefaults = useShortcutStore((state) => state.resetToDefaults);
  const [shortcutDrafts, setShortcutDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (activeTab === "shortcuts") {
        void loadShortcuts();
    }
  }, [activeTab, loadShortcuts]);

  useEffect(() => {
    setShortcutDrafts(shortcuts as Record<string, string>);
  }, [shortcuts]);

  const handleShortcutChange = (actionId: string, value: string) => {
    setShortcutDrafts((prev) => ({ ...prev, [actionId]: value }));
  };

  const commitShortcuts = async () => {
    if (Object.keys(shortcutDrafts).length === 0) return;
    await setShortcuts(shortcutDrafts as ShortcutMap);
  };

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

  // Recovery Logic
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const runRecovery = async (dryRun: boolean) => {
      setIsRecovering(true);
      setRecoveryMessage(null);
      try {
        const response = await window.api.recovery.runDb({ dryRun });
        setRecoveryMessage(response.success ? (response.data as { message?: string })?.message ?? "Success" : "Failed");
      } catch {
          setRecoveryMessage("Error during recovery");
      } finally {
          setIsRecovering(false);
      }
  };

  // Optional Fonts Logic
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


  const tabs = [
    { id: "editor", label: t("settings.sidebar.editor") },
    { id: "appearance", label: t("settings.sidebar.appearance") },
    { id: "shortcuts", label: t("settings.sidebar.shortcuts") },
    { id: "recovery", label: t("settings.sidebar.recovery") },
    { id: "language", label: t("settings.sidebar.language") },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-[900px] h-[650px] bg-bg-panel border border-border shadow-2xl rounded-xl flex overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-64 bg-bg-sidebar border-r border-border flex flex-col pt-3">
            <div className="p-6 pb-4">
                <h2 className="text-lg font-bold text-text-primary px-2">{t("settings.title")}</h2>
            </div>
            <nav className="flex-1 px-4 space-y-1">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            startTransition(() => setActiveTab(tab.id));
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === tab.id 
                            ? "bg-bg-active text-text-primary font-semibold" 
                            : "text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-bg-panel flex flex-col relative min-w-0" aria-busy={isPending}>
             <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-text-tertiary hover:text-text-primary hover:bg-bg-active rounded-lg transition-colors z-10"
             >
                <X className="w-5 h-5" />
             </button>

             <div className="flex-1 overflow-y-auto p-10">
                {activeTab === "appearance" && (
                    <div className="space-y-10 max-w-2xl">
                        {/* 1. Base Theme */}
                        <section className="space-y-4">
                            <div>
                                <h3 className="text-base font-semibold text-text-primary">테마 모드 (Base Theme)</h3>
                                <p className="text-sm text-text-secondary mt-1">기본적인 밝기를 선택합니다.</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {(["light", "sepia", "dark"] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => applySettings({ theme: mode })}
                                        className={`flex items-center justify-center px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                                            theme === mode 
                                            ? "border-accent text-accent bg-accent/5 ring-1 ring-accent"
                                            : "border-border text-text-secondary hover:border-text-tertiary hover:bg-bg-surface-hover"
                                        }`}
                                    >
                                        {mode === "light" && "Light (라이트)"}
                                        {mode === "sepia" && "Sepia (세피아)"}
                                        {mode === "dark" && "Dark (다크)"}
                                        {theme === mode && <Check className="w-4 h-4 ml-2" />}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <div className="h-px bg-border my-6" />

                        {/* 2. Atmosphere (Temperature) */}
                        <section className="space-y-4">
                            <div>
                                <h3 className="text-base font-semibold text-text-primary">분위기 (Atmosphere)</h3>
                                <p className="text-sm text-text-secondary mt-1">작업 목적에 맞는 색온도를 선택하세요.</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    onClick={() => applySettings({ themeTemp: "cool" })}
                                    className={`relative group flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                                        themeTemp === "cool" 
                                        ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500" 
                                        : "border-border hover:bg-bg-surface-hover"
                                    }`}
                                >
                                    <span className="text-sm font-semibold text-text-primary mb-1">차가움 (Cool)</span>
                                    <span className="text-xs text-text-secondary">집중 / 분석 / 이성적</span>
                                </button>

                                <button
                                    onClick={() => applySettings({ themeTemp: "neutral" })}
                                    className={`relative group flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                                        themeTemp === "neutral" 
                                        ? "border-text-secondary bg-text-secondary/5 ring-1 ring-text-secondary" 
                                        : "border-border hover:bg-bg-surface-hover"
                                    }`}
                                >
                                    <span className="text-sm font-semibold text-text-primary mb-1">중립 (Neutral)</span>
                                    <span className="text-xs text-text-secondary">기본 / 깔끔함</span>
                                </button>

                                <button
                                    onClick={() => applySettings({ themeTemp: "warm" })}
                                    className={`relative group flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                                        themeTemp === "warm" 
                                        ? "border-orange-500 bg-orange-500/5 ring-1 ring-orange-500" 
                                        : "border-border hover:bg-bg-surface-hover"
                                    }`}
                                >
                                    <span className="text-sm font-semibold text-text-primary mb-1">따뜻함 (Warm)</span>
                                    <span className="text-xs text-text-secondary">서사 / 감정 / 편안함</span>
                                </button>
                            </div>
                        </section>

                        <div className="h-px bg-border my-6" />

                        {/* 3. Contrast */}
                        <section className="space-y-4">
                            <div>
                                <h3 className="text-base font-semibold text-text-primary">대비 (Contrast)</h3>
                                <p className="text-sm text-text-secondary mt-1">화면의 선명도를 조절합니다.</p>
                            </div>
                             <div className="flex gap-3">
                                <button
                                     onClick={() => applySettings({ themeContrast: "soft" })}
                                     className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                         themeContrast === "soft"
                                         ? "bg-text-primary text-bg-app border-transparent"
                                         : "border-border text-text-secondary hover:text-text-primary"
                                     }`}
                                >
                                    부드럽게 (Soft)
                                </button>
                                <button
                                     onClick={() => applySettings({ themeContrast: "high" })}
                                     className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                         themeContrast === "high"
                                         ? "bg-text-primary text-bg-app border-transparent"
                                         : "border-border text-text-secondary hover:text-text-primary"
                                     }`}
                                >
                                    선명하게 (High)
                                </button>
                             </div>
                        </section>
                    </div>
                )}

                {activeTab === "editor" && (
                     <div className="space-y-8 max-w-2xl">
                        <section className="space-y-4">
                            <h3 className="text-base font-semibold text-text-primary">{t("settings.section.font")}</h3>
                             <div className="grid grid-cols-3 gap-3">
                                {EDITOR_FONT_FAMILIES.map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => applySettings({ fontFamily: f })}
                                        className={`p-4 rounded-xl border text-left transition-all ${
                                            fontFamily === f ? "border-accent ring-1 ring-accent bg-accent/5" : "border-border hover:bg-bg-surface-hover"
                                        }`}
                                    >
                                        <span className="text-2xl block mb-2" style={{ fontFamily: f === 'serif' ? 'serif' : f === 'mono' ? 'monospace' : 'sans-serif' }}>Aa</span>
                                        <span className="text-sm font-medium text-text-primary capitalize">{f}</span>
                                    </button>
                                ))}
                             </div>
                        </section>
                        
                        <div className="h-px bg-border my-6" />

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

                        <div className="h-px bg-border my-6" />

                        <section className="space-y-4">
                             <div className="flex justify-between">
                                  <h3 className="text-base font-semibold text-text-primary">{t("settings.section.fontSize")}</h3>
                                  <span className="text-sm font-medium text-accent bg-accent/10 px-2 py-0.5 rounded">{localFontSize}px</span>
                             </div>
                             <input 
                                type="range" min="12" max="32" step="1" 
                                value={localFontSize} 
                                onChange={(e) => setLocalFontSize(Number(e.target.value))}
                                onMouseUp={() => applySettings({ fontSize: localFontSize })}
                                className="w-full"
                             />
                        </section>
                         <section className="space-y-4">
                             <div className="flex justify-between">
                                  <h3 className="text-base font-semibold text-text-primary">{t("settings.section.lineHeight")}</h3>
                                  <span className="text-sm font-medium text-accent bg-accent/10 px-2 py-0.5 rounded">{localLineHeight}</span>
                             </div>
                             <input 
                                type="range" min="1.2" max="2.4" step="0.1" 
                                value={localLineHeight} 
                                onChange={(e) => setLocalLineHeight(Number(e.target.value))}
                                onMouseUp={() => applySettings({ lineHeight: localLineHeight })}
                                className="w-full"
                             />
                        </section>
                     </div>
                )}
                
                {activeTab === "shortcuts" && (
                    <div className="max-w-2xl">
                         <div className="flex justify-between items-center mb-6">
                            <h3 className="text-base font-semibold text-text-primary">{t("settings.shortcuts.title")}</h3>
                            <button onClick={() => void resetToDefaults()} className="text-xs text-text-tertiary hover:text-text-primary underline">
                                {t("settings.shortcuts.reset")}
                            </button>
                         </div>
                         <div className="h-[400px]">
                            <Virtuoso
                                data={shortcutItems}
                                itemContent={(_, item) => (
                                    <ShortcutRow 
                                        label={item.label} 
                                        value={item.value} 
                                        placeholder={item.placeholder}
                                        onChange={(v) => handleShortcutChange(item.id, v)}
                                        onBlur={() => void commitShortcuts()}
                                    />
                                )}
                            />
                         </div>
                    </div>
                )}

                 {activeTab === "recovery" && (
                    <div className="space-y-6 max-w-2xl">
                        <section className="p-4 bg-bg-surface rounded-xl border border-border">
                            <h3 className="text-base font-semibold text-text-primary mb-2">{t("settings.recovery.title")}</h3>
                            <p className="text-sm text-text-secondary mb-4">{t("settings.recovery.description")}</p>
                            <div className="flex gap-3">
                                 <button 
                                    onClick={() => void runRecovery(true)}
                                    disabled={isRecovering}
                                    className="px-4 py-2 bg-bg-element hover:bg-bg-element-hover border border-border rounded-lg text-sm font-medium text-text-primary transition-colors disabled:opacity-50"
                                >
                                    {t("settings.recovery.dryRun")}
                                </button>
                                <button 
                                    onClick={() => void runRecovery(false)}
                                    disabled={isRecovering}
                                    className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                                >
                                    {isRecovering ? "Running..." : t("settings.recovery.run")}
                                </button>
                            </div>
                             {recoveryMessage && (
                                <div className="mt-4 p-3 bg-bg-app rounded-md border border-border text-sm text-text-primary">
                                    {recoveryMessage}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {activeTab === "language" && (
                     <div className="space-y-6 max-w-2xl">
                        <section>
                             <h3 className="text-base font-semibold text-text-primary mb-2">{t("settings.section.language")}</h3>
                             <div className="flex gap-3">
                                <button 
                                    onClick={() => setLanguage("ko")} 
                                    className={`px-4 py-2 rounded-lg border text-sm transition-all ${i18n.language === 'ko' ? 'border-accent text-accent bg-accent/5' : 'border-border text-text-secondary hover:text-text-primary'}`}
                                >
                                    한국어
                                </button>
                                <button 
                                    onClick={() => setLanguage("en")} 
                                    className={`px-4 py-2 rounded-lg border text-sm transition-all ${i18n.language === 'en' ? 'border-accent text-accent bg-accent/5' : 'border-border text-text-secondary hover:text-text-primary'}`}
                                >
                                    English
                                </button>
                                <button 
                                    onClick={() => setLanguage("ja")} 
                                    className={`px-4 py-2 rounded-lg border text-sm transition-all ${i18n.language === 'ja' ? 'border-accent text-accent bg-accent/5' : 'border-border text-text-secondary hover:text-text-primary'}`}
                                >
                                    日本語
                                </button>
                             </div>
                        </section>
                     </div>
                )}
             </div>
        </div>
      </div>
    </div>
  );
}
