import { useMemo, useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import type { FontPreset, EditorSettings } from "../../stores/editorStore";
import { useEditorStore } from "../../stores/editorStore";
import { useShortcutStore } from "../../stores/shortcutStore";
import type { ShortcutMap, WindowMenuBarMode } from "../../../../shared/types";
import { SHORTCUT_ACTIONS } from "../../../../shared/constants/shortcuts";
import {
  AppearanceTab,
  EditorTab,
  LanguageTab,
  RecoveryTab,
  ShortcutsTab,
  type OptionalFontOption,
  type SettingsTabId,
  type ShortcutGroupMap,
} from "./SettingsModalSections";
import { SETTINGS_TABS, SHORTCUT_GROUP_ICON_MAP } from "./SettingsModalConfig";

const STORAGE_KEY_FONTS_INSTALLED = "luie:fonts-installed";

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { t, i18n } = useTranslation();

  const {
    theme,
    themeTemp,
    themeContrast,
    themeAccent,
    themeTexture,
    fontSize,
    lineHeight,
    fontFamily,
    fontPreset,
    uiMode,
    updateSettings,
  } = useEditorStore(
    useShallow((state) => ({
      theme: state.theme,
      themeTemp: state.themeTemp,
      themeContrast: state.themeContrast,
      themeAccent: state.themeAccent,
      themeTexture: state.themeTexture,
      fontSize: state.fontSize,
      lineHeight: state.lineHeight,
      fontFamily: state.fontFamily,
      fontPreset: state.fontPreset,
      uiMode: state.uiMode,
      updateSettings: state.updateSettings,
    })),
  );

  const { shortcuts, shortcutDefaults, loadShortcuts, setShortcuts, resetToDefaults } = useShortcutStore(
    useShallow((state) => ({
      shortcuts: state.shortcuts,
      shortcutDefaults: state.defaults,
      loadShortcuts: state.loadShortcuts,
      setShortcuts: state.setShortcuts,
      resetToDefaults: state.resetToDefaults,
    })),
  );

  const [activeTab, setActiveTab] = useState<SettingsTabId>("appearance");
  const [localFontSize, setLocalFontSize] = useState(fontSize);
  const [localLineHeight, setLocalLineHeight] = useState(lineHeight);
  const [menuBarMode, setMenuBarMode] = useState<WindowMenuBarMode>("visible");
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [installing, setInstalling] = useState<Record<string, boolean>>({});
  const [installed, setInstalled] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_FONTS_INSTALLED);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  const isMacOS = navigator.platform.toLowerCase().includes("mac");

  useEffect(() => {
    setLocalFontSize(fontSize);
  }, [fontSize]);

  useEffect(() => {
    setLocalLineHeight(lineHeight);
  }, [lineHeight]);

  const applySettings = useCallback(
    (next: Partial<EditorSettings>) => {
      void updateSettings(next);
    },
    [updateSettings],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const response = await window.api.settings.getMenuBarMode();
      if (!response.success || !response.data || cancelled) return;
      const mode = (response.data as { mode?: WindowMenuBarMode }).mode;
      if (mode === "hidden" || mode === "visible") {
        setMenuBarMode(mode);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleMenuBarModeChange = useCallback(
    async (mode: WindowMenuBarMode) => {
      const response = await window.api.settings.setMenuBarMode({ mode });
      if (!response.success) return;
      setMenuBarMode(mode);
    },
    [],
  );

  useEffect(() => {
    if (activeTab === "shortcuts") {
      void loadShortcuts();
    }
  }, [activeTab, loadShortcuts]);

  const handleCommitShortcuts = useCallback(
    (nextDrafts: Record<string, string>) => {
      if (Object.keys(nextDrafts).length === 0) return;

      const current = shortcuts as Record<string, string>;
      const hasChanges = Object.entries(nextDrafts).some(([actionId, value]) => (current[actionId] ?? "") !== value);
      if (!hasChanges) return;

      void setShortcuts(nextDrafts as ShortcutMap);
    },
    [setShortcuts, shortcuts],
  );

  const handleResetShortcuts = useCallback(() => {
    void resetToDefaults();
  }, [resetToDefaults]);

  const handleMenuBarMode = useCallback(
    (mode: WindowMenuBarMode) => {
      void handleMenuBarModeChange(mode);
    },
    [handleMenuBarModeChange],
  );

  const shortcutGroups = useMemo<ShortcutGroupMap>(() => {
    const groups: ShortcutGroupMap = {
      app: [],
      chapter: [],
      view: [],
      research: [],
      editor: [],
      other: [],
    };

    SHORTCUT_ACTIONS.forEach((action) => {
      if (action.id.startsWith("app.")) groups.app.push(action);
      else if (action.id.startsWith("chapter.") || action.id.startsWith("project.")) groups.chapter.push(action);
      else if (
        action.id.startsWith("view.") ||
        action.id.startsWith("sidebar.") ||
        action.id.startsWith("window.")
      )
        groups.view.push(action);
      else if (
        action.id.startsWith("research.") ||
        action.id.startsWith("character.") ||
        action.id.startsWith("world.") ||
        action.id.startsWith("scrap.")
      )
        groups.research.push(action);
      else if (action.id.startsWith("editor.") || action.id.startsWith("split.")) groups.editor.push(action);
      else groups.other.push(action);
    });

    return groups;
  }, []);

  const getGroupLabel = useCallback(
    (key: string) => {
      switch (key) {
        case "app":
          return t("settings.shortcuts.group.app");
        case "chapter":
          return t("settings.shortcuts.group.file");
        case "view":
          return t("settings.shortcuts.group.view");
        case "research":
          return t("settings.shortcuts.group.research");
        case "editor":
          return t("settings.shortcuts.group.editor");
        default:
          return t("settings.shortcuts.group.other");
      }
    },
    [t],
  );

  const getGroupIcon = useCallback((key: string) => {
    return SHORTCUT_GROUP_ICON_MAP[key] ?? SHORTCUT_GROUP_ICON_MAP.other;
  }, []);

  const runRecovery = useCallback(async (dryRun: boolean) => {
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
  }, []);

  const optionalFonts = useMemo<OptionalFontOption[]>(
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

  const persistInstalled = useCallback(
    (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => {
      setInstalled((prev) => {
        const next = updater(prev);
        try {
          localStorage.setItem(STORAGE_KEY_FONTS_INSTALLED, JSON.stringify(next));
        } catch {
          // best-effort
        }
        return next;
      });
    },
    [],
  );

  const ensureFontLoaded = useCallback(async (pkg: string) => {
    const id = `fontsource-variable-${pkg}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://cdn.jsdelivr.net/npm/@fontsource-variable/${pkg}/index.css`;
    document.head.appendChild(link);
  }, []);

  const handleInstall = useCallback(
    async (preset: FontPreset, pkg: string) => {
      setInstalling((prev) => ({ ...prev, [preset]: true }));
      try {
        await ensureFontLoaded(pkg);
        persistInstalled((prev) => ({ ...prev, [preset]: true }));
      } finally {
        setInstalling((prev) => ({ ...prev, [preset]: false }));
      }
    },
    [ensureFontLoaded, persistInstalled],
  );

  const handleInstallFont = useCallback(
    (preset: FontPreset, pkg: string) => {
      void handleInstall(preset, pkg);
    },
    [handleInstall],
  );

  const handleRunRecovery = useCallback(
    (dryRun: boolean) => {
      void runRecovery(dryRun);
    },
    [runRecovery],
  );

  const tabs = useMemo(
    () =>
      SETTINGS_TABS.map((tab) => ({
        ...tab,
        label: t(tab.labelKey),
      })),
    [t],
  );
  const shortcutValuesKey = useMemo(() => {
    if (activeTab !== "shortcuts") {
      return "shortcuts-idle";
    }
    return JSON.stringify(shortcuts ?? {});
  }, [activeTab, shortcuts]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-[1000px] h-[80vh] max-h-[850px] bg-panel border border-border shadow-xl rounded-xl flex overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-64 bg-sidebar border-r border-border flex flex-col pt-3">
          <div className="p-6 pb-4">
            <h2 className="text-lg font-bold text-fg px-2">{t("settings.title")}</h2>
          </div>
          <nav className="flex-1 px-4 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id ? "bg-fg text-app shadow-md" : "text-muted hover:bg-surface-hover hover:text-fg"
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-app" : "text-subtle"}`} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 bg-panel flex flex-col relative min-w-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-subtle hover:text-fg hover:bg-active rounded-lg transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 overflow-y-auto p-10 scrollbar-hide content-visibility-auto contain-intrinsic-size-[1px_1200px]">
            {activeTab === "appearance" && (
              <AppearanceTab
                t={t}
                theme={theme}
                themeTemp={themeTemp}
                themeContrast={themeContrast}
                themeAccent={themeAccent}
                themeTexture={themeTexture}
                uiMode={uiMode}
                isMacOS={isMacOS}
                menuBarMode={menuBarMode}
                onApplySettings={applySettings}
                onMenuBarModeChange={handleMenuBarMode}
              />
            )}

            {activeTab === "editor" && (
              <EditorTab
                t={t}
                fontFamily={fontFamily}
                fontPreset={fontPreset}
                localFontSize={localFontSize}
                localLineHeight={localLineHeight}
                optionalFonts={optionalFonts}
                installed={installed}
                installing={installing}
                onApplySettings={applySettings}
                onSetLocalFontSize={setLocalFontSize}
                onSetLocalLineHeight={setLocalLineHeight}
                onInstallFont={handleInstallFont}
              />
            )}

            {activeTab === "shortcuts" && (
              <ShortcutsTab
                key={shortcutValuesKey}
                t={t}
                shortcutGroups={shortcutGroups}
                shortcutValues={shortcuts as Record<string, string>}
                shortcutDefaults={shortcutDefaults as Record<string, string>}
                onCommitShortcuts={handleCommitShortcuts}
                onResetShortcuts={handleResetShortcuts}
                getShortcutGroupLabel={getGroupLabel}
                getShortcutGroupIcon={getGroupIcon}
              />
            )}

            {activeTab === "recovery" && (
              <RecoveryTab
                t={t}
                isRecovering={isRecovering}
                recoveryMessage={recoveryMessage}
                onRunRecovery={handleRunRecovery}
              />
            )}

            {activeTab === "language" && <LanguageTab t={t} language={i18n.language} />}
          </div>
        </div>
      </div>
    </div>
  );
}
