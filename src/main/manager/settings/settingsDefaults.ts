import { nativeTheme } from "electron";
import type {
  AppSettings,
  RuntimeSupabaseConfig,
  ShortcutMap,
  SyncSettings,
  WindowMenuBarMode,
} from "../../../shared/types/index.js";
import {
  APP_DIR_NAME,
  DEFAULT_AUTO_SAVE_ENABLED,
  DEFAULT_AUTO_SAVE_INTERVAL_MS,
  DEFAULT_EDITOR_FONT_FAMILY,
  DEFAULT_EDITOR_FONT_PRESET,
  DEFAULT_EDITOR_FONT_SIZE,
  DEFAULT_EDITOR_LINE_HEIGHT,
  DEFAULT_EDITOR_MAX_WIDTH,
  DEFAULT_EDITOR_THEME_ACCENT,
  DEFAULT_EDITOR_THEME_CONTRAST,
  DEFAULT_EDITOR_THEME_TEMP,
  DEFAULT_EDITOR_THEME_TEXTURE,
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

const getDefaultShortcuts = (platform: NodeJS.Platform): ShortcutMap => {
  const mod = platform === "darwin" ? "Cmd" : "Ctrl";

  return {
    "app.openSettings": `${mod}+,`,
    "app.closeWindow": `${mod}+W`,
    "app.quit": `${mod}+Q`,
    "chapter.new": `${mod}+N`,
    "chapter.save": `${mod}+S`,
    "chapter.delete": `${mod}+Backspace`,
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
    "view.toggleSidebar": `${mod}+B`,
    "view.sidebar.open": "",
    "view.sidebar.close": "",
    "view.toggleContextPanel": `${mod}+Shift+B`,
    "view.context.open": "",
    "view.context.close": "",
    "sidebar.section.manuscript.toggle": "",
    "sidebar.section.snapshot.open": "",
    "sidebar.section.trash.open": "",
    "project.rename": "",
    "research.open.character": `${mod}+T`,
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
    "world.tab.graph": `${mod}+Shift+G`,
    "world.addTerm": "",
    "scrap.addMemo": "",
    "export.openPreview": "",
    "export.openWindow": "",
    "editor.openRight": "",
    "editor.openLeft": "",
    "split.swapSides": "",
    "editor.fontSize.increase": "",
    "editor.fontSize.decrease": "",
    "window.toggleFullscreen": "F11",
    "view.toggleFocusMode": "Shift+F11",
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
    fontPreset: DEFAULT_EDITOR_FONT_PRESET,
    fontSize: DEFAULT_EDITOR_FONT_SIZE,
    lineHeight: DEFAULT_EDITOR_LINE_HEIGHT,
    maxWidth: DEFAULT_EDITOR_MAX_WIDTH,
    theme: nativeTheme.shouldUseDarkColors ? "dark" : "light",
    themeTemp: DEFAULT_EDITOR_THEME_TEMP,
    themeContrast: DEFAULT_EDITOR_THEME_CONTRAST,
    themeAccent: DEFAULT_EDITOR_THEME_ACCENT,
    themeTexture: DEFAULT_EDITOR_THEME_TEXTURE,
    uiMode: "default",
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
});
