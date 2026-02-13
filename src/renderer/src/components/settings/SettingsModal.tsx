import { memo, useMemo, useState, useEffect, useTransition } from "react";
import { X, Check, Download, Command, Type, Layout, BookOpen, FileText, Monitor, Keyboard, RotateCcw, Globe, Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { FontPreset, EditorSettings } from "../../stores/editorStore";
import { useEditorStore } from "../../stores/editorStore";
import { useShortcutStore } from "../../stores/shortcutStore";
import type { ShortcutMap, WindowTitleBarMode } from "../../../../shared/types";
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
    <div className="flex items-center justify-between py-2 group">
      <div className="text-sm text-muted group-hover:text-fg transition-colors">{label}</div>
      <div className="relative w-40">
        <input
            className="w-full bg-surface border border-border rounded-md px-3 py-1.5 text-sm font-mono text-fg focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all text-center"
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
    </div>
  );
});

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { t, i18n } = useTranslation();

  const theme = useEditorStore((state) => state.theme);
  const themeTemp = useEditorStore((state) => state.themeTemp);
  const themeContrast = useEditorStore((state) => state.themeContrast);
  const themeAccent = useEditorStore((state) => state.themeAccent);
  const themeTexture = useEditorStore((state) => state.themeTexture);
  const fontSize = useEditorStore((state) => state.fontSize);
  const lineHeight = useEditorStore((state) => state.lineHeight);
  const fontFamily = useEditorStore((state) => state.fontFamily);
  const fontPreset = useEditorStore((state) => state.fontPreset);
  const updateSettings = useEditorStore((state) => state.updateSettings);

  const [activeTab, setActiveTab] = useState("appearance");
  const [localFontSize, setLocalFontSize] = useState(fontSize);
  const [localLineHeight, setLocalLineHeight] = useState(lineHeight);
  const [isPending, startTransition] = useTransition();
  const [titleBarMode, setTitleBarMode] = useState<WindowTitleBarMode>("hidden");
  const isMacOS = navigator.platform.toLowerCase().includes("mac");

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

  useEffect(() => {
    void (async () => {
      const response = await window.api.settings.getTitleBarMode();
      if (!response.success || !response.data) return;
      const mode = (response.data as { mode?: WindowTitleBarMode }).mode;
      if (mode === "hidden" || mode === "visible") {
        setTitleBarMode(mode);
      }
    })();
  }, []);

  const handleTitleBarModeChange = async (mode: WindowTitleBarMode) => {
    setTitleBarMode(mode);
    await window.api.settings.setTitleBarMode({ mode });
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

  // Group Shortcuts
  const shortcutGroups = useMemo(() => {
      const groups: Record<string, typeof SHORTCUT_ACTIONS> = {
          app: [],
          chapter: [],
          view: [],
          research: [],
          editor: [],
          other: []
      };

      SHORTCUT_ACTIONS.forEach(action => {
          if (action.id.startsWith("app.")) groups.app.push(action);
          else if (action.id.startsWith("chapter.") || action.id.startsWith("project.")) groups.chapter.push(action);
          else if (action.id.startsWith("view.") || action.id.startsWith("sidebar.") || action.id.startsWith("window.")) groups.view.push(action);
          else if (action.id.startsWith("research.") || action.id.startsWith("character.") || action.id.startsWith("world.") || action.id.startsWith("scrap.")) groups.research.push(action);
          else if (action.id.startsWith("editor.") || action.id.startsWith("split.")) groups.editor.push(action);
          else groups.other.push(action);
      });

      return groups;
  }, []);

  const getGroupLabel = (key: string) => {
      switch(key) {
          case 'app': return t("settings.shortcuts.group.app");
          case 'chapter': return t("settings.shortcuts.group.file");
          case 'view': return t("settings.shortcuts.group.view");
          case 'research': return t("settings.shortcuts.group.research");
          case 'editor': return t("settings.shortcuts.group.editor");
          default: return t("settings.shortcuts.group.other");
      }
  };

  const getGroupIcon = (key: string) => {
      switch(key) {
          case 'app': return Command;
          case 'chapter': return FileText;
          case 'view': return Layout;
          case 'research': return BookOpen;
          case 'editor': return Type;
          default: return Keyboard;
      }
  };


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

  // ... (Optional Fonts Logic items) ...
  
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
    { id: "editor", label: t("settings.sidebar.editor"), icon: Type },
    { id: "appearance", label: t("settings.sidebar.appearance"), icon: Monitor },
    { id: "shortcuts", label: t("settings.sidebar.shortcuts"), icon: Keyboard },
    { id: "recovery", label: t("settings.sidebar.recovery"), icon: RotateCcw },
    { id: "language", label: t("settings.sidebar.language"), icon: Globe },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-[1000px] h-[80vh] max-h-[850px] bg-panel/95 backdrop-blur-sm border border-border shadow-2xl rounded-xl flex overflow-hidden animate-in zoom-in-95 duration-200 will-change-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-64 bg-sidebar border-r border-border flex flex-col pt-3">
            <div className="p-6 pb-4">
                <h2 className="text-lg font-bold text-fg px-2">{t("settings.title")}</h2>
            </div>
            <nav className="flex-1 px-4 space-y-1">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            startTransition(() => setActiveTab(tab.id));
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                            activeTab === tab.id 
                            ? "bg-fg text-app shadow-md" 
                            : "text-muted hover:bg-surface-hover hover:text-fg"
                        }`}
                    >
                        <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-app' : 'text-subtle'}`} />
                        {tab.label}
                    </button>
                ))}
            </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-panel flex flex-col relative min-w-0" aria-busy={isPending}>
             <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-subtle hover:text-fg hover:bg-active rounded-lg transition-colors z-10"
             >
                <X className="w-5 h-5" />
             </button>

             <div className="flex-1 overflow-y-auto p-10 scrollbar-hide">
                {activeTab === "appearance" && (
                    <div className="space-y-10 max-w-2xl">
                        {/* 1. Base Theme */}
                        <section className="space-y-4">
                            <div>
                                <h3 className="text-base font-semibold text-fg">테마 모드 (Base Theme)</h3>
                                <p className="text-sm text-muted mt-1">기본적인 밝기를 선택합니다.</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {(['light', 'sepia', 'dark'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => applySettings({ theme: mode })}
                                        className={`flex items-center justify-center px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
                                            theme === mode 
                                            ? "border-accent text-accent bg-accent/5 ring-1 ring-accent shadow-sm"
                                            : "border-border text-muted hover:border-text-tertiary hover:bg-surface-hover"
                                        }`}
                                    >
                                        {mode === "light" && "Light"}
                                        {mode === "sepia" && "Sepia"}
                                        {mode === "dark" && "Dark"}
                                        {theme === mode && <Check className="w-4 h-4 ml-2" />}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <div className="h-px bg-border my-6" />

                        {/* 2. Accent Color */}
                        <section className="space-y-4">
                            <div>
                                <h3 className="text-base font-semibold text-fg">강조 색상 (Accent Color)</h3>
                                <p className="text-sm text-muted mt-1">버튼과 강조 요소의 색상을 선택하세요.</p>
                            </div>
                            <div className="flex gap-4">
                                {(['blue', 'violet', 'green', 'amber', 'rose', 'slate'] as const).map((accent) => (
                                    <button
                                        key={accent}
                                        onClick={() => applySettings({ themeAccent: accent })}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                                            themeAccent === accent ? "ring-2 ring-offset-2 ring-text-primary scale-110" : "hover:scale-110"
                                        }`}
                                        style={{ backgroundColor: `var(--color-bg-${accent}, ${
                                            accent === 'blue' ? '#3b82f6' :
                                            accent === 'violet' ? '#8b5cf6' :
                                            accent === 'green' ? '#10b981' :
                                            accent === 'amber' ? '#f59e0b' :
                                            accent === 'rose' ? '#f43f5e' : '#64748b'
                                        })` }}
                                        title={accent}
                                    >
                                        {themeAccent === accent && <Check className="w-5 h-5 text-white" />}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <div className="h-px bg-border my-6" />

                        {/* 3. Texture & Atmosphere */}
                        <div className="grid grid-cols-2 gap-8">
                             {/* Texture */}
                             <section className="space-y-4">
                                <div>
                                    <h3 className="text-base font-semibold text-fg">종이 질감 (Texture)</h3>
                                    <p className="text-sm text-muted mt-1">화면에 미세한 노이즈를 추가하여 종이 질감을 냅니다.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => applySettings({ themeTexture: !themeTexture })}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                                            themeTexture ? 'bg-accent' : 'bg-border'
                                        }`}
                                    >
                                        <span
                                            className={`${
                                                themeTexture ? 'translate-x-6' : 'translate-x-1'
                                            } inline-block h-4 w-4 transform rounded-full bg-surface shadow-sm transition-transform`}
                                        />
                                    </button>
                                    <span className="text-sm font-medium text-fg">
                                        {themeTexture ? "켜짐 (On)" : "꺼짐 (Off)"}
                                    </span>
                                </div>
                             </section>

                             {/* Contrast */}
                             <section className="space-y-4">
                                <div>
                                    <h3 className="text-base font-semibold text-fg">대비 (Contrast)</h3>
                                    <p className="text-sm text-muted mt-1">화면의 선명도를 조절합니다.</p>
                                </div>
                                 <div className="flex gap-2">
                                    {(['soft', 'high'] as const).map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => applySettings({ themeContrast: c })}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                                themeContrast === c
                                                ? "bg-text-primary text-bg-app border-transparent"
                                                : "border-border text-muted hover:text-fg"
                                            }`}
                                        >
                                            {c === 'soft' ? 'Soft' : 'High'}
                                        </button>
                                    ))}
                                 </div>
                             </section>
                        </div>
                        
                        <div className="h-px bg-border my-6" />

                        {/* 4. Atmosphere (Temperature) */}
	                        <section className="space-y-4">
	                            <div>
	                                <h3 className="text-base font-semibold text-fg">분위기 (Atmosphere)</h3>
                                <p className="text-sm text-muted mt-1">작업 목적에 맞는 색온도를 선택하세요.</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    onClick={() => applySettings({ themeTemp: "cool" })}
                                    className={`relative group flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-200 ${
                                        themeTemp === "cool" 
                                        ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500" 
                                        : "border-border hover:bg-surface-hover"
                                    }`}
                                >
                                    <span className="text-sm font-semibold text-fg mb-1">차가움 (Cool)</span>
                                    <span className="text-xs text-muted">집중 / 분석 / 이성적</span>
                                </button>

                                <button
                                    onClick={() => applySettings({ themeTemp: "neutral" })}
                                    className={`relative group flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-200 ${
                                        themeTemp === "neutral" 
                                        ? "border-text-secondary bg-text-secondary/5 ring-1 ring-text-secondary" 
                                        : "border-border hover:bg-surface-hover"
                                    }`}
                                >
                                    <span className="text-sm font-semibold text-fg mb-1">중립 (Neutral)</span>
                                    <span className="text-xs text-muted">기본 / 깔끔함</span>
                                </button>

                                <button
                                    onClick={() => applySettings({ themeTemp: "warm" })}
                                    className={`relative group flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-200 ${
                                        themeTemp === "warm" 
                                        ? "border-orange-500 bg-orange-500/5 ring-1 ring-orange-500" 
                                        : "border-border hover:bg-surface-hover"
                                    }`}
                                >
                                    <span className="text-sm font-semibold text-fg mb-1">따뜻함 (Warm)</span>
                                    <span className="text-xs text-muted">서사 / 감정 / 편안함</span>
                                </button>
	                            </div>
	                        </section>

                        {isMacOS && (
                          <>
                            <div className="h-px bg-border my-6" />
                            <section className="space-y-4">
                              <div>
                                <h3 className="text-base font-semibold text-fg">{t("settings.section.titleBar")}</h3>
                                <p className="text-sm text-muted mt-1">{t("settings.titleBar.description")}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  onClick={() => void handleTitleBarModeChange("hidden")}
                                  className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
                                    titleBarMode === "hidden"
                                      ? "border-accent text-accent bg-accent/5 ring-1 ring-accent"
                                      : "border-border text-muted hover:border-text-tertiary hover:bg-surface-hover"
                                  }`}
                                >
                                  {t("settings.titleBar.hide")}
                                </button>
                                <button
                                  onClick={() => void handleTitleBarModeChange("visible")}
                                  className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
                                    titleBarMode === "visible"
                                      ? "border-accent text-accent bg-accent/5 ring-1 ring-accent"
                                      : "border-border text-muted hover:border-text-tertiary hover:bg-surface-hover"
                                  }`}
                                >
                                  {t("settings.titleBar.show")}
                                </button>
                              </div>
                              <p className="text-xs text-muted">{t("settings.titleBar.restartHint")}</p>
                            </section>
                          </>
                        )}
	                    </div>
	                )}

                {activeTab === "editor" && (
                     <div className="space-y-8 max-w-2xl">
                        <section className="space-y-4">
                            <h3 className="text-base font-semibold text-fg">{t("settings.section.font")}</h3>
                             <div className="grid grid-cols-3 gap-3">
                                {EDITOR_FONT_FAMILIES.map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => applySettings({ fontFamily: f })}
                                        className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                                            fontFamily === f ? "border-accent ring-1 ring-accent bg-accent/5" : "border-border hover:bg-surface-hover"
                                        }`}
                                    >
                                        <span className="text-2xl block mb-2" style={{ fontFamily: f === 'serif' ? 'serif' : f === 'mono' ? 'monospace' : 'sans-serif' }}>Aa</span>
                                        <span className="text-sm font-medium text-fg capitalize">{f}</span>
                                    </button>
                                ))}
                             </div>
                        </section>
                        
                        <div className="h-px bg-border my-6" />

                        {/* OPTIONAL FONTS */}
                        <div className="flex flex-col gap-3">
                          <div className="text-[13px] font-semibold text-muted uppercase tracking-[0.5px] mb-1">{t("settings.section.optionalFonts")}</div>
                          <div className="grid grid-cols-2 gap-3">
                            {OPTIONAL_FONTS.map((font) => {
                              const isInstalled = installed[font.id];
                              const isInstalling = installing[font.id];
                              const isActive = fontPreset === font.id;
        
                              return (
                                <div key={font.id} className="flex items-center justify-between px-3 py-2.5 border border-border rounded-[10px] bg-surface hover:border-text-tertiary transition-colors duration-200">
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
                                      <div className="text-xs px-2 py-1 rounded-full text-accent-fg bg-accent font-medium shadow-sm">{t("settings.optionalFonts.action.active")}</div>
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
                             <div className="flex justify-between items-center">
                                  <h3 className="text-base font-semibold text-fg">{t("settings.section.fontSize")}</h3>
                                  <div className="flex items-center gap-3 bg-surface border border-border rounded-lg p-1">
                                       <button
                                          onClick={() => {
                                              const next = Math.max(12, localFontSize - 1);
                                              setLocalFontSize(next);
                                              applySettings({ fontSize: next });
                                          }}
                                          className="p-1 hover:bg-element-hover rounded-md text-muted hover:text-fg transition-colors"
                                       >
                                          <Minus className="w-4 h-4" />
                                       </button>
                                       <span className="text-sm font-medium text-fg w-12 text-center">{localFontSize}px</span>
                                       <button
                                          onClick={() => {
                                               const next = Math.min(32, localFontSize + 1);
                                               setLocalFontSize(next);
                                               applySettings({ fontSize: next });
                                          }}
                                          className="p-1 hover:bg-element-hover rounded-md text-muted hover:text-fg transition-colors"
                                       >
                                          <Plus className="w-4 h-4" />
                                       </button>
                                  </div>
                             </div>
                        </section>
                         <section className="space-y-4">
                             <div className="flex justify-between items-center">
                                  <h3 className="text-base font-semibold text-fg">{t("settings.section.lineHeight")}</h3>
                                  <div className="flex items-center gap-3 bg-surface border border-border rounded-lg p-1">
                                       <button
                                          onClick={() => {
                                              const next = Math.max(1.2, Number((localLineHeight - 0.1).toFixed(1)));
                                              setLocalLineHeight(next);
                                              applySettings({ lineHeight: next });
                                          }}
                                          className="p-1 hover:bg-element-hover rounded-md text-muted hover:text-fg transition-colors"
                                       >
                                          <Minus className="w-4 h-4" />
                                       </button>
                                       <span className="text-sm font-medium text-fg w-12 text-center">{localLineHeight}</span>
                                       <button
                                          onClick={() => {
                                               const next = Math.min(2.4, Number((localLineHeight + 0.1).toFixed(1)));
                                               setLocalLineHeight(next);
                                               applySettings({ lineHeight: next });
                                          }}
                                          className="p-1 hover:bg-element-hover rounded-md text-muted hover:text-fg transition-colors"
                                       >
                                          <Plus className="w-4 h-4" />
                                       </button>
                                  </div>
                             </div>
                        </section>
                     </div>
                )}
                
                {activeTab === "shortcuts" && (
                     <div className="max-w-2xl space-y-8 pb-20">
                          <div className="flex justify-between items-center">
                             <h3 className="text-lg font-bold text-fg">{t("settings.shortcuts.title")}</h3>
                             <button onClick={() => void resetToDefaults()} className="text-xs text-subtle hover:text-fg underline">
                                 {t("settings.shortcuts.reset")}
                             </button>
                          </div>
                          
                          {Object.entries(shortcutGroups).map(([groupKey, actions]) => {
                                const Icon = getGroupIcon(groupKey);
                                return actions.length > 0 && (
                                    <div key={groupKey} className="space-y-3">
                                        <div className="flex items-center gap-2 text-muted pb-1 border-b border-border/50">
                                            <Icon className="w-4 h-4" />
                                            <h4 className="text-sm font-semibold uppercase tracking-wider">{getGroupLabel(groupKey)}</h4>
                                        </div>
                                        <div className="space-y-1">
                                            {actions.map(action => (
                                                <ShortcutRow 
                                                    key={action.id}
                                                    label={t(action.labelKey)} 
                                                    value={shortcutDrafts[action.id] ?? shortcutDefaults[action.id] ?? ""} 
                                                    placeholder={shortcutDefaults[action.id] ?? ""}
                                                    onChange={(v) => handleShortcutChange(action.id, v)}
                                                    onBlur={() => void commitShortcuts()}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )
                          })}
                     </div>
                )}

                 {activeTab === "recovery" && (
                    <div className="space-y-6 max-w-2xl">
                        <section className="p-4 bg-surface rounded-xl border border-border">
                            <h3 className="text-base font-semibold text-fg mb-2">{t("settings.recovery.title")}</h3>
                            <p className="text-sm text-muted mb-4">{t("settings.recovery.description")}</p>
                            <div className="flex gap-3">
                                 <button 
                                    onClick={() => void runRecovery(true)}
                                    disabled={isRecovering}
                                    className="px-4 py-2 bg-element hover:bg-element-hover border border-border rounded-lg text-sm font-medium text-fg transition-colors disabled:opacity-50"
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
                                <div className="mt-4 p-3 bg-app rounded-md border border-border text-sm text-fg">
                                    {recoveryMessage}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {activeTab === "language" && (
                     <div className="space-y-6 max-w-2xl">
                        <section>
                             <h3 className="text-base font-semibold text-fg mb-2">{t("settings.section.language")}</h3>
                             <div className="flex gap-3">
                                <button 
                                    onClick={() => setLanguage("ko")} 
                                    className={`px-4 py-2 rounded-lg border text-sm transition-all duration-200 ${i18n.language === 'ko' ? 'border-accent text-accent bg-accent/5 ring-1 ring-accent' : 'border-border text-muted hover:text-fg'}`}
                                >
                                    한국어
                                </button>
                                <button 
                                    onClick={() => setLanguage("en")} 
                                    className={`px-4 py-2 rounded-lg border text-sm transition-all duration-200 ${i18n.language === 'en' ? 'border-accent text-accent bg-accent/5 ring-1 ring-accent' : 'border-border text-muted hover:text-fg'}`}
                                >
                                    English
                                </button>
                                <button 
                                    onClick={() => setLanguage("ja")} 
                                    className={`px-4 py-2 rounded-lg border text-sm transition-all duration-200 ${i18n.language === 'ja' ? 'border-accent text-accent bg-accent/5 ring-1 ring-accent' : 'border-border text-muted hover:text-fg'}`}
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
