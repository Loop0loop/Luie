import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@shared/ui/ToastContext";
import type { SettingsTabId } from "@renderer/features/settings/components/tabs/types";
import { useSettingsEditorPreferences } from "./useSettingsEditorPreferences";
import { useSettingsMenuBar } from "./useSettingsMenuBar";
import { useSettingsRecovery } from "./useSettingsRecovery";
import { useSettingsShortcuts } from "./useSettingsShortcuts";
import { useSettingsSync } from "./useSettingsSync";
import { useSettingsModel } from "./useSettingsModel";

export function useSettingsManager(initialTab?: SettingsTabId) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab ?? "appearance");

  const editorPreferences = useSettingsEditorPreferences();
  const menuBarSettings = useSettingsMenuBar(t, showToast);
  const shortcutSettings = useSettingsShortcuts(activeTab, t, showToast);
  const recoverySettings = useSettingsRecovery(activeTab, t, showToast);
  const syncSettings = useSettingsSync(activeTab, t, showToast);
  const modelSettings = useSettingsModel(activeTab, showToast);

  return {
    t,
    i18n,
    activeTab,
    setActiveTab,
    ...editorPreferences,
    ...menuBarSettings,
    ...shortcutSettings,
    ...recoverySettings,
    ...syncSettings,
    ...modelSettings,
  };
}
