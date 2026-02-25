import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const nodeRequire = createRequire(import.meta.url);

const localeFiles = {
  ko: path.resolve("src/renderer/src/i18n/locales/ko.ts"),
  en: path.resolve("src/renderer/src/i18n/locales/en.ts"),
  ja: path.resolve("src/renderer/src/i18n/locales/ja.ts"),
};

const moduleCache = new Map();

const resolveTsModule = (importSpecifier, fromFile) => {
  if (!importSpecifier.startsWith(".")) {
    return null;
  }

  const base = path.resolve(path.dirname(fromFile), importSpecifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.mjs`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.js"),
    path.join(base, "index.mjs"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  throw new Error(`Unable to resolve module "${importSpecifier}" from ${fromFile}`);
};

const loadTsModule = (filePath) => {
  const absPath = path.resolve(filePath);
  const cached = moduleCache.get(absPath);
  if (cached) {
    return cached.exports;
  }

  const source = fs.readFileSync(absPath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: absPath,
    reportDiagnostics: false,
  }).outputText;

  const module = { exports: {} };
  moduleCache.set(absPath, module);

  const localRequire = (importSpecifier) => {
    const resolvedLocal = resolveTsModule(importSpecifier, absPath);
    if (resolvedLocal) {
      return loadTsModule(resolvedLocal);
    }
    return nodeRequire(importSpecifier);
  };

  const sandbox = {
    module,
    exports: module.exports,
    require: localRequire,
    __dirname: path.dirname(absPath),
    __filename: absPath,
    console,
    process,
  };

  vm.createContext(sandbox);
  vm.runInContext(transpiled, sandbox, { filename: absPath });
  return module.exports;
};

const loadLocale = (language, filePath) => {
  const mod = loadTsModule(filePath);
  if (mod?.[language]) return mod[language];
  if (mod?.default) return mod.default;
  return mod;
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
    loadLocale(language, filePath),
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
