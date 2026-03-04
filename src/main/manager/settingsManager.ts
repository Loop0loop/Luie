/**
 * Settings manager - electron-store를 통한 영구 설정 관리
 */

import Store from "electron-store";
import { app } from "electron";
import { createLogger } from "../../shared/logger/index.js";
import { access } from "node:fs/promises";
import type {
  AppSettings,
  EditorSettings,
  ShortcutMap,
  RuntimeSupabaseConfig,
  RuntimeSupabaseConfigView,
  SyncPendingProjectDelete,
  SyncSettings,
  StartupSettings,
  WindowBounds,
  WindowMenuBarMode,
  WindowState,
} from "../../shared/types/index.js";
import {
  DEFAULT_MENU_BAR_MODE,
  DEFAULT_SHORTCUTS,
  SETTINGS_STORE_APP_DIR_NAME,
  SETTINGS_STORE_BASENAME,
  SETTINGS_STORE_FILE_NAME,
  getDefaultSettings,
  normalizeRuntimeSupabaseConfig,
  sanitizeSyncSettingsForRenderer,
} from "./settings/settingsDefaults.js";
import { normalizeSyncSettings } from "./settings/syncSettingsNormalizer.js";

const logger = createLogger("SettingsManager");

export class SettingsManager {
  private static instance: SettingsManager;
  private store: Store<AppSettings>;

  private constructor() {
    const settingsPath = app.getPath("userData");

    // 기존(레거시) 경로: userData/luie/settings/settings.json
    // app.getPath('userData')가 이미 '.../luie'인 경우 이중으로 들어가 혼동을 유발했음
    const legacyCwd = `${settingsPath}/${SETTINGS_STORE_APP_DIR_NAME}/${SETTINGS_STORE_BASENAME}`;
    const legacyFile = `${legacyCwd}/${SETTINGS_STORE_FILE_NAME}`;

    this.store = new Store<AppSettings>({
      name: SETTINGS_STORE_BASENAME,
      defaults: getDefaultSettings(),
      // 저장 위치: userData/settings.json
      cwd: settingsPath,
      encryptionKey: undefined, // 필요하다면 암호화 키 추가
      fileExtension: "json",
    });

    void this.migrateLegacySettingsIfNeeded(legacyCwd, legacyFile);

    this.migrateLegacyWindowSettings();

    logger.info("Settings manager initialized", {
      path: this.store.path,
    });
  }

  private async migrateLegacySettingsIfNeeded(
    legacyCwd: string,
    legacyFile: string,
  ): Promise<void> {
    const hasLegacy = await this.pathExists(legacyFile);
    const hasCurrent = await this.pathExists(this.store.path);

    if (!hasLegacy || hasCurrent) {
      return;
    }

    try {
      const legacyStore = new Store<AppSettings>({
        name: SETTINGS_STORE_BASENAME,
        defaults: getDefaultSettings(),
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

  private async pathExists(targetPath: string): Promise<boolean> {
    try {
      await access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  private migrateLegacyWindowSettings(): void {
    const current = this.store.store as AppSettings & {
      titleBarMode?: "hidden" | "visible";
    };

    if (!current.menuBarMode) {
      this.store.set("menuBarMode", DEFAULT_MENU_BAR_MODE);
    }

    if ("titleBarMode" in current) {
      const { titleBarMode: _legacyTitleBarMode, ...next } = current;
      this.store.set(next);
    }
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

  // 렌더러 노출용 설정 (민감 Sync 시크릿 제거)
  getAllForRenderer(): AppSettings {
    const all = this.getAll();
    return {
      ...all,
      sync: sanitizeSyncSettingsForRenderer(all.sync),
    };
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
      snapshotExportLimit: settings.snapshotExportLimit ?? current.snapshotExportLimit,
      windowBounds: settings.windowBounds ?? current.windowBounds,
      lastWindowState: settings.lastWindowState ?? current.lastWindowState,
      menuBarMode: settings.menuBarMode ?? current.menuBarMode,
      sync: settings.sync ?? current.sync,
      startup: settings.startup ?? current.startup,
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

  getMenuBarMode(): WindowMenuBarMode {
    return this.store.get("menuBarMode") ?? DEFAULT_MENU_BAR_MODE;
  }

  setMenuBarMode(mode: WindowMenuBarMode): void {
    this.store.set("menuBarMode", mode);
  }

  getSyncSettings(): SyncSettings {
    return normalizeSyncSettings(this.store.get("sync"));
  }

  setSyncSettings(settings: Partial<SyncSettings>): SyncSettings {
    const next = normalizeSyncSettings({
      ...this.getSyncSettings(),
      ...settings,
    });
    this.store.set("sync", next);
    return next;
  }

  setPendingSyncAuth(input: {
    state?: string;
    verifierCipher: string;
    createdAt: string;
    redirectUri?: string;
  }): SyncSettings {
    return this.setSyncSettings({
      pendingAuthState: input.state,
      pendingAuthVerifierCipher: input.verifierCipher,
      pendingAuthCreatedAt: input.createdAt,
      pendingAuthRedirectUri: input.redirectUri,
    });
  }

  clearPendingSyncAuth(): SyncSettings {
    return this.setSyncSettings({
      pendingAuthState: undefined,
      pendingAuthVerifierCipher: undefined,
      pendingAuthCreatedAt: undefined,
      pendingAuthRedirectUri: undefined,
    });
  }

  addPendingProjectDelete(input: SyncPendingProjectDelete): SyncSettings {
    const current = this.getSyncSettings();
    const existing = Array.isArray(current.pendingProjectDeletes)
      ? current.pendingProjectDeletes
      : [];
    const withoutSameProject = existing.filter((entry) => entry.projectId !== input.projectId);
    return this.setSyncSettings({
      pendingProjectDeletes: [
        ...withoutSameProject,
        {
          projectId: input.projectId,
          deletedAt: input.deletedAt,
        },
      ],
    });
  }

  removePendingProjectDeletes(projectIds: string[]): SyncSettings {
    if (projectIds.length === 0) {
      return this.getSyncSettings();
    }

    const projectIdSet = new Set(projectIds);
    const current = this.getSyncSettings();
    const existing = Array.isArray(current.pendingProjectDeletes)
      ? current.pendingProjectDeletes
      : [];
    const filtered = existing.filter((entry) => !projectIdSet.has(entry.projectId));
    return this.setSyncSettings({
      pendingProjectDeletes: filtered.length > 0 ? filtered : undefined,
    });
  }

  clearSyncSettings(): SyncSettings {
    const current = this.getSyncSettings();
    const next: SyncSettings = {
      connected: false,
      autoSync: true,
      pendingProjectDeletes: current.pendingProjectDeletes,
      entityBaselinesByProjectId: current.entityBaselinesByProjectId,
      runtimeSupabaseConfig: current.runtimeSupabaseConfig,
    };
    this.store.set("sync", next);
    return next;
  }

  getRuntimeSupabaseConfig(): RuntimeSupabaseConfig | undefined {
    const current = this.getSyncSettings();
    return normalizeRuntimeSupabaseConfig(current.runtimeSupabaseConfig);
  }

  getRuntimeSupabaseConfigView(input?: {
    source?: RuntimeSupabaseConfigView["source"];
  }): RuntimeSupabaseConfigView {
    const runtime = this.getRuntimeSupabaseConfig();
    return {
      url: runtime?.url ?? null,
      hasAnonKey: Boolean(runtime?.anonKey),
      source: input?.source,
    };
  }

  setRuntimeSupabaseConfig(config: RuntimeSupabaseConfig): RuntimeSupabaseConfig | undefined {
    const normalized = normalizeRuntimeSupabaseConfig(config);
    this.setSyncSettings({
      runtimeSupabaseConfig: normalized,
    });
    return normalized;
  }

  clearRuntimeSupabaseConfig(): void {
    this.setSyncSettings({
      runtimeSupabaseConfig: undefined,
    });
  }

  getStartupSettings(): StartupSettings {
    const startup = this.store.get("startup");
    if (!startup || typeof startup !== "object" || Array.isArray(startup)) {
      return {};
    }
    const completedAt =
      typeof startup.completedAt === "string" && startup.completedAt.length > 0
        ? startup.completedAt
        : undefined;
    return { completedAt };
  }

  setStartupSettings(settings: Partial<StartupSettings>): StartupSettings {
    const current = this.getStartupSettings();
    const hasCompletedAt = Object.prototype.hasOwnProperty.call(settings, "completedAt");
    const nextCompletedAt = hasCompletedAt ? settings.completedAt : current.completedAt;
    const next: StartupSettings = nextCompletedAt ? { completedAt: nextCompletedAt } : {};
    this.store.set("startup", next);
    return next;
  }

  setStartupCompletedAt(completedAt: string): StartupSettings {
    return this.setStartupSettings({ completedAt });
  }

  clearStartupCompletedAt(): StartupSettings {
    return this.setStartupSettings({ completedAt: undefined });
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
