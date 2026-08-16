import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { loadLocaleResources, type LocaleResources } from "@renderer/i18n/resources";
import { api } from "@shared/api";

export const SUPPORTED_LANGUAGES = ["ko", "en", "ja"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
let initPromise: Promise<typeof i18n> | null = null;

const detectInitialLanguage = (): SupportedLanguage => {
  try {
    const stored = window.localStorage.getItem("i18nextLng");
    if (stored) {
      return normalizeLanguage(stored);
    }
  } catch {
    // NOTE: 제한된 renderer context에서는 localStorage를 사용할 수 없을 수 있다.
  }

  return normalizeLanguage(navigator.language);
};

const normalizeLanguage = (language: string | undefined): SupportedLanguage => {
  if (!language) return "ko";
  const base = language.split("-")[0];
  return SUPPORTED_LANGUAGES.includes(base as SupportedLanguage)
    ? (base as SupportedLanguage)
    : "ko";
};

const ensureLanguageResources = async (
  language: SupportedLanguage,
): Promise<void> => {
  if (i18n.hasResourceBundle(language, "common")) {
    return;
  }
  const resources = await loadLocaleResources(language);
  i18n.addResourceBundle(language, "common", resources.common, true, true);
};

const loadAllLocaleResources = async (): Promise<
  Record<SupportedLanguage, LocaleResources>
> => {
  const [ko, en, ja] = await Promise.all([
    loadLocaleResources("ko"),
    loadLocaleResources("en"),
    loadLocaleResources("ja"),
  ]);
  return { ko, en, ja };
};

const loadSavedLanguagePreference = async (): Promise<void> => {
  try {
    const response = await api.settings.getLanguage();
    const savedLanguage = normalizeLanguage(
      response.success ? response.data?.language : undefined,
    );

    if (i18n.language !== savedLanguage) {
      await ensureLanguageResources(savedLanguage);
      await i18n.changeLanguage(savedLanguage);
    }
  } catch {
    // NOTE: 저장 언어 조회에 실패해도 기본 언어는 이미 적용돼 있다.
  }
};

export async function initI18n(): Promise<typeof i18n> {
  if (i18n.isInitialized) {
    return i18n;
  }

  if (initPromise) {
    return initPromise;
  }

  const initialLanguage = detectInitialLanguage();
  const allResources = await loadAllLocaleResources();

  initPromise = i18n
    .use(initReactI18next)
    .use(LanguageDetector)
    .init({
      lng: initialLanguage,
      resources: {
        ko: allResources.ko,
        en: allResources.en,
        ja: allResources.ja,
      },
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
      react: {
        useSuspense: false,
      },
    })
    .then(() => {
      // NOTE: 저장 언어 동기화는 첫 paint를 막지 않는다.
      void loadSavedLanguagePreference();
      return i18n;
    })
    .finally(() => {
      if (!i18n.isInitialized) {
        initPromise = null;
      }
    });

  return initPromise;
}

export async function setLanguage(language: SupportedLanguage): Promise<void> {
  if (i18n.language !== language) {
    await ensureLanguageResources(language);
    await i18n.changeLanguage(language);
  }
  try {
    await api.settings.setLanguage({ language });
  } catch {
    // NOTE: 저장 실패와 관계없이 언어는 현재 renderer에 적용된다.
  }
}

export { i18n };
