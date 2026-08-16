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
  if (!importSpecifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), importSpecifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    path.join(base, "index.ts"),
    path.join(base, "index.js"),
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
  if (moduleCache.has(absPath)) return moduleCache.get(absPath).exports;

  const source = fs.readFileSync(absPath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: absPath,
  }).outputText;

  const module = { exports: {} };
  moduleCache.set(absPath, module);

  const localRequire = (importSpecifier) => {
    const resolvedLocal = resolveTsModule(importSpecifier, absPath);
    if (resolvedLocal) return loadTsModule(resolvedLocal);
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

const filesToSync = [
  { ko: "src/renderer/src/i18n/locales/ko/base/core.ts", en: "src/renderer/src/i18n/locales/en/base/core.ts", ja: "src/renderer/src/i18n/locales/ja/base/core.ts", varPrefix: "BaseCore" },
  { ko: "src/renderer/src/i18n/locales/ko/base/Settings.ts", en: "src/renderer/src/i18n/locales/en/base/Settings.ts", ja: "src/renderer/src/i18n/locales/ja/base/Settings.ts", varPrefix: "BaseSettings" },
  { ko: "src/renderer/src/i18n/locales/ko/base/settingsAdvanced.ts", en: "src/renderer/src/i18n/locales/en/base/settingsAdvanced.ts", ja: "src/renderer/src/i18n/locales/ja/base/settingsAdvanced.ts", varPrefix: "BaseSettingsAdvanced" },
  { ko: "src/renderer/src/i18n/locales/ko/base/Research.ts", en: "src/renderer/src/i18n/locales/en/base/Research.ts", ja: "src/renderer/src/i18n/locales/ja/base/Research.ts", varPrefix: "BaseResearch" },
  { ko: "src/renderer/src/i18n/locales/ko/base/Editor.ts", en: "src/renderer/src/i18n/locales/en/base/Editor.ts", ja: "src/renderer/src/i18n/locales/ja/base/Editor.ts", varPrefix: "BaseEditor" },
  { ko: "src/renderer/src/i18n/locales/ko/base/Analysis.ts", en: "src/renderer/src/i18n/locales/en/base/Analysis.ts", ja: "src/renderer/src/i18n/locales/ja/base/Analysis.ts", varPrefix: "BaseAnalysis" },
  { ko: "src/renderer/src/i18n/locales/ko/workspace/World.ts", en: "src/renderer/src/i18n/locales/en/workspace/World.ts", ja: "src/renderer/src/i18n/locales/ja/workspace/World.ts", varPrefix: "WorkspaceWorld" },
  { ko: "src/renderer/src/i18n/locales/ko/workspace/writing.ts", en: "src/renderer/src/i18n/locales/en/workspace/writing.ts", ja: "src/renderer/src/i18n/locales/ja/workspace/writing.ts", varPrefix: "WorkspaceWriting" },
  { ko: "src/renderer/src/i18n/locales/ko/export.ts", en: "src/renderer/src/i18n/locales/en/export.ts", ja: "src/renderer/src/i18n/locales/ja/export.ts", varPrefix: "Export" },
  { ko: "src/renderer/src/i18n/locales/ko/snapshot.ts", en: "src/renderer/src/i18n/locales/en/snapshot.ts", ja: "src/renderer/src/i18n/locales/ja/snapshot.ts", varPrefix: "Snapshot" },
  { ko: "src/renderer/src/i18n/locales/ko/scrivener.ts", en: "src/renderer/src/i18n/locales/en/scrivener.ts", ja: "src/renderer/src/i18n/locales/ja/scrivener.ts", varPrefix: "Scrivener" },
  { ko: "src/renderer/src/i18n/locales/ko/trash.ts", en: "src/renderer/src/i18n/locales/en/trash.ts", ja: "src/renderer/src/i18n/locales/ja/trash.ts", varPrefix: "Trash" },
  { ko: "src/renderer/src/i18n/locales/ko/misc.ts", en: "src/renderer/src/i18n/locales/en/misc.ts", ja: "src/renderer/src/i18n/locales/ja/misc.ts", varPrefix: "Misc" },
  { ko: "src/renderer/src/i18n/locales/ko/modules/worldGraph.ts", en: "src/renderer/src/i18n/locales/en/modules/worldGraph.ts", ja: "src/renderer/src/i18n/locales/ja/modules/worldGraph.ts", varPrefix: "WorldGraph" },
  { ko: "src/renderer/src/i18n/locales/ko/modules/canvas.ts", en: "src/renderer/src/i18n/locales/en/modules/canvas.ts", ja: "src/renderer/src/i18n/locales/ja/modules/canvas.ts", varPrefix: "Canvas" },
];

const predefinedTranslations = {
  en: {
    "tabs": {
      "chat": "Chat",
      "review": "Review"
    },
    "explorerTitle": "Explorer",
    "focus": "Focus Mode",
    "callout": "Callout",
    "bold": "Bold",
    "italic": "Italic",
    "underline": "Underline",
    "strikethrough": "Strikethrough",
    "highlight": "Highlight",
    "textColor": "Text Color",
    "quote": "Quote",
    "addTerm": "Add Term",
    "emptySelection": "Empty Selection",
    "addTermSuccess": "Term added successfully",
    "unsaved": "Unsaved",
    "noSelection": "No Selection",
    "synopsis": "Synopsis",
    "metadata": "Metadata",
    "notes": "Notes",
    "snapshots": "Snapshots",
    "placeholder": "Enter details...",
    "image": "Image",
    "created": "Created",
    "modified": "Modified",
    "words": "Words",
    "label": "Label",
    "status": "Status",
    "none": "None",
    "concept": "Concept",
    "draft": "Draft",
    "todo": "To Do",
    "inprogress": "In Progress",
    "done": "Done",
    "document": "Document Notes",
    "comingSoon": "Coming Soon",
    "typography": "Typography",
    "sceneDivider": "Scene Divider",
    "clearFormatting": "Clear Formatting",
    "selectAll": "Select All",
    "export": "Export",
    "more": "More",
    "paragraphStyle": "Paragraph Style",
    "fontSize": "Font Size",
    "paragraph": "Paragraph",
    "heading1": "Heading 1",
    "heading2": "Heading 2",
    "heading3": "Heading 3",
    "alignJustify": "Justify Align",
    "letterSpacing": "Letter Spacing",
    "lineHeight": "Line Height",
    "paragraphSpacing": "Paragraph Spacing",
    "bookmark": "Bookmark",
    "newFile": "New File",
    "newFolder": "New Folder",
    "sort": "Sort",
    "closeSidebar": "Close Sidebar",
    "closeCanvas": "Close Canvas",
    "noNodes": {
      "title": "Empty Canvas",
      "description": "Double click to add a node."
    },
    "coreBadge": "Core",
    "dynamic": "Dynamic",
    "static": "Static",
    "blank": "Blank",
    "text": "Text",
    "media": "Media",
    "scenarioAnalysis": "Scenario Analysis",
    "analysisMode": "Analysis Mode",
    "characterMap": "Character Map",
    "eventFlow": "Event Flow",
    "chapterRange": "Chapter Range",
    "allChapters": "All Chapters",
    "earlyChapters": "Early Chapters",
    "characterFocus": "Character Focus",
    "eventFocus": "Event Focus",
    "viewAllNetwork": "View Entire Network",
    "authorGuide": "Author Guide",
    "characterGuideTip": "Trace character relationship paths.",
    "eventGuideTip": "Follow the main plot timeline.",
    "jinseo": "Jinseo",
    "serin": "Serin",
    "ambush": "Ambush",
    "rebels": "Rebels"
  },
  ja: {
    "tabs": {
      "chat": "チャット",
      "review": "設定検定"
    },
    "explorerTitle": "エクスプローラー",
    "focus": "フォーカスモード",
    "callout": "コールアウト",
    "bold": "太字",
    "italic": "斜体",
    "underline": "下線",
    "strikethrough": "打ち消し線",
    "highlight": "ハイライト",
    "textColor": "文字色",
    "quote": "引用",
    "addTerm": "用語を追加",
    "emptySelection": "選択範囲が空です",
    "addTermSuccess": "用語が追加されました",
    "unsaved": "未保存",
    "noSelection": "選択なし",
    "synopsis": "あらすじ",
    "metadata": "メタデータ",
    "notes": "メモ",
    "snapshots": "スナップショット",
    "placeholder": "詳細を入力してください...",
    "image": "画像",
    "created": "作成日時",
    "modified": "更新日時",
    "words": "文字数",
    "label": "ラベル",
    "status": "ステータス",
    "none": "なし",
    "concept": "コンセプト",
    "draft": "ドラフト",
    "todo": "未着手",
    "inprogress": "進行中",
    "done": "完了",
    "document": "ドキュメントメモ",
    "comingSoon": "近日公開",
    "typography": "タイポグラフィ",
    "sceneDivider": "シーン区切り",
    "clearFormatting": "書式をクリア",
    "selectAll": "すべて選択",
    "export": "エクスポート",
    "more": "もっと見る",
    "paragraphStyle": "段落スタイル",
    "fontSize": "フォントサイズ",
    "paragraph": "標準テキスト",
    "heading1": "見出し 1",
    "heading2": "見出し 2",
    "heading3": "見出し 3",
    "alignJustify": "両端揃え",
    "letterSpacing": "文字間隔",
    "lineHeight": "行間",
    "paragraphSpacing": "段落間隔",
    "bookmark": "ブックマーク",
    "newFile": "新規ファイル",
    "newFolder": "新規フォルダ",
    "sort": "ソート",
    "closeSidebar": "サイドバーを閉じる",
    "closeCanvas": "キャンバスを閉じる",
    "noNodes": {
      "title": "空のキャンバス",
      "description": "ダブルクリックでノードを追加します。"
    },
    "coreBadge": "コア",
    "dynamic": "動的",
    "static": "静的",
    "blank": "空白",
    "text": "テキスト",
    "media": "メディア",
    "scenarioAnalysis": "シナリオ分析",
    "analysisMode": "分析モード",
    "characterMap": "相関図",
    "eventFlow": "イベントフロー",
    "chapterRange": "章の範囲",
    "allChapters": "すべての章",
    "earlyChapters": "序盤の章",
    "characterFocus": "キャラクターフォーカス",
    "eventFocus": "イベントフォーカス",
    "viewAllNetwork": "ネットワーク全体を表示",
    "authorGuide": "作家ガイド",
    "characterGuideTip": "キャラクターの人間関係のパスをたどります。",
    "eventGuideTip": "プロットのタイムラインをたどります。",
    "jinseo": "ジンソ",
    "serin": "セリン",
    "ambush": "待ち伏せ",
    "rebels": "反乱軍"
  }
};

const findTranslation = (lang, keyPath, koVal) => {
  const dict = predefinedTranslations[lang];
  let current = dict;
  const parts = keyPath.split(".");
  
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      current = undefined;
      break;
    }
  }

  if (current !== undefined) return current;

  const lastKey = parts[parts.length - 1];
  if (dict && lastKey in dict) {
    const val = dict[lastKey];
    if (typeof val === "string") return val;
  }

  return koVal;
};

const syncObjects = (template, target, lang, pathPrefix = "") => {
  const result = {};

  for (const key of Object.keys(template)) {
    const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    const koVal = template[key];

    if (koVal && typeof koVal === "object" && !Array.isArray(koVal)) {
      const targetVal = target && target[key] && typeof target[key] === "object" ? target[key] : {};
      result[key] = syncObjects(koVal, targetVal, lang, currentPath);
    } else {
      if (target && key in target) {
        result[key] = target[key];
      } else {
        result[key] = findTranslation(lang, currentPath, koVal);
      }
    }
  }

  return result;
};

const stringifyObj = (obj, indent = 2) => {
  const spaces = " ".repeat(indent);
  if (obj === null) return "null";
  if (typeof obj === "string") {
    return JSON.stringify(obj);
  }
  if (typeof obj !== "object") return String(obj);
  if (Array.isArray(obj)) {
    return `[\n${obj.map(item => spaces + "  " + stringifyObj(item, indent + 2)).join(",\n")}\n${spaces}]`;
  }

  const entries = Object.entries(obj);
  if (entries.length === 0) return "{}";

  const lines = entries.map(([key, val]) => {
    const formattedKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
    return `${spaces}  ${formattedKey}: ${stringifyObj(val, indent + 2)}`;
  });

  return `{\n${lines.join(",\n")},\n${spaces}}`;
};

for (const entry of filesToSync) {
  console.log(`Syncing ${entry.ko} ...`);

  const koExports = loadTsModule(entry.ko);
  const enExports = fs.existsSync(entry.en) ? loadTsModule(entry.en) : {};
  const jaExports = fs.existsSync(entry.ja) ? loadTsModule(entry.ja) : {};

  const koKeys = Object.keys(koExports);
  if (koKeys.length === 0) {
    console.error(`No exports found in ${entry.ko}`);
    continue;
  }
  const mainExportKeyKo = koKeys[0];
  const koObj = koExports[mainExportKeyKo];

  const enExportKey = `en${entry.varPrefix}`;
  const enObjRaw = enExports[enExportKey] || enExports.default || Object.values(enExports)[0] || {};
  const syncedEnObj = syncObjects(koObj, enObjRaw, "en");

  const jaExportKey = `ja${entry.varPrefix}`;
  const jaObjRaw = jaExports[jaExportKey] || jaExports.default || Object.values(jaExports)[0] || {};
  const syncedJaObj = syncObjects(koObj, jaObjRaw, "ja");

  const formatFileContent = (varName, obj) => {
    return `export const ${varName} = ${stringifyObj(obj, 0)} as const;\n`;
  };

  fs.writeFileSync(entry.en, formatFileContent(enExportKey, syncedEnObj), "utf8");
  fs.writeFileSync(entry.ja, formatFileContent(jaExportKey, syncedJaObj), "utf8");

  console.log(`Synced EN -> ${entry.en}`);
  console.log(`Synced JA -> ${entry.ja}`);
}

console.log("i18n Parity Sync Completed Successfully!");
