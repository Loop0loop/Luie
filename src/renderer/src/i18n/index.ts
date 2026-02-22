import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { resources } from "@renderer/i18n/resources";
import { api } from "@shared/api";

export const SUPPORTED_LANGUAGES = ["ko", "en", "ja"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export async function initI18n(): Promise<typeof i18n> {
  if (i18n.isInitialized) {
    return i18n;
  }

  await i18n
    .use(initReactI18next)
    .use(LanguageDetector)
    .init({
      resources,
      fallbackLng: "ko",
      supportedLngs: SUPPORTED_LANGUAGES,
      defaultNS: "common",
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
      },
    });

  try {
    const response = await api.settings.getAll();
    const savedLanguage = response.success ? response.data?.language : undefined;
    if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
      await i18n.changeLanguage(savedLanguage);
    }
  } catch {
    // Best effort; default language already set
  }

  return i18n;
}

export async function setLanguage(language: SupportedLanguage): Promise<void> {
  if (i18n.language !== language) {
    await i18n.changeLanguage(language);
  }
  try {
    await api.settings.setLanguage({ language });
  } catch {
    // Best effort; language still applied locally
  }
}

export { i18n };
