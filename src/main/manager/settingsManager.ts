/**
 * Settings manager - electron-store를 통한 영구 설정 관리
 */

import Store from "electron-store";
import { app } from "electron";
import { createLogger } from "../../shared/logger/index.js";
import { existsSync } from "node:fs";
import type { AppSettings, EditorSettings, ShortcutMap, WindowBounds, WindowState } from "../../shared/types/index.js";
import {
  DEFAULT_AUTO_SAVE_ENABLED,
  DEFAULT_AUTO_SAVE_INTERVAL_MS,
  DEFAULT_EDITOR_FONT_FAMILY,
  DEFAULT_EDITOR_FONT_PRESET,
  DEFAULT_EDITOR_FONT_SIZE,
  DEFAULT_EDITOR_LINE_HEIGHT,
  DEFAULT_EDITOR_MAX_WIDTH,
  DEFAULT_EDITOR_THEME,
  APP_DIR_NAME,
  SETTINGS_FILE_NAME,
  SETTINGS_STORE_NAME,
} from "../../shared/constants/index.js";

const logger = createLogger("SettingsManager");

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
    "world.addTerm": "",
    "scrap.addMemo": "",
    "export.openPreview": "",
    "export.openWindow": "",
    "editor.openRight": "",
    "editor.openLeft": "",
    "split.swapSides": "",
    "editor.fontSize.increase": "",
    "editor.fontSize.decrease": "",
    "window.toggleFullscreen": "",
  };
};

const DEFAULT_SHORTCUTS = getDefaultShortcuts(process.platform);

const DEFAULT_SETTINGS: AppSettings = {
  editor: {
    fontFamily: DEFAULT_EDITOR_FONT_FAMILY,
    fontPreset: DEFAULT_EDITOR_FONT_PRESET,
    fontSize: DEFAULT_EDITOR_FONT_SIZE,
    lineHeight: DEFAULT_EDITOR_LINE_HEIGHT,
    maxWidth: DEFAULT_EDITOR_MAX_WIDTH,
    theme: DEFAULT_EDITOR_THEME,
  },
  language: "ko",
  shortcuts: DEFAULT_SHORTCUTS,
  lastProjectPath: undefined,
  autoSaveEnabled: DEFAULT_AUTO_SAVE_ENABLED,
  autoSaveInterval: DEFAULT_AUTO_SAVE_INTERVAL_MS,
  windowBounds: undefined,
  lastWindowState: undefined,
};

export class SettingsManager {
  private static instance: SettingsManager;
  private store: Store<AppSettings>;

  private constructor() {
    const settingsPath = app.getPath("userData");

    // 기존(레거시) 경로: userData/luie/settings/settings.json
    // app.getPath('userData')가 이미 '.../luie'인 경우 이중으로 들어가 혼동을 유발했음
    const legacyCwd = `${settingsPath}/${APP_DIR_NAME}/${SETTINGS_STORE_NAME}`;
    const legacyFile = `${legacyCwd}/${SETTINGS_FILE_NAME}`;

    this.store = new Store<AppSettings>({
      name: SETTINGS_STORE_NAME,
      defaults: DEFAULT_SETTINGS,
      // 저장 위치: userData/settings.json
      cwd: settingsPath,
      encryptionKey: undefined, // 필요하다면 암호화 키 추가
      fileExtension: "json",
    });

    // 레거시 파일이 있고 새 파일이 아직 없으면 마이그레이션
    if (existsSync(legacyFile) && !existsSync(this.store.path)) {
      try {
        const legacyStore = new Store<AppSettings>({
          name: SETTINGS_STORE_NAME,
          defaults: DEFAULT_SETTINGS,
          cwd: legacyCwd,
          fileExtension: "json",
        });
        this.store.set(legacyStore.store);
        logger.info("Settings migrated from legacy path", {
          from: legacyStore.path,
          to: this.store.path,
        });
      } catch (error) {
        logger.error("Failed to migrate legacy settings", error);
      }
    }

    logger.info("Settings manager initialized", {
      path: this.store.path,
    });
  }

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  // 전체 설정 가져오기
  getAll(): AppSettings {
    return this.store.store;
  }

  // 전체 설정 저장
  setAll(settings: Partial<AppSettings>): void {
    const current = this.store.store;
    const merged: AppSettings = {
      editor: { ...current.editor, ...(settings.editor || {}) },
      language: settings.language ?? current.language,
      shortcuts: settings.shortcuts ?? current.shortcuts,
      lastProjectPath: settings.lastProjectPath ?? current.lastProjectPath,
      autoSaveEnabled: settings.autoSaveEnabled ?? current.autoSaveEnabled,
      autoSaveInterval: settings.autoSaveInterval ?? current.autoSaveInterval,
      windowBounds: settings.windowBounds ?? current.windowBounds,
      lastWindowState: settings.lastWindowState ?? current.lastWindowState,
    };
    this.store.set(merged);
    logger.info("Settings updated", { settings: merged });
  }

  // 에디터 설정
  getEditorSettings(): EditorSettings {
    return this.store.get("editor");
  }

  setEditorSettings(settings: Partial<EditorSettings>): void {
    this.store.set("editor", { ...this.getEditorSettings(), ...settings });
    logger.info("Editor settings updated", { settings });
  }

  // 개별 에디터 설정 편의 메서드
  setEditorTheme(theme: EditorSettings["theme"]): void {
    this.setEditorSettings({ theme });
  }

  setEditorFontSize(fontSize: number): void {
    this.setEditorSettings({ fontSize });
  }

  setEditorLineHeight(lineHeight: number): void {
    this.setEditorSettings({ lineHeight });
  }

  setEditorFontFamily(fontFamily: EditorSettings["fontFamily"]): void {
    this.setEditorSettings({ fontFamily });
  }

  // 언어 설정
  getLanguage(): AppSettings["language"] {
    return this.store.get("language");
  }

  setLanguage(language: NonNullable<AppSettings["language"]>): void {
    this.store.set("language", language);
  }

  // 단축키 설정
  getShortcuts(): { shortcuts: ShortcutMap; defaults: ShortcutMap } {
    const stored = this.store.get("shortcuts") ?? {};
    const shortcuts = { ...DEFAULT_SHORTCUTS, ...(stored as Partial<ShortcutMap>) };
    return { shortcuts, defaults: DEFAULT_SHORTCUTS };
  }

  setShortcuts(shortcuts: Partial<ShortcutMap>): ShortcutMap {
    const merged = { ...DEFAULT_SHORTCUTS, ...shortcuts };
    this.store.set("shortcuts", merged);
    return merged;
  }

  // 프로젝트 경로
  getLastProjectPath(): string | undefined {
    return this.store.get("lastProjectPath");
  }

  setLastProjectPath(path: string): void {
    this.store.set("lastProjectPath", path);
  }

  // 자동 저장 설정
  getAutoSaveEnabled(): boolean {
    return this.store.get("autoSaveEnabled");
  }

  setAutoSaveEnabled(enabled: boolean): void {
    this.store.set("autoSaveEnabled", enabled);
  }

  getAutoSaveInterval(): number {
    return this.store.get("autoSaveInterval");
  }

  setAutoSaveInterval(interval: number): void {
    this.store.set("autoSaveInterval", interval);
  }

  // 윈도우 상태
  getWindowBounds() {
    return this.store.get("windowBounds");
  }

  setWindowBounds(bounds: WindowBounds): void {
    this.store.set("windowBounds", bounds);
  }

  getLastWindowState() {
    return this.store.get("lastWindowState");
  }

  setLastWindowState(state: WindowState): void {
    this.store.set("lastWindowState", state);
  }

  // 설정 초기화
  resetToDefaults(): void {
    this.store.clear();
    logger.info("Settings reset to defaults");
  }

  // 저장 경로 가져오기 (디버깅용)
  getSettingsPath(): string {
    return this.store.path;
  }
}

export const settingsManager = SettingsManager.getInstance();
