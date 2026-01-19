/**
 * Settings manager - electron-store를 통한 영구 설정 관리
 */

import Store from "electron-store";
import { app } from "electron";
import { createLogger } from "../../shared/logger/index.js";

const logger = createLogger("SettingsManager");

interface EditorSettings {
  fontFamily: "serif" | "sans" | "mono";
  fontSize: number;
  lineHeight: number;
  maxWidth: number;
  theme: "light" | "dark" | "sepia";
}

interface AppSettings {
  editor: EditorSettings;
  lastProjectPath?: string;
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  windowBounds?: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
  lastWindowState?: "maximized" | "normal";
}

const DEFAULT_SETTINGS: AppSettings = {
  editor: {
    fontFamily: "serif",
    fontSize: 18,
    lineHeight: 1.8,
    maxWidth: 800,
    theme: "light",
  },
  lastProjectPath: undefined,
  autoSaveEnabled: true,
  autoSaveInterval: 30000,
  windowBounds: undefined,
  lastWindowState: undefined,
};

export class SettingsManager {
  private static instance: SettingsManager;
  private store: Store<AppSettings>;

  private constructor() {
    const settingsPath = app.getPath("userData");

    this.store = new Store<AppSettings>({
      name: "settings",
      defaults: DEFAULT_SETTINGS,
      // path/luie/settings/settings.json 형태
      cwd: `${settingsPath}/luie/settings`,
      encryptionKey: undefined, // 필요하다면 암호화 키 추가
      fileExtension: "json",
    });

    logger.info("Settings manager initialized", {
      path: `${settingsPath}/luie/settings/settings.json`,
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

  setWindowBounds(bounds: {
    width: number;
    height: number;
    x: number;
    y: number;
  }): void {
    this.store.set("windowBounds", bounds);
  }

  getLastWindowState() {
    return this.store.get("lastWindowState");
  }

  setLastWindowState(state: "maximized" | "normal"): void {
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
