import { useMemo } from "react";
import { X } from "lucide-react";
import { AppearanceTab } from "./tabs/AppearanceTab";
import { EditorTab } from "./tabs/EditorTab";
import { LanguageTab } from "./tabs/LanguageTab";
import { RecoveryTab } from "./tabs/RecoveryTab";
import { ShortcutsTab } from "./tabs/ShortcutsTab";
import { SyncTab } from "./tabs/SyncTab";
import { SETTINGS_TABS } from "./SettingsModalConfig";
import { useSettingsManager } from "./hooks/useSettingsManager";

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const {
    t,
    i18n,
    theme,
    themeTemp,
    themeContrast,
    themeAccent,
    themeTexture,
    fontFamily,
    fontPreset,
    uiMode,
    shortcuts,
    shortcutDefaults,
    activeTab,
    setActiveTab,
    localFontSize,
    setLocalFontSize,
    localLineHeight,
    setLocalLineHeight,
    menuBarMode,
    isMenuBarUpdating,
    isShortcutsUpdating,
    isRecovering,
    recoveryMessage,
    syncStatus,
    isSyncBusy,
    installing,
    installed,
    isMacOS,
    applySettings,
    handleCommitShortcuts,
    handleResetShortcuts,
    handleMenuBarMode,
    shortcutGroups,
    getGroupLabel,
    getGroupIcon,
    optionalFonts,
    handleInstallFont,
    handleRunRecovery,
    handleConnectGoogle,
    handleReconnectGoogle,
    handleDisconnect,
    handleSyncNow,
    handleToggleAutoSync,
  } = useSettingsManager();

  const tabs = useMemo(
    () =>
      SETTINGS_TABS.map((tab) => ({
        ...tab,
        label: t(tab.labelKey),
      })),
    [t],
  );

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 animate-in fade-in duration-150"
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
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-fg text-app shadow-md" : "text-muted hover:bg-surface-hover hover:text-fg"
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
                isMenuBarUpdating={isMenuBarUpdating}
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
                t={t}
                shortcutGroups={shortcutGroups}
                shortcutValues={shortcuts as Record<string, string>}
                shortcutDefaults={shortcutDefaults as Record<string, string>}
                isSaving={isShortcutsUpdating}
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

            {activeTab === "sync" && (
              <SyncTab
                t={t}
                status={syncStatus}
                isBusy={isSyncBusy}
                onConnectGoogle={handleConnectGoogle}
                onReconnectGoogle={handleReconnectGoogle}
                onDisconnect={handleDisconnect}
                onSyncNow={handleSyncNow}
                onToggleAutoSync={handleToggleAutoSync}
              />
            )}

            {activeTab === "language" && <LanguageTab t={t} language={i18n.language} />}
          </div>
        </div>
      </div>
    </div>
  );
}
