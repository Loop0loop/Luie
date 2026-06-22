import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TFunction } from "i18next";
import { useShallow } from "zustand/react/shallow";
import type { ToastContextType } from "@shared/ui/ToastContext";
import { useShortcutStore } from "@renderer/features/workspace/stores/shortcutStore";
import { SHORTCUT_ACTIONS } from "@shared/constants/shortcuts";
import { SHORTCUT_GROUP_ICON_MAP } from "@renderer/features/settings/components/SettingsModalConfig";
import type {
  SettingsTabId,
  ShortcutGroupMap,
} from "@renderer/features/settings/components/tabs/types";
import type { ShortcutMap } from "@shared/types";

type ShowToast = ToastContextType["showToast"];

export function useSettingsShortcuts(
  activeTab: SettingsTabId,
  t: TFunction,
  showToast: ShowToast,
) {
  const {
    shortcuts,
    shortcutDefaults,
    loadShortcuts,
    setShortcuts,
    resetToDefaults,
  } = useShortcutStore(
    useShallow((state) => ({
      shortcuts: state.shortcuts,
      shortcutDefaults: state.defaults,
      loadShortcuts: state.loadShortcuts,
      setShortcuts: state.setShortcuts,
      resetToDefaults: state.resetToDefaults,
    })),
  );

  const shortcutUpdateLockRef = useRef(false);
  const [isShortcutsUpdating, setIsShortcutsUpdating] = useState(false);

  useEffect(() => {
    if (activeTab !== "shortcuts") return;
    void loadShortcuts();
  }, [activeTab, loadShortcuts]);

  const handleCommitShortcuts = useCallback(
    (nextDrafts: Record<string, string>) => {
      if (shortcutUpdateLockRef.current) return;
      if (Object.keys(nextDrafts).length === 0) return;

      const current = shortcuts as Record<string, string>;
      const hasChanges = Object.entries(nextDrafts).some(
        ([actionId, value]) => (current[actionId] ?? "") !== value,
      );
      if (!hasChanges) return;

      shortcutUpdateLockRef.current = true;
      setIsShortcutsUpdating(true);

      void (async () => {
        try {
          await setShortcuts(nextDrafts as ShortcutMap);
        } catch {
          showToast(t("settings.shortcuts.saveFailed"), "error");
        } finally {
          shortcutUpdateLockRef.current = false;
          setIsShortcutsUpdating(false);
        }
      })();
    },
    [setShortcuts, shortcuts, showToast, t],
  );

  const handleResetShortcuts = useCallback(() => {
    if (shortcutUpdateLockRef.current) return;

    shortcutUpdateLockRef.current = true;
    setIsShortcutsUpdating(true);

    void (async () => {
      try {
        await resetToDefaults();
      } catch {
        showToast(t("settings.shortcuts.resetFailed"), "error");
      } finally {
        shortcutUpdateLockRef.current = false;
        setIsShortcutsUpdating(false);
      }
    })();
  }, [resetToDefaults, showToast, t]);

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
      else if (
        action.id.startsWith("chapter.") ||
        action.id.startsWith("project.")
      )
        groups.chapter.push(action);
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
      else if (
        action.id.startsWith("editor.") ||
        action.id.startsWith("split.")
      )
        groups.editor.push(action);
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

  const getGroupIcon = useCallback(
    (key: string) => {
      return SHORTCUT_GROUP_ICON_MAP[key] ?? SHORTCUT_GROUP_ICON_MAP.other;
    },
    [],
  );

  return {
    getGroupIcon,
    getGroupLabel,
    handleCommitShortcuts,
    handleResetShortcuts,
    isShortcutsUpdating,
    shortcutDefaults,
    shortcutGroups,
    shortcuts,
  };
}
