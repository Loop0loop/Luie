import { lazy, Suspense, useMemo } from "react";
import { X } from "lucide-react";
import { SETTINGS_TABS } from "@renderer/features/settings/components/SettingsModalConfig";
import { useSettingsManager } from "@renderer/features/settings/hooks/useSettingsManager";

const AppearanceTab = lazy(() =>
  import("@renderer/features/settings/components/tabs/AppearanceTab").then(
    (module) => ({
      default: module.AppearanceTab,
    }),
  ),
);
const EditorTab = lazy(() =>
  import("@renderer/features/settings/components/tabs/EditorTab").then(
    (module) => ({
      default: module.EditorTab,
    }),
  ),
);
const LanguageTab = lazy(() =>
  import("@renderer/features/settings/components/tabs/LanguageTab").then(
    (module) => ({
      default: module.LanguageTab,
    }),
  ),
);
const RecoveryTab = lazy(() =>
  import("@renderer/features/settings/components/tabs/RecoveryTab").then(
    (module) => ({
      default: module.RecoveryTab,
    }),
  ),
);
const ShortcutsTab = lazy(() =>
  import("@renderer/features/settings/components/tabs/ShortcutsTab").then(
    (module) => ({
      default: module.ShortcutsTab,
    }),
  ),
);
const SyncTab = lazy(() =>
  import("@renderer/features/settings/components/tabs/SyncTab").then(
    (module) => ({
      default: module.SyncTab,
    }),
  ),
);

interface SettingsModalProps {
  onClose: () => void;
}

const settingsTabFallback = (
  <div className="min-h-[320px] animate-pulse rounded-xl bg-surface/60" />
);

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const {
    t,
    i18n,
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
    isRecoveryStatusLoading,
    recoveryResult,
    recoveryScope,
    recoveryStatus,
    recoveryStatusError,
    syncStatus,
    isSyncBusy,
    isMacOS,
    handleCommitShortcuts,
    handleResetShortcuts,
    handleMenuBarMode,
    shortcutGroups,
    getGroupLabel,
    getGroupIcon,
    handleRefreshRecoveryStatus,
    handleRunRecovery,
    handleConnectGoogle,
    handleReconnectGoogle,
    handleDisconnect,
    handleSyncNow,
    handleToggleAutoSync,
    handleResolveConflict,
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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="w-[1000px] h-[80vh] max-h-[850px] bg-panel border border-border shadow-full rounded-xl flex overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-64 bg-sidebar border-r border-border flex flex-col pt-3">
          <div className="p-6 pb-4">
            <h2 className="text-lg font-bold text-fg px-2">
              {t("settings.title")}
            </h2>
          </div>
          <nav className="flex-1 px-4 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-fg text-app shadow-md"
                    : "text-muted hover:bg-surface-hover hover:text-fg"
                }`}
              >
                <tab.icon
                  className={`w-4 h-4 ${activeTab === tab.id ? "text-app" : "text-subtle"}`}
                />
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

          <div className="flex-1 overflow-y-auto p-10 scrollbar-hide">
            <Suspense fallback={settingsTabFallback}>
              {activeTab === "appearance" && (
                <AppearanceTab
                  t={t}
                  isMacOS={isMacOS}
                  menuBarMode={menuBarMode}
                  onMenuBarModeChange={handleMenuBarMode}
                  isMenuBarUpdating={isMenuBarUpdating}
                />
              )}

              {activeTab === "editor" && (
                <EditorTab
                  t={t}
                  localFontSize={localFontSize}
                  localLineHeight={localLineHeight}
                  onSetLocalFontSize={setLocalFontSize}
                  onSetLocalLineHeight={setLocalLineHeight}
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
                  isRecoveryStatusLoading={isRecoveryStatusLoading}
                  recoveryResult={recoveryResult}
                  recoveryScope={recoveryScope}
                  recoveryStatus={recoveryStatus}
                  recoveryStatusError={recoveryStatusError}
                  onDismiss={onClose}
                  onRefreshRecoveryStatus={handleRefreshRecoveryStatus}
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
                  onResolveConflict={handleResolveConflict}
                />
              )}

              {activeTab === "language" && (
                <LanguageTab t={t} language={i18n.language} />
              )}
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
