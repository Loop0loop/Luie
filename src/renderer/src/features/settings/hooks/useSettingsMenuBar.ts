import { useCallback, useEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";
import type { ToastContextType } from "@shared/ui/ToastContext";
import type { WindowMenuBarMode } from "@shared/types";
import { api } from "@shared/api";

type ShowToast = ToastContextType["showToast"];

export function useSettingsMenuBar(t: TFunction, showToast: ShowToast) {
  const [menuBarMode, setMenuBarMode] =
    useState<WindowMenuBarMode>("visible");
  const [isMenuBarUpdating, setIsMenuBarUpdating] = useState(false);
  const menuBarModeRef = useRef<WindowMenuBarMode>("visible");
  const menuBarUpdateLockRef = useRef(false);
  const isMacOS = navigator.platform.toLowerCase().includes("mac");

  useEffect(() => {
    menuBarModeRef.current = menuBarMode;
  }, [menuBarMode]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const response = await api.settings.getMenuBarMode();
      if (!response.success || !response.data || cancelled) return;

      const mode = (response.data as { mode?: WindowMenuBarMode }).mode;
      if (mode === "hidden" || mode === "visible") {
        menuBarModeRef.current = mode;
        setMenuBarMode(mode);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleMenuBarMode = useCallback(
    (mode: WindowMenuBarMode) => {
      void (async () => {
        if (menuBarUpdateLockRef.current || menuBarModeRef.current === mode) {
          return;
        }

        menuBarUpdateLockRef.current = true;
        setIsMenuBarUpdating(true);
        try {
          const response = await api.settings.setMenuBarMode({ mode });
          if (!response.success) {
            showToast(t("settings.menuBar.applyFailed"), "error");
            return;
          }

          const nextMode = response.data?.mode;
          const resolvedMode =
            nextMode === "hidden" || nextMode === "visible" ? nextMode : mode;
          menuBarModeRef.current = resolvedMode;
          setMenuBarMode(resolvedMode);
        } catch {
          showToast(t("settings.menuBar.applyFailed"), "error");
        } finally {
          menuBarUpdateLockRef.current = false;
          setIsMenuBarUpdating(false);
        }
      })();
    },
    [showToast, t],
  );

  return {
    handleMenuBarMode,
    isMacOS,
    isMenuBarUpdating,
    menuBarMode,
  };
}
