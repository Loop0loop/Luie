import { useCallback, useEffect, useMemo, useState } from "react";
import type { TFunction } from "i18next";
import { useShallow } from "zustand/react/shallow";
import { useEditorStore, type FontPreset } from "@renderer/features/editor/stores/editorStore";
import { STORAGE_KEY_FONTS_INSTALLED } from "@shared/constants";
import { readLocalStorageJson, writeLocalStorageJson } from "@shared/utils/localStorage";
import { OPTIONAL_FONT_OPTIONS } from "@renderer/features/settings/components/SettingsModalConfig";
import type { OptionalFontOption } from "@renderer/features/settings/components/tabs/types";

const LEGACY_STORAGE_KEY_FONTS_INSTALLED = "luie:fonts-installed";

export function useSettingsEditorPreferences(t: TFunction) {
  const { fontSize, lineHeight } = useEditorStore(
    useShallow((state) => ({
      fontSize: state.fontSize,
      lineHeight: state.lineHeight,
    })),
  );

  const [localFontSize, setLocalFontSize] = useState(fontSize);
  const [localLineHeight, setLocalLineHeight] = useState(lineHeight);
  const [installing, setInstalling] = useState<Record<string, boolean>>({});
  const [installed, setInstalled] = useState<Record<string, boolean>>(() => {
    return (
      readLocalStorageJson<Record<string, boolean>>(STORAGE_KEY_FONTS_INSTALLED) ??
      readLocalStorageJson<Record<string, boolean>>(
        LEGACY_STORAGE_KEY_FONTS_INSTALLED,
      ) ??
      {}
    );
  });

  useEffect(() => {
    setLocalFontSize(fontSize);
  }, [fontSize]);

  useEffect(() => {
    setLocalLineHeight(lineHeight);
  }, [lineHeight]);

  const optionalFonts = useMemo<OptionalFontOption[]>(
    () =>
      OPTIONAL_FONT_OPTIONS.map((font) => ({
        ...font,
        label: t(font.labelKey),
      })),
    [t],
  );

  const persistInstalled = useCallback(
    (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => {
      setInstalled((prev) => {
        const next = updater(prev);
        void writeLocalStorageJson(STORAGE_KEY_FONTS_INSTALLED, next);
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

  const handleInstallFont = useCallback(
    (preset: FontPreset, pkg: string) => {
      void (async () => {
        setInstalling((prev) => ({ ...prev, [preset]: true }));
        try {
          await ensureFontLoaded(pkg);
          persistInstalled((prev) => ({ ...prev, [preset]: true }));
        } finally {
          setInstalling((prev) => ({ ...prev, [preset]: false }));
        }
      })();
    },
    [ensureFontLoaded, persistInstalled],
  );

  return {
    fontSize,
    handleInstallFont,
    installed,
    installing,
    lineHeight,
    localFontSize,
    localLineHeight,
    optionalFonts,
    setLocalFontSize,
    setLocalLineHeight,
  };
}
