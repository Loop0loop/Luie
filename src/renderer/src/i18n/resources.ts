import { en } from "@renderer/i18n/locales/en";
import { ja } from "@renderer/i18n/locales/ja";
import { ko } from "@renderer/i18n/locales/ko";

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

const normalizeCommonFeatureNamespaces = <T extends LocaleWithCommon>(locale: T): T => {
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

export const resources = {
  ko: normalizeCommonFeatureNamespaces(ko),
  en: normalizeCommonFeatureNamespaces(en),
  ja: normalizeCommonFeatureNamespaces(ja),
} as const;
