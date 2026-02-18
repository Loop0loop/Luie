import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const localeFiles = {
  ko: path.resolve("src/renderer/src/i18n/locales/ko.ts"),
  en: path.resolve("src/renderer/src/i18n/locales/en.ts"),
  ja: path.resolve("src/renderer/src/i18n/locales/ja.ts"),
};

const normalizeModuleSource = (source) => {
  const withoutExport = source.replace(
    /export\s+const\s+\w+\s*=\s*/,
    "module.exports = ",
  );
  return withoutExport.replace(/\}\s*as const;\s*$/m, "}");
};

const loadLocale = (filePath) => {
  const source = fs.readFileSync(filePath, "utf8");
  const normalized = normalizeModuleSource(source);
  const sandbox = { module: { exports: {} }, exports: {} };
  vm.createContext(sandbox);
  vm.runInContext(normalized, sandbox, { filename: filePath });
  return sandbox.module.exports;
};

const flattenKeys = (value, prefix = "", output = []) => {
  if (Array.isArray(value)) {
    output.push(prefix);
    return output;
  }

  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      flattenKeys(value[key], nextPrefix, output);
    }
    return output;
  }

  output.push(prefix);
  return output;
};

const locales = Object.fromEntries(
  Object.entries(localeFiles).map(([language, filePath]) => [
    language,
    loadLocale(filePath),
  ]),
);

const keysByLanguage = Object.fromEntries(
  Object.entries(locales).map(([language, locale]) => [
    language,
    new Set(flattenKeys(locale)),
  ]),
);

const baseLanguage = "ko";
const baseKeys = keysByLanguage[baseLanguage];

let hasMismatch = false;

for (const [language, keys] of Object.entries(keysByLanguage)) {
  if (language === baseLanguage) continue;

  const missing = [...baseKeys].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !baseKeys.has(key));

  if (missing.length === 0 && extra.length === 0) continue;

  hasMismatch = true;
  console.error(`[i18n-parity] ${language} locale mismatch`);

  if (missing.length > 0) {
    console.error(`  Missing (${missing.length}):`);
    missing.forEach((key) => console.error(`    - ${key}`));
  }

  if (extra.length > 0) {
    console.error(`  Extra (${extra.length}):`);
    extra.forEach((key) => console.error(`    + ${key}`));
  }
}

if (hasMismatch) {
  process.exit(1);
}

console.log("[i18n-parity] Locale key parity check passed.");
