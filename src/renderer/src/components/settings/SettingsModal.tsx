import { useMemo, useState, useEffect } from "react";
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
  SETTINGS_FONT_MONO_LABEL,
  SETTINGS_FONT_SANS_LABEL,
  SETTINGS_FONT_SERIF_LABEL,
  SETTINGS_OPTIONAL_FONT_LABEL_BITTER,
  SETTINGS_OPTIONAL_FONT_LABEL_LORA,
  SETTINGS_OPTIONAL_FONT_LABEL_MONTSERRAT,
  SETTINGS_OPTIONAL_FONT_LABEL_NUNITO_SANS,
  SETTINGS_OPTIONAL_FONT_LABEL_SOURCE_SERIF,
  SETTINGS_OPTIONAL_FONT_LABEL_VICTOR_MONO,
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

  const [activeTab, setActiveTab] = useState("editor");

  const sidebarItems = [
    { id: "editor", label: "글꼴 (Editor)" },
    { id: "appearance", label: "테마 (Appearance)" },
    { id: "features", label: "기능 (Features)" },
    { id: "shortcuts", label: "단축키 (Shortcuts)" },
    { id: "recovery", label: "파일 복원 (File Recovery)" },
    { id: "sync", label: "동기화 (Sync)" },
    { id: "language", label: "언어 (Language)" }
  ];

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
        className="w-[960px] h-[640px] bg-surface border border-white/10 rounded-xl shadow-2xl flex overflow-hidden max-h-[95vh] animate-in slide-in-from-bottom-5 duration-200 relative will-change-[transform,opacity]" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER is removed, using sidebar layout instead */}
        <div className="flex w-full h-full">
          {/* SIDEBAR */}
          <div className="w-[260px] bg-sidebar border-r border-border flex flex-col pt-3">
            <div className="p-6 pb-4">
              <div className="text-lg font-bold text-fg">{SETTINGS_TITLE_DISPLAY}</div>
            </div>
            <div className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
              {sidebarItems.map((item) => (
                <div
                  key={item.id}
                  className={`
                    px-4 py-3 text-sm rounded-md cursor-pointer transition-all font-medium
                    ${activeTab === item.id ? "bg-active text-fg font-semibold" : "text-muted hover:bg-active hover:text-fg"}
                  `}
                  onClick={() => setActiveTab(item.id)}
                >
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="flex-1 flex flex-col bg-surface relative overflow-hidden">
            <button 
              className="absolute top-5 right-5 bg-transparent border-none cursor-pointer text-subtle p-2 rounded-full z-10 transition-all flex items-center justify-center hover:bg-active hover:text-fg" 
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </button>
            
            {activeTab === "editor" && (
              <div className="flex-1 px-[60px] py-[48px] overflow-y-auto flex flex-col gap-8">
                {/* FONT FAMILY */}
                <div className="flex flex-col gap-3">
                  <div className="text-[13px] font-semibold text-muted uppercase tracking-[0.5px] mb-1">{SETTINGS_SECTION_FONT}</div>
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
                        onClick={() => updateSettings({ fontFamily: f })}
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
                          {SETTINGS_SAMPLE_TEXT}
                        </div>
                        <div className="text-xs text-muted font-medium">
                          {f === "serif"
                            ? SETTINGS_FONT_SERIF_LABEL
                            : f === "sans"
                              ? SETTINGS_FONT_SANS_LABEL
                              : SETTINGS_FONT_MONO_LABEL}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-subtle leading-[1.4]">
                    {SETTINGS_FONT_HELPER_PRIMARY}
                  </div>
                </div>

                <div className="h-px bg-border w-full" />

                {/* OPTIONAL FONTS */}
                <div className="flex flex-col gap-3">
                  <div className="text-[13px] font-semibold text-muted uppercase tracking-[0.5px] mb-1">{SETTINGS_SECTION_OPTIONAL_FONTS}</div>
                  <div className="flex flex-col gap-2.5">
                    {OPTIONAL_FONTS.map((font) => {
                      const isInstalled = installed[font.id];
                      const isInstalling = installing[font.id];
                      const isActive = fontPreset === font.id;

                      return (
                        <div key={font.id} className="flex items-center justify-between px-3 py-2.5 border border-border rounded-[10px] bg-surface">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-[42px] h-[42px] rounded-lg border border-border flex items-center justify-center text-lg text-fg bg-surface-hover"
                              style={{ fontFamily: font.stack }}
                            >
                              {SETTINGS_SAMPLE_TEXT}
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
                                {isInstalling ? SETTINGS_ACTION_INSTALLING : SETTINGS_ACTION_INSTALL}
                              </button>
                            ) : isActive ? (
                              <div className="text-xs px-2 py-1 rounded-full text-accent-fg bg-accent">{SETTINGS_BADGE_ACTIVE}</div>
                            ) : (
                              <button
                                className="rounded-lg px-2.5 py-1.5 text-xs border border-border bg-surface text-fg cursor-pointer inline-flex items-center gap-1.5 hover:border-active hover:bg-surface-hover"
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
                </div>

                <div className="h-px bg-border w-full" />

                {/* FONT SIZE & LINE HEIGHT */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <div className="text-[13px] font-semibold text-muted uppercase tracking-[0.5px] mb-1">{SETTINGS_SECTION_FONT_SIZE}</div>
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
                      onMouseUp={() => updateSettings({ fontSize: localFontSize })}
                      onTouchEnd={() => updateSettings({ fontSize: localFontSize })}
                    />
                  </div>

                  <div style={{ height: 24 }} />

                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <div className="text-[13px] font-semibold text-muted uppercase tracking-[0.5px] mb-1">{SETTINGS_SECTION_LINE_HEIGHT}</div>
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
                      onMouseUp={() => updateSettings({ lineHeight: localLineHeight })}
                      onTouchEnd={() => updateSettings({ lineHeight: localLineHeight })}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="flex-1 px-[60px] py-[48px] overflow-y-auto flex flex-col gap-8">
                <div className="flex flex-col gap-3">
                  <div className="text-[13px] font-semibold text-muted uppercase tracking-[0.5px] mb-1">{SETTINGS_SECTION_THEME}</div>
                  <div className="grid grid-cols-3 gap-3">
                    {(["light", "sepia", "dark"] as EditorTheme[]).map((t) => (
                      <button
                        key={t}
                        className={`
                          h-20 rounded-xl border-2 cursor-pointer relative flex items-center justify-center text-sm font-semibold transition-all hover:scale-[1.02]
                          ${t === "light" ? "bg-white border-zinc-200 text-zinc-800" : ""}
                          ${t === "sepia" ? "bg-[#fbf0d9] border-[#f0e6d2] text-[#5f4b32]" : ""}
                          ${t === "dark" ? "bg-[#222] border-[#333] text-[#eee]" : ""}
                          ${theme === t ? "border-accent!" : ""}
                        `}
                        onClick={() => updateSettings({ theme: t })}
                      >
                        {theme === t && (
                          <div className="absolute top-1.5 right-1.5 bg-accent text-accent-fg w-[18px] h-[18px] rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        <div className="themeName">
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
            )}

            {activeTab !== "editor" && activeTab !== "appearance" && (
              <div className="flex-1 flex items-center justify-center text-subtle text-sm">
                <div className="placeholderText">준비 중인 기능입니다.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
