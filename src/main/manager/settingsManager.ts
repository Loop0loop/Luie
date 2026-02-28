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
  SyncEntityBaseline,
  SyncPendingProjectDelete,
  SyncSettings,
  WindowBounds,
  WindowMenuBarMode,
  WindowState,
} from "../../shared/types/index.js";
import {
  DEFAULT_AUTO_SAVE_ENABLED,
  DEFAULT_AUTO_SAVE_INTERVAL_MS,
  DEFAULT_EDITOR_FONT_FAMILY,
  DEFAULT_EDITOR_FONT_PRESET,
  DEFAULT_EDITOR_FONT_SIZE,
  DEFAULT_EDITOR_LINE_HEIGHT,
  DEFAULT_EDITOR_MAX_WIDTH,
  DEFAULT_EDITOR_THEME,
  DEFAULT_EDITOR_THEME_ACCENT,
  DEFAULT_EDITOR_THEME_CONTRAST,
  DEFAULT_EDITOR_THEME_TEMP,
  DEFAULT_EDITOR_THEME_TEXTURE,
  SNAPSHOT_FILE_KEEP_COUNT,
  APP_DIR_NAME,
  SETTINGS_FILE_NAME,
  SETTINGS_STORE_NAME,
} from "../../shared/constants/index.js";

const logger = createLogger("SettingsManager");

const sanitizeSyncSettingsForRenderer = (
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

const DEFAULT_SHORTCUTS = getDefaultShortcuts(process.platform);

const DEFAULT_SETTINGS: AppSettings = {
  editor: {
    fontFamily: DEFAULT_EDITOR_FONT_FAMILY,
    fontPreset: DEFAULT_EDITOR_FONT_PRESET,
    fontSize: DEFAULT_EDITOR_FONT_SIZE,
    lineHeight: DEFAULT_EDITOR_LINE_HEIGHT,
    maxWidth: DEFAULT_EDITOR_MAX_WIDTH,
    theme: DEFAULT_EDITOR_THEME,
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
  menuBarMode: "visible",
  sync: {
    connected: false,
    autoSync: true,
  } as SyncSettings,
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
      this.store.set("menuBarMode", "visible");
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
    return this.store.get("menuBarMode") ?? "visible";
  }

  setMenuBarMode(mode: WindowMenuBarMode): void {
    this.store.set("menuBarMode", mode);
  }

  getSyncSettings(): SyncSettings {
    const current = this.store.get("sync");
    const pendingProjectDeletes = Array.isArray(current?.pendingProjectDeletes)
      ? current.pendingProjectDeletes
        .filter((entry): entry is SyncPendingProjectDelete =>
          Boolean(
            entry &&
            typeof entry === "object" &&
            typeof entry.projectId === "string" &&
            entry.projectId.length > 0 &&
            typeof entry.deletedAt === "string" &&
            entry.deletedAt.length > 0,
          ),
        )
        .map((entry) => ({
          projectId: entry.projectId,
          deletedAt: entry.deletedAt,
        }))
      : undefined;

    const projectLastSyncedAtByProjectId = current?.projectLastSyncedAtByProjectId;
    const normalizedProjectSyncMap =
      projectLastSyncedAtByProjectId &&
      typeof projectLastSyncedAtByProjectId === "object" &&
      !Array.isArray(projectLastSyncedAtByProjectId)
        ? Object.fromEntries(
          Object.entries(projectLastSyncedAtByProjectId)
            .filter(
              (entry): entry is [string, string] =>
                typeof entry[0] === "string" &&
                entry[0].length > 0 &&
                typeof entry[1] === "string" &&
                entry[1].length > 0,
            ),
        )
        : undefined;

    const entityBaselinesByProjectId = current?.entityBaselinesByProjectId;
    const normalizedEntityBaselines =
      entityBaselinesByProjectId &&
      typeof entityBaselinesByProjectId === "object" &&
      !Array.isArray(entityBaselinesByProjectId)
        ? Object.fromEntries(
          Object.entries(entityBaselinesByProjectId)
            .filter(
              (entry): entry is [string, SyncEntityBaseline] =>
                typeof entry[0] === "string" &&
                entry[0].length > 0 &&
                Boolean(entry[1]) &&
                typeof entry[1] === "object" &&
                !Array.isArray(entry[1]),
            )
            .map(([projectId, baseline]) => {
              const chapter =
                baseline.chapter &&
                typeof baseline.chapter === "object" &&
                !Array.isArray(baseline.chapter)
                  ? Object.fromEntries(
                    Object.entries(baseline.chapter).filter(
                      (item): item is [string, string] =>
                        typeof item[0] === "string" &&
                        item[0].length > 0 &&
                        typeof item[1] === "string" &&
                        item[1].length > 0,
                    ),
                  )
                  : {};
              const memo =
                baseline.memo &&
                typeof baseline.memo === "object" &&
                !Array.isArray(baseline.memo)
                  ? Object.fromEntries(
                    Object.entries(baseline.memo).filter(
                      (item): item is [string, string] =>
                        typeof item[0] === "string" &&
                        item[0].length > 0 &&
                        typeof item[1] === "string" &&
                        item[1].length > 0,
                    ),
                  )
                  : {};
              const capturedAt =
                typeof baseline.capturedAt === "string" && baseline.capturedAt.length > 0
                  ? baseline.capturedAt
                  : new Date().toISOString();
              return [
                projectId,
                {
                  chapter,
                  memo,
                  capturedAt,
                },
              ];
            }),
        )
        : undefined;

    const pendingConflictResolutions = current?.pendingConflictResolutions;
    const normalizedPendingConflictResolutions =
      pendingConflictResolutions &&
      typeof pendingConflictResolutions === "object" &&
      !Array.isArray(pendingConflictResolutions)
        ? Object.fromEntries(
          Object.entries(pendingConflictResolutions).filter(
            (entry): entry is [string, "local" | "remote"] =>
              typeof entry[0] === "string" &&
              entry[0].length > 0 &&
              (entry[1] === "local" || entry[1] === "remote"),
          ),
        )
        : undefined;

    return {
      connected: current?.connected ?? false,
      provider: current?.provider,
      email: current?.email,
      userId: current?.userId,
      expiresAt: current?.expiresAt,
      autoSync: current?.autoSync ?? true,
      lastSyncedAt: current?.lastSyncedAt,
      lastError: current?.lastError,
      accessTokenCipher: current?.accessTokenCipher,
      refreshTokenCipher: current?.refreshTokenCipher,
      pendingAuthState: current?.pendingAuthState,
      pendingAuthVerifierCipher: current?.pendingAuthVerifierCipher,
      pendingAuthCreatedAt: current?.pendingAuthCreatedAt,
      pendingProjectDeletes,
      projectLastSyncedAtByProjectId:
        normalizedProjectSyncMap && Object.keys(normalizedProjectSyncMap).length > 0
          ? normalizedProjectSyncMap
          : undefined,
      entityBaselinesByProjectId:
        normalizedEntityBaselines && Object.keys(normalizedEntityBaselines).length > 0
          ? normalizedEntityBaselines
          : undefined,
      pendingConflictResolutions:
        normalizedPendingConflictResolutions &&
          Object.keys(normalizedPendingConflictResolutions).length > 0
          ? normalizedPendingConflictResolutions
          : undefined,
    };
  }

  setSyncSettings(settings: Partial<SyncSettings>): SyncSettings {
    const current = this.getSyncSettings();
    const next: SyncSettings = {
      ...current,
      ...settings,
    };
    const map = next.projectLastSyncedAtByProjectId;
    if (map && typeof map === "object" && !Array.isArray(map)) {
      const normalized = Object.fromEntries(
        Object.entries(map).filter(
          (entry): entry is [string, string] =>
            typeof entry[0] === "string" &&
            entry[0].length > 0 &&
            typeof entry[1] === "string" &&
            entry[1].length > 0,
        ),
      );
      next.projectLastSyncedAtByProjectId =
        Object.keys(normalized).length > 0 ? normalized : undefined;
    } else {
      next.projectLastSyncedAtByProjectId = undefined;
    }
    const baselines = next.entityBaselinesByProjectId;
    if (baselines && typeof baselines === "object" && !Array.isArray(baselines)) {
      const normalizedBaselines = Object.fromEntries(
        Object.entries(baselines)
          .filter(
            (entry): entry is [string, SyncEntityBaseline] =>
              typeof entry[0] === "string" &&
              entry[0].length > 0 &&
              Boolean(entry[1]) &&
              typeof entry[1] === "object" &&
              !Array.isArray(entry[1]),
          )
          .map(([projectId, baseline]) => {
            const chapter =
              baseline.chapter &&
              typeof baseline.chapter === "object" &&
              !Array.isArray(baseline.chapter)
                ? Object.fromEntries(
                  Object.entries(baseline.chapter).filter(
                    (item): item is [string, string] =>
                      typeof item[0] === "string" &&
                      item[0].length > 0 &&
                      typeof item[1] === "string" &&
                      item[1].length > 0,
                  ),
                )
                : {};
            const memo =
              baseline.memo &&
              typeof baseline.memo === "object" &&
              !Array.isArray(baseline.memo)
                ? Object.fromEntries(
                  Object.entries(baseline.memo).filter(
                    (item): item is [string, string] =>
                      typeof item[0] === "string" &&
                      item[0].length > 0 &&
                      typeof item[1] === "string" &&
                      item[1].length > 0,
                  ),
                )
                : {};
            const capturedAt =
              typeof baseline.capturedAt === "string" && baseline.capturedAt.length > 0
                ? baseline.capturedAt
                : new Date().toISOString();
            return [
              projectId,
              {
                chapter,
                memo,
                capturedAt,
              },
            ];
          }),
      );
      next.entityBaselinesByProjectId =
        Object.keys(normalizedBaselines).length > 0 ? normalizedBaselines : undefined;
    } else {
      next.entityBaselinesByProjectId = undefined;
    }
    const pendingResolutions = next.pendingConflictResolutions;
    if (
      pendingResolutions &&
      typeof pendingResolutions === "object" &&
      !Array.isArray(pendingResolutions)
    ) {
      const normalizedPendingResolutions = Object.fromEntries(
        Object.entries(pendingResolutions).filter(
          (entry): entry is [string, "local" | "remote"] =>
            typeof entry[0] === "string" &&
            entry[0].length > 0 &&
            (entry[1] === "local" || entry[1] === "remote"),
        ),
      );
      next.pendingConflictResolutions =
        Object.keys(normalizedPendingResolutions).length > 0
          ? normalizedPendingResolutions
          : undefined;
    } else {
      next.pendingConflictResolutions = undefined;
    }
    this.store.set("sync", next);
    return next;
  }

  setPendingSyncAuth(input: {
    state: string;
    verifierCipher: string;
    createdAt: string;
  }): SyncSettings {
    return this.setSyncSettings({
      pendingAuthState: input.state,
      pendingAuthVerifierCipher: input.verifierCipher,
      pendingAuthCreatedAt: input.createdAt,
    });
  }

  clearPendingSyncAuth(): SyncSettings {
    return this.setSyncSettings({
      pendingAuthState: undefined,
      pendingAuthVerifierCipher: undefined,
      pendingAuthCreatedAt: undefined,
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
    };
    this.store.set("sync", next);
    return next;
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
