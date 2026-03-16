const COMMON_FEATURE_KEYS = [
  "toolbar",
  "textEditor",
  "mainLayout",
  "analysis",
  "slashMenu",
  "character",
  "world",
  "exportPreview",
  "exportWindow",
  "snapshot",
  "scrivener",
  "trash",
] as const;

type LocaleWithCommon = {
  common?: Record<string, unknown>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeCommonFeatureNamespaces = <T extends LocaleWithCommon>(
  locale: T,
): T => {
  if (!isRecord(locale.common)) {
    return locale;
  }

  const common = locale.common;
  const editor = isRecord(common.editor) ? common.editor : null;
  if (!editor) {
    return locale;
  }

  const normalizedCommon: Record<string, unknown> = { ...common };
  for (const key of COMMON_FEATURE_KEYS) {
    if (normalizedCommon[key] === undefined && editor[key] !== undefined) {
      normalizedCommon[key] = editor[key];
    }
  }

  return {
    ...locale,
    common: normalizedCommon,
  };
};

export type LocaleResources = LocaleWithCommon;

export const loadLocaleResources = async (
  language: "ko" | "en" | "ja",
): Promise<LocaleResources> => {
  switch (language) {
    case "en": {
      const module = await import("@renderer/i18n/locales/en");
      return normalizeCommonFeatureNamespaces(module.en);
    }
    case "ja": {
      const module = await import("@renderer/i18n/locales/ja");
      return normalizeCommonFeatureNamespaces(module.ja);
    }
    case "ko":
    default: {
      const module = await import("@renderer/i18n/locales/ko");
      return normalizeCommonFeatureNamespaces(module.ko);
    }
  }
};
