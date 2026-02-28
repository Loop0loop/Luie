import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, X, Check, RefreshCcw } from "lucide-react";
import type { SyncStatus } from "@shared/types";
import { createPortal } from "react-dom";

interface SyncConflictResolverModalProps {
    conflicts: SyncStatus["conflicts"];
    onClose: () => void;
    onRefresh: () => void;
    onResolve: (input: {
        type: "chapter" | "memo";
        id: string;
        resolution: "local" | "remote";
    }) => Promise<void>;
    isBusy: boolean;
}

export function SyncConflictResolverModal({
    conflicts,
    onClose,
    onRefresh,
    onResolve,
    isBusy,
}: SyncConflictResolverModalProps) {
    const { t } = useTranslation();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [resolvingKey, setResolvingKey] = useState<string | null>(null);
    const hasConflicts = conflicts.total > 0;
    const refreshDisabled = isBusy || isRefreshing || !!resolvingKey;
    const conflictItems = conflicts.items ?? [];

    const handleRefresh = async () => {
        if (refreshDisabled) return;
        setIsRefreshing(true);
        try {
            await Promise.resolve(onRefresh());
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleResolve = async (
        item: {
            type: "chapter" | "memo";
            id: string;
        },
        resolution: "local" | "remote",
    ) => {
        if (refreshDisabled) return;
        const key = `${item.type}:${item.id}`;
        setResolvingKey(key);
        try {
            await onResolve({
                type: item.type,
                id: item.id,
                resolution,
            });
        } finally {
            setResolvingKey(null);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-3xl bg-panel border border-border shadow-2xl rounded-xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-warning/20 rounded-full text-warning-fg">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-fg m-0">{t("settings.sync.conflicts.modalTitle", "Resolve Sync Conflicts")}</h2>
                            <p className="text-xs text-muted mt-0.5">
                                {t("settings.sync.conflicts.desc", "Luie found conflicting edits between your local device and the cloud. Please choose which version to keep.")}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={refreshDisabled}
                        className="p-2 rounded-md hover:bg-hover text-muted transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar bg-canvas">
                    {!hasConflicts ? (
                        <div className="h-40 flex flex-col items-center justify-center gap-3 text-muted">
                            <Check className="w-8 h-8 text-emerald-500" />
                            <span>{t("settings.sync.conflicts.allResolved", "All conflicts resolved!")}</span>
                        </div>
                    ) : conflictItems.length > 0 ? (
                        <>
                            {conflictItems.map((item, index) => {
                                const itemKey = `${item.type}:${item.id}`;
                                const itemIsResolving = resolvingKey === itemKey;
                                return (
                                    <div key={itemKey} className="rounded-lg border border-border bg-surface">
                                        <div className="px-4 py-2 border-b border-border text-sm font-semibold text-fg">
                                            {item.type === "chapter"
                                                ? t("settings.sync.conflicts.chapterLabel", "Chapter")
                                                : t("settings.sync.conflicts.memoLabel", "Memo")} #{index + 1} - {item.title || item.id}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
                                            <div className="rounded-md border border-border p-3 bg-canvas">
                                                <div className="text-xs text-muted mb-2">
                                                    {t("settings.sync.conflicts.keepLocal", "Keep Local")} · {new Date(item.localUpdatedAt).toLocaleString()}
                                                </div>
                                                <pre className="text-xs whitespace-pre-wrap break-words max-h-40 overflow-auto text-fg m-0">
                                                    {item.localPreview || "(empty)"}
                                                </pre>
                                                <button
                                                    onClick={() => handleResolve(item, "local")}
                                                    disabled={refreshDisabled}
                                                    className="mt-3 w-full px-3 py-2 bg-accent/10 hover:bg-accent/20 text-accent text-sm font-medium rounded-md border border-accent/20 transition-colors disabled:opacity-50"
                                                >
                                                    {itemIsResolving
                                                        ? t("common.saving", "Saving...")
                                                        : t("settings.sync.conflicts.keepLocal", "Keep Local")}
                                                </button>
                                            </div>
                                            <div className="rounded-md border border-border p-3 bg-canvas">
                                                <div className="text-xs text-muted mb-2">
                                                    {t("settings.sync.conflicts.keepRemote", "Keep Cloud")} · {new Date(item.remoteUpdatedAt).toLocaleString()}
                                                </div>
                                                <pre className="text-xs whitespace-pre-wrap break-words max-h-40 overflow-auto text-fg m-0">
                                                    {item.remotePreview || "(empty)"}
                                                </pre>
                                                <button
                                                    onClick={() => handleResolve(item, "remote")}
                                                    disabled={refreshDisabled}
                                                    className="mt-3 w-full px-3 py-2 bg-element hover:bg-element-hover text-fg text-sm font-medium rounded-md border border-border transition-colors disabled:opacity-50"
                                                >
                                                    {itemIsResolving
                                                        ? t("common.saving", "Saving...")
                                                        : t("settings.sync.conflicts.keepRemote", "Keep Cloud")}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    ) : (
                        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning-fg space-y-2">
                            <p className="m-0">
                                {t(
                                    "settings.sync.conflicts.modalSummary",
                                    "Conflicts were detected during sync.",
                                )}
                            </p>
                            <p className="m-0 text-xs text-warning-fg/80">
                                {t(
                                    "settings.sync.conflicts.modalDetails",
                                    "Conflict details are not available yet. Run sync again to refresh conflict payload.",
                                )}
                            </p>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="rounded-md bg-warning/10 px-2 py-1 border border-warning/30">
                                    {t("settings.sync.conflicts.chapterCount", "Chapters")}: {conflicts.chapters}
                                </div>
                                <div className="rounded-md bg-warning/10 px-2 py-1 border border-warning/30">
                                    {t("settings.sync.conflicts.memoCount", "Memos")}: {conflicts.memos}
                                </div>
                                <div className="rounded-md bg-warning/10 px-2 py-1 border border-warning/30">
                                    {t("settings.sync.conflicts.totalCount", "Total")}: {conflicts.total}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-border flex justify-end bg-panel">
                    {hasConflicts && (
                        <button
                            onClick={handleRefresh}
                            disabled={refreshDisabled}
                            className="px-4 py-2 mr-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            {isRefreshing
                                ? t("settings.sync.actions.syncing", "Syncing...")
                                : t("settings.sync.actions.syncNow", "Sync Now")}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        disabled={refreshDisabled}
                        className="px-4 py-2 bg-element hover:bg-element-hover border border-border rounded-lg text-sm font-medium text-fg transition-colors"
                    >
                        {hasConflicts ? t("settings.sync.conflicts.resolveLater", "Resolve Later") : t("common.close", "Close")}
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
}
