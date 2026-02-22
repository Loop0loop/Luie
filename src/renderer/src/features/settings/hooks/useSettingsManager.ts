import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { useToast } from "@shared/ui/ToastContext";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { useShortcutStore } from "@renderer/features/workspace/stores/shortcutStore";
import type { FontPreset, EditorSettings } from "@renderer/features/editor/stores/editorStore";
import type { ShortcutMap, SyncStatus, WindowMenuBarMode } from "@shared/types";
import { SHORTCUT_ACTIONS } from "@shared/constants/shortcuts";
import { STORAGE_KEY_FONTS_INSTALLED } from "@shared/constants";
import { readLocalStorageJson, writeLocalStorageJson } from "@shared/utils/localStorage";
import { api } from "@shared/api";
import { syncRunResultSchema, syncStatusSchema } from "@shared/schemas/index.js";
import { OPTIONAL_FONT_OPTIONS, SHORTCUT_GROUP_ICON_MAP } from "@renderer/features/settings/components/SettingsModalConfig";
import type { OptionalFontOption, SettingsTabId, ShortcutGroupMap } from "@renderer/features/settings/components/tabs/types";

const LEGACY_STORAGE_KEY_FONTS_INSTALLED = "luie:fonts-installed";

const DEFAULT_SYNC_STATUS: SyncStatus = {
    connected: false,
    autoSync: true,
    mode: "idle",
    inFlight: false,
    queued: false,
    conflicts: {
        chapters: 0,
        memos: 0,
        total: 0,
    },
};

export function useSettingsManager() {
    const { t, i18n } = useTranslation();
    const { showToast } = useToast();

    const {
        theme,
        themeTemp,
        themeContrast,
        themeAccent,
        themeTexture,
        fontSize,
        lineHeight,
        fontFamily,
        fontPreset,
        uiMode,
        updateSettings,
    } = useEditorStore(
        useShallow((state) => ({
            theme: state.theme,
            themeTemp: state.themeTemp,
            themeContrast: state.themeContrast,
            themeAccent: state.themeAccent,
            themeTexture: state.themeTexture,
            fontSize: state.fontSize,
            lineHeight: state.lineHeight,
            fontFamily: state.fontFamily,
            fontPreset: state.fontPreset,
            uiMode: state.uiMode,
            updateSettings: state.updateSettings,
        })),
    );

    const { shortcuts, shortcutDefaults, loadShortcuts, setShortcuts, resetToDefaults } = useShortcutStore(
        useShallow((state) => ({
            shortcuts: state.shortcuts,
            shortcutDefaults: state.defaults,
            loadShortcuts: state.loadShortcuts,
            setShortcuts: state.setShortcuts,
            resetToDefaults: state.resetToDefaults,
        })),
    );

    const [activeTab, setActiveTab] = useState<SettingsTabId>("appearance");
    const [localFontSize, setLocalFontSize] = useState(fontSize);
    const [localLineHeight, setLocalLineHeight] = useState(lineHeight);
    const [menuBarMode, setMenuBarMode] = useState<WindowMenuBarMode>("visible");
    const [isMenuBarUpdating, setIsMenuBarUpdating] = useState(false);
    const menuBarModeRef = useRef<WindowMenuBarMode>("visible");
    const menuBarUpdateLockRef = useRef(false);
    const shortcutUpdateLockRef = useRef(false);
    const recoveryRunLockRef = useRef(false);
    const syncActionLockRef = useRef(false);
    const [isShortcutsUpdating, setIsShortcutsUpdating] = useState(false);
    const [isRecovering, setIsRecovering] = useState(false);
    const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>(DEFAULT_SYNC_STATUS);
    const [isSyncBusy, setIsSyncBusy] = useState(false);
    const [installing, setInstalling] = useState<Record<string, boolean>>({});
    const [installed, setInstalled] = useState<Record<string, boolean>>(() => {
        return (
            readLocalStorageJson<Record<string, boolean>>(STORAGE_KEY_FONTS_INSTALLED) ??
            readLocalStorageJson<Record<string, boolean>>(LEGACY_STORAGE_KEY_FONTS_INSTALLED) ??
            {}
        );
    });

    const isMacOS = navigator.platform.toLowerCase().includes("mac");

    useEffect(() => {
        setLocalFontSize(fontSize);
    }, [fontSize]);

    useEffect(() => {
        setLocalLineHeight(lineHeight);
    }, [lineHeight]);

    useEffect(() => {
        menuBarModeRef.current = menuBarMode;
    }, [menuBarMode]);

    const applySettings = useCallback(
        (next: Partial<EditorSettings>) => {
            void updateSettings(next);
        },
        [updateSettings],
    );

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const response = await api.settings.getMenuBarMode();
            if (!response.success || !response.data || cancelled) return;
            const mode = (response.data as { mode?: WindowMenuBarMode }).mode;
            if (mode === "hidden" || mode === "visible") {
                menuBarModeRef.current = mode;
                setMenuBarMode(mode);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleMenuBarModeChange = useCallback(
        async (mode: WindowMenuBarMode) => {
            if (menuBarUpdateLockRef.current || menuBarModeRef.current === mode) return;

            menuBarUpdateLockRef.current = true;
            setIsMenuBarUpdating(true);
            try {
                const response = await api.settings.setMenuBarMode({ mode });
                if (!response.success) {
                    showToast(t("settings.menuBar.applyFailed"), "error");
                    return;
                }
                const nextMode = response.data?.mode;
                const resolvedMode = nextMode === "hidden" || nextMode === "visible" ? nextMode : mode;
                menuBarModeRef.current = resolvedMode;
                setMenuBarMode(resolvedMode);
            } catch {
                showToast(t("settings.menuBar.applyFailed"), "error");
            } finally {
                menuBarUpdateLockRef.current = false;
                setIsMenuBarUpdating(false);
            }
        },
        [showToast, t],
    );

    useEffect(() => {
        if (activeTab === "shortcuts") {
            void loadShortcuts();
        }
    }, [activeTab, loadShortcuts]);

    useEffect(() => {
        let cancelled = false;

        void (async () => {
            const response = await api.sync.getStatus();
            if (!response.success || !response.data || cancelled) return;
            const parsed = syncStatusSchema.safeParse(response.data);
            if (!parsed.success) return;
            setSyncStatus(parsed.data);
        })();

        const unsubscribe = api.sync.onStatusChanged((status) => {
            if (cancelled) return;
            const parsed = syncStatusSchema.safeParse(status);
            if (!parsed.success) return;
            setSyncStatus(parsed.data);
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

    const handleCommitShortcuts = useCallback(
        (nextDrafts: Record<string, string>) => {
            if (shortcutUpdateLockRef.current) return;
            if (Object.keys(nextDrafts).length === 0) return;

            const current = shortcuts as Record<string, string>;
            const hasChanges = Object.entries(nextDrafts).some(([actionId, value]) => (current[actionId] ?? "") !== value);
            if (!hasChanges) return;

            shortcutUpdateLockRef.current = true;
            setIsShortcutsUpdating(true);

            void (async () => {
                try {
                    await setShortcuts(nextDrafts as ShortcutMap);
                } catch {
                    showToast(t("settings.shortcuts.saveFailed"), "error");
                } finally {
                    shortcutUpdateLockRef.current = false;
                    setIsShortcutsUpdating(false);
                }
            })();
        },
        [setShortcuts, shortcuts, showToast, t],
    );

    const handleResetShortcuts = useCallback(() => {
        if (shortcutUpdateLockRef.current) return;

        shortcutUpdateLockRef.current = true;
        setIsShortcutsUpdating(true);

        void (async () => {
            try {
                await resetToDefaults();
            } catch {
                showToast(t("settings.shortcuts.resetFailed"), "error");
            } finally {
                shortcutUpdateLockRef.current = false;
                setIsShortcutsUpdating(false);
            }
        })();
    }, [resetToDefaults, showToast, t]);

    const handleMenuBarMode = useCallback(
        (mode: WindowMenuBarMode) => {
            void handleMenuBarModeChange(mode);
        },
        [handleMenuBarModeChange],
    );

    const shortcutGroups = useMemo<ShortcutGroupMap>(() => {
        const groups: ShortcutGroupMap = {
            app: [],
            chapter: [],
            view: [],
            research: [],
            editor: [],
            other: [],
        };

        SHORTCUT_ACTIONS.forEach((action) => {
            if (action.id.startsWith("app.")) groups.app.push(action);
            else if (action.id.startsWith("chapter.") || action.id.startsWith("project.")) groups.chapter.push(action);
            else if (
                action.id.startsWith("view.") ||
                action.id.startsWith("sidebar.") ||
                action.id.startsWith("window.")
            )
                groups.view.push(action);
            else if (
                action.id.startsWith("research.") ||
                action.id.startsWith("character.") ||
                action.id.startsWith("world.") ||
                action.id.startsWith("scrap.")
            )
                groups.research.push(action);
            else if (action.id.startsWith("editor.") || action.id.startsWith("split.")) groups.editor.push(action);
            else groups.other.push(action);
        });

        return groups;
    }, []);

    const getGroupLabel = useCallback(
        (key: string) => {
            switch (key) {
                case "app":
                    return t("settings.shortcuts.group.app");
                case "chapter":
                    return t("settings.shortcuts.group.file");
                case "view":
                    return t("settings.shortcuts.group.view");
                case "research":
                    return t("settings.shortcuts.group.research");
                case "editor":
                    return t("settings.shortcuts.group.editor");
                default:
                    return t("settings.shortcuts.group.other");
            }
        },
        [t],
    );

    const getGroupIcon = useCallback((key: string) => {
        return SHORTCUT_GROUP_ICON_MAP[key] ?? SHORTCUT_GROUP_ICON_MAP.other;
    }, []);

    const runRecovery = useCallback(async (dryRun: boolean) => {
        if (recoveryRunLockRef.current) return;
        recoveryRunLockRef.current = true;
        setIsRecovering(true);
        setRecoveryMessage(null);
        try {
            const response = await api.recovery.runDb({ dryRun });
            if (response.success) {
                setRecoveryMessage(
                    (response.data as { message?: string })?.message ??
                    t("settings.recovery.success"),
                );
            } else {
                setRecoveryMessage(t("settings.recovery.failed"));
                showToast(t("settings.recovery.failed"), "error");
            }
        } catch {
            setRecoveryMessage(t("settings.recovery.error"));
            showToast(t("settings.recovery.error"), "error");
        } finally {
            recoveryRunLockRef.current = false;
            setIsRecovering(false);
        }
    }, [showToast, t]);

    const optionalFonts = useMemo<OptionalFontOption[]>(
        () =>
            OPTIONAL_FONT_OPTIONS.map((font) => ({
                ...font,
                label: t(font.labelKey),
            })),
        [t],
    );

    const persistInstalled = useCallback(
        (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => {
            setInstalled((prev) => {
                const next = updater(prev);
                void writeLocalStorageJson(STORAGE_KEY_FONTS_INSTALLED, next);
                return next;
            });
        },
        [],
    );

    const ensureFontLoaded = useCallback(async (pkg: string) => {
        const id = `fontsource-variable-${pkg}`;
        if (document.getElementById(id)) return;
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = `https://cdn.jsdelivr.net/npm/@fontsource-variable/${pkg}/index.css`;
        document.head.appendChild(link);
    }, []);

    const handleInstall = useCallback(
        async (preset: FontPreset, pkg: string) => {
            setInstalling((prev) => ({ ...prev, [preset]: true }));
            try {
                await ensureFontLoaded(pkg);
                persistInstalled((prev) => ({ ...prev, [preset]: true }));
            } finally {
                setInstalling((prev) => ({ ...prev, [preset]: false }));
            }
        },
        [ensureFontLoaded, persistInstalled],
    );

    const handleInstallFont = useCallback(
        (preset: FontPreset, pkg: string) => {
            void handleInstall(preset, pkg);
        },
        [handleInstall],
    );

    const handleRunRecovery = useCallback(
        (dryRun: boolean) => {
            void runRecovery(dryRun);
        },
        [runRecovery],
    );

    const runSyncAction = useCallback(async (action: () => Promise<void>) => {
        if (syncActionLockRef.current) return;
        syncActionLockRef.current = true;
        setIsSyncBusy(true);
        try {
            await action();
        } finally {
            syncActionLockRef.current = false;
            setIsSyncBusy(false);
        }
    }, []);

    const handleConnectGoogle = useCallback(() => {
        void runSyncAction(async () => {
            const response = await api.sync.connectGoogle();
            if (!response.success || !response.data) {
                showToast(t("settings.sync.toast.connectFailed"), "error");
                return;
            }
            const parsed = syncStatusSchema.safeParse(response.data);
            if (!parsed.success) {
                showToast(t("settings.sync.toast.connectFailed"), "error");
                return;
            }
            setSyncStatus(parsed.data);
            showToast(t("settings.sync.toast.connectStarted"), "info");
        });
    }, [runSyncAction, showToast, t]);

    const handleReconnectGoogle = useCallback(() => {
        void runSyncAction(async () => {
            const disconnected = await api.sync.disconnect();
            if (disconnected.success && disconnected.data) {
                const parsedDisconnect = syncStatusSchema.safeParse(disconnected.data);
                if (parsedDisconnect.success) {
                    setSyncStatus(parsedDisconnect.data);
                }
            }

            const response = await api.sync.connectGoogle();
            if (!response.success || !response.data) {
                showToast(t("settings.sync.toast.connectFailed"), "error");
                return;
            }
            const parsed = syncStatusSchema.safeParse(response.data);
            if (!parsed.success) {
                showToast(t("settings.sync.toast.connectFailed"), "error");
                return;
            }
            setSyncStatus(parsed.data);
            showToast(t("settings.sync.toast.connectStarted"), "info");
        });
    }, [runSyncAction, showToast, t]);

    const handleDisconnect = useCallback(() => {
        void runSyncAction(async () => {
            const response = await api.sync.disconnect();
            if (!response.success || !response.data) {
                showToast(t("settings.sync.toast.disconnectFailed"), "error");
                return;
            }
            const parsed = syncStatusSchema.safeParse(response.data);
            if (!parsed.success) {
                showToast(t("settings.sync.toast.disconnectFailed"), "error");
                return;
            }
            setSyncStatus(parsed.data);
            showToast(t("settings.sync.toast.disconnected"), "info");
        });
    }, [runSyncAction, showToast, t]);

    const handleSyncNow = useCallback(() => {
        void runSyncAction(async () => {
            const response = await api.sync.runNow();
            const parsedResult = syncRunResultSchema.safeParse(response.data);
            if (!response.success || !parsedResult.success || !parsedResult.data.success) {
                showToast(t("settings.sync.toast.syncFailed"), "error");
                return;
            }
            const nextStatus = await api.sync.getStatus();
            const parsed = syncStatusSchema.safeParse(nextStatus.data);
            if (parsed.success) {
                setSyncStatus(parsed.data);
            }
            showToast(t("settings.sync.toast.synced"), "success");
        });
    }, [runSyncAction, showToast, t]);

    const handleToggleAutoSync = useCallback(
        (enabled: boolean) => {
            void runSyncAction(async () => {
                const response = await api.sync.setAutoSync({ enabled });
                if (!response.success || !response.data) {
                    showToast(t("settings.sync.toast.autoSyncFailed"), "error");
                    return;
                }
                const parsed = syncStatusSchema.safeParse(response.data);
                if (!parsed.success) {
                    showToast(t("settings.sync.toast.autoSyncFailed"), "error");
                    return;
                }
                setSyncStatus(parsed.data);
            });
        },
        [runSyncAction, showToast, t],
    );

    return {
        t,
        i18n,
        theme,
        themeTemp,
        themeContrast,
        themeAccent,
        themeTexture,
        fontSize,
        lineHeight,
        fontFamily,
        fontPreset,
        uiMode,
        shortcuts,
        shortcutDefaults,
        activeTab,
        setActiveTab,
        localFontSize,
        setLocalFontSize,
        localLineHeight,
        setLocalLineHeight,
        menuBarMode,
        isMenuBarUpdating,
        isShortcutsUpdating,
        isRecovering,
        recoveryMessage,
        syncStatus,
        isSyncBusy,
        installing,
        installed,
        isMacOS,
        applySettings,
        handleCommitShortcuts,
        handleResetShortcuts,
        handleMenuBarMode,
        shortcutGroups,
        getGroupLabel,
        getGroupIcon,
        runRecovery,
        optionalFonts,
        handleInstallFont,
        handleRunRecovery,
        handleConnectGoogle,
        handleReconnectGoogle,
        handleDisconnect,
        handleSyncNow,
        handleToggleAutoSync,
    };
}
