import { createRequire } from "node:module";
import type {
  AppSettings,
  RuntimeSupabaseConfig,
  ShortcutMap,
  SyncSettings,
  WindowMenuBarMode,
} from "../../../shared/types/index.js";

const requireFn = createRequire(import.meta.url);

function getSystemTheme(): "dark" | "light" {
  if (process.env.LUIE_IS_UTILITY_PROCESS === "1") {
    return "dark";
  }
  try {
    const { nativeTheme } = requireFn("electron");
    return nativeTheme?.shouldUseDarkColors ? "dark" : "light";
  } catch {
    return "dark";
  }
}
import {
  APP_DIR_NAME,
  DEFAULT_AUTO_SAVE_ENABLED,
  DEFAULT_AUTO_SAVE_INTERVAL_MS,
  DEFAULT_EDITOR_FONT_FAMILY,
  DEFAULT_EDITOR_FONT_SIZE,
  DEFAULT_EDITOR_LETTER_SPACING,
  DEFAULT_EDITOR_LINE_HEIGHT,
  DEFAULT_EDITOR_MAX_WIDTH,
  DEFAULT_EDITOR_PARAGRAPH_SPACING,
  DEFAULT_EDITOR_WORD_SPACING,
  DEFAULT_EDITOR_THEME_ACCENT,
  DEFAULT_EDITOR_THEME_CONTRAST,
  DEFAULT_EDITOR_THEME_TEMP,
  SETTINGS_FILE_NAME,
  SETTINGS_STORE_NAME,
  SNAPSHOT_FILE_KEEP_COUNT,
} from "../../../shared/constants/index.js";

export const SETTINGS_STORE_APP_DIR_NAME = APP_DIR_NAME;
export const SETTINGS_STORE_FILE_NAME = SETTINGS_FILE_NAME;
export const SETTINGS_STORE_BASENAME = SETTINGS_STORE_NAME;

export const sanitizeSyncSettingsForRenderer = (
  sync: SyncSettings | undefined,
): SyncSettings | undefined => {
  if (!sync) return undefined;
  return {
    connected: sync.connected ?? false,
    provider: sync.provider,
    email: sync.email,
    userId: sync.userId,
    expiresAt: sync.expiresAt,
    autoSync: sync.autoSync ?? true,
    lastSyncedAt: sync.lastSyncedAt,
    lastError: sync.lastError,
    projectLastSyncedAtByProjectId: sync.projectLastSyncedAtByProjectId,
  };
};

/**
 * 기본 단축키.
 *
 * WHY 소문자 canonical 표기인가: 저장되는 값은 설정 화면의 기록 결과와 같은 표기여야
 * 한다. 과거에는 이 표가 `Cmd+,`를 만들고 기록은 `cmd+comma`를 만들어, 같은 물리
 * 조합이 두 문자열로 공존했다. 그 결과 충돌 감지가 두 액션이 같은 키를 물고 있는
 * 상황을 놓쳤고 등록 순서가 빠른 한쪽만 발화했다.
 *
 * 표기 규칙은 `shared/utils/shortcutAccelerator.ts`가 정한다. 수정자 순서는
 * cmd → ctrl → alt → shift, 구두점은 이름 토큰(`comma`)을 쓴다.
 * `settingsShortcutDefaults.test.ts`가 이 표의 모든 값이 canonical·유효함을 고정한다.
 */
const getDefaultShortcuts = (platform: NodeJS.Platform): ShortcutMap => {
  const mod = platform === "darwin" ? "cmd" : "ctrl";

  return {
    "app.openSettings": `${mod}+comma`,
    "app.closeWindow": `${mod}+w`,
    "app.quit": `${mod}+q`,
    "chapter.new": `${mod}+n`,
    "chapter.save": `${mod}+s`,
    "chapter.delete": `${mod}+backspace`,
    "chapter.open.1": `${mod}+1`,
    "chapter.open.2": `${mod}+2`,
    "chapter.open.3": `${mod}+3`,
    "chapter.open.4": `${mod}+4`,
    "chapter.open.5": `${mod}+5`,
    "chapter.open.6": `${mod}+6`,
    "chapter.open.7": `${mod}+7`,
    "chapter.open.8": `${mod}+8`,
    "chapter.open.9": `${mod}+9`,
    "chapter.open.0": `${mod}+0`,
    "view.toggleSidebar": `${mod}+b`,
    "view.sidebar.open": "",
    "view.sidebar.close": "",
    "view.toggleContextPanel": `${mod}+shift+b`,
    "view.context.open": "",
    "view.context.close": "",
    "sidebar.section.manuscript.toggle": "",
    "sidebar.section.snapshot.open": "",
    "sidebar.section.trash.open": "",
    "project.rename": "",
    "research.open.character": `${mod}+t`,
    "research.open.world": "",
    "research.open.scrap": "",
    "research.open.analysis": "",
    "research.open.character.left": "",
    "research.open.world.left": "",
    "research.open.scrap.left": "",
    "research.open.analysis.left": "",
    "character.openTemplate": "",
    "world.tab.synopsis": "",
    "world.tab.terms": "",
    "world.tab.mindmap": "",
    "world.tab.drawing": "",
    "world.tab.plot": "",
    "world.tab.graph": `${mod}+shift+g`,
    "world.addTerm": "",
    "scrap.addMemo": "",
    "export.openPreview": "",
    "export.openWindow": "",
    "editor.openRight": "",
    "editor.openLeft": "",
    "split.swapSides": "",
    "editor.fontSize.increase": "",
    "editor.fontSize.decrease": "",
    "window.toggleFullscreen": "f11",
  };
};

export const DEFAULT_SHORTCUTS = getDefaultShortcuts(process.platform);
export const DEFAULT_MENU_BAR_MODE: WindowMenuBarMode =
  process.platform === "darwin" ? "visible" : "hidden";

export const normalizeRuntimeSupabaseConfig = (
  value: unknown,
): RuntimeSupabaseConfig | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const url =
    typeof (value as { url?: unknown }).url === "string"
      ? (value as { url: string }).url.trim()
      : "";
  const anonKey =
    typeof (value as { anonKey?: unknown }).anonKey === "string"
      ? (value as { anonKey: string }).anonKey.trim()
      : "";
  if (url.length === 0 || anonKey.length === 0) {
    return undefined;
  }
  return {
    url: url.endsWith("/") ? url.slice(0, -1) : url,
    anonKey,
  };
};

export const getDefaultSettings = (): AppSettings => ({
  editor: {
    fontFamily: DEFAULT_EDITOR_FONT_FAMILY,
    fontPreset: undefined,
    fontSize: DEFAULT_EDITOR_FONT_SIZE,
    lineHeight: DEFAULT_EDITOR_LINE_HEIGHT,
    letterSpacing: DEFAULT_EDITOR_LETTER_SPACING,
    wordSpacing: DEFAULT_EDITOR_WORD_SPACING,
    paragraphSpacing: DEFAULT_EDITOR_PARAGRAPH_SPACING,
    maxWidth: DEFAULT_EDITOR_MAX_WIDTH,
    spellcheckEnabled: true,
    theme: getSystemTheme(),
    themeContrast: DEFAULT_EDITOR_THEME_CONTRAST,
    themeTemp: DEFAULT_EDITOR_THEME_TEMP,
    themeAccent: DEFAULT_EDITOR_THEME_ACCENT,
    uiMode: "default",
    enableAnimations: true,
    typewriterMode: false,
  },
  language: "ko",
  shortcuts: DEFAULT_SHORTCUTS,
  lastProjectPath: undefined,
  autoSaveEnabled: DEFAULT_AUTO_SAVE_ENABLED,
  autoSaveInterval: DEFAULT_AUTO_SAVE_INTERVAL_MS,
  snapshotExportLimit: SNAPSHOT_FILE_KEEP_COUNT,
  windowBounds: undefined,
  lastWindowState: undefined,
  menuBarMode: DEFAULT_MENU_BAR_MODE,
  sync: {
    connected: false,
    autoSync: true,
  } as SyncSettings,
  startup: {},
  llm: {
    preferredProvider: "auto",
    openaiApiKey: "",
    geminiApiKey: "",
    ollama: {
      baseUrl: "http://localhost:11434",
      chatModel: "",
      embeddingModel: "",
      apiKey: "",
    },
    ragTemperature: 0.2,
    ragMaxTokens: 1200,
    searchOptimizationMode: "standard",
  },
});
