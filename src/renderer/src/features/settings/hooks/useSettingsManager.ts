import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@shared/ui/ToastContext";
import type { SettingsTabId } from "@renderer/features/settings/components/tabs/types";
import { useSettingsEditorPreferences } from "./useSettingsEditorPreferences";
import { useSettingsMenuBar } from "./useSettingsMenuBar";
import { useSettingsRecovery } from "./useSettingsRecovery";
import { useSettingsShortcuts } from "./useSettingsShortcuts";
import { useSettingsSync } from "./useSettingsSync";

export function useSettingsManager() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTabId>("appearance");

  const editorPreferences = useSettingsEditorPreferences(t);
  const menuBarSettings = useSettingsMenuBar(t, showToast);
  const shortcutSettings = useSettingsShortcuts(activeTab, t, showToast);
  const recoverySettings = useSettingsRecovery(t, showToast);
  const syncSettings = useSettingsSync(t, showToast);

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
  };
}
