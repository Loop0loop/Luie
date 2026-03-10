import type { SupportedLanguage } from "@renderer/i18n";

type FontKey = "inter" | "noto-sans-kr" | "noto-sans-jp";

const FONT_LOADERS: Record<FontKey, () => Promise<unknown>> = {
  inter: () => import("@fontsource-variable/inter/index.css"),
  "noto-sans-kr": () => import("@fontsource-variable/noto-sans-kr/index.css"),
  "noto-sans-jp": () => import("@fontsource-variable/noto-sans-jp/index.css"),
};

const loadedFonts = new Set<FontKey>();
const pendingFonts = new Map<FontKey, Promise<void>>();

const normalizeLanguage = (value: string | null | undefined): SupportedLanguage => {
  if (!value) return "ko";

  const normalized = value.toLowerCase();
  if (normalized.startsWith("ja")) return "ja";
  if (normalized.startsWith("en")) return "en";
  return "ko";
};

const loadFont = (fontKey: FontKey): Promise<void> => {
  if (loadedFonts.has(fontKey)) {
    return Promise.resolve();
  }

  const pending = pendingFonts.get(fontKey);
  if (pending) {
    return pending;
  }

  const nextPromise = FONT_LOADERS[fontKey]()
    .then(() => {
      loadedFonts.add(fontKey);
    })
    .finally(() => {
      pendingFonts.delete(fontKey);
    });

  pendingFonts.set(fontKey, nextPromise);
  return nextPromise;
};

export const detectPreferredLanguage = (): SupportedLanguage => {
  if (typeof window === "undefined") {
    return "ko";
  }

  try {
    const savedLanguage = window.localStorage.getItem("i18nextLng");
    if (savedLanguage) {
      return normalizeLanguage(savedLanguage);
    }
  } catch {
    // Ignore storage access failures and fall back to navigator.
  }

  return normalizeLanguage(window.navigator.language);
};

export const loadFontsForLanguage = async (
  language: SupportedLanguage,
): Promise<void> => {
  const fontKeys: FontKey[] = ["inter"];

  if (language === "ko") {
    fontKeys.push("noto-sans-kr");
  } else if (language === "ja") {
    fontKeys.push("noto-sans-jp");
  }

  await Promise.all(fontKeys.map((fontKey) => loadFont(fontKey)));
};

type I18nLike = {
  language?: string;
  resolvedLanguage?: string;
  on?: (eventName: "languageChanged", listener: (language: string) => void) => void;
};

export const startRendererFontLoading = (
  i18nPromise?: Promise<I18nLike>,
): void => {
  const preferredLanguage = detectPreferredLanguage();
  void loadFontsForLanguage(preferredLanguage);

  if (!i18nPromise) return;

  void i18nPromise.then((i18n) => {
    const syncLanguage = (language?: string) => {
      void loadFontsForLanguage(normalizeLanguage(language));
    };

    syncLanguage(i18n.resolvedLanguage ?? i18n.language ?? preferredLanguage);
    i18n.on?.("languageChanged", syncLanguage);
  });
};
