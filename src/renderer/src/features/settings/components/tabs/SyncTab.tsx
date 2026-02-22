import { memo } from "react";
import type { TFunction } from "i18next";
import type { SyncStatus } from '@shared/types';

interface SyncTabProps {
    t: TFunction;
    status: SyncStatus;
    isBusy: boolean;
    onConnectGoogle: () => void;
    onReconnectGoogle: () => void;
    onDisconnect: () => void;
    onSyncNow: () => void;
    onToggleAutoSync: (enabled: boolean) => void;
}

export const SyncTab = memo(function SyncTab({
    t,
    status,
    isBusy,
    onConnectGoogle,
    onReconnectGoogle,
    onDisconnect,
    onSyncNow,
    onToggleAutoSync,
}: SyncTabProps) {
    const showConnected = status.connected;
    const isConnecting = status.mode === "connecting";
    const showReconnect = !showConnected && (Boolean(status.lastError) || isConnecting);
    const connectLabel = showReconnect
        ? t("settings.sync.actions.reconnectGoogle")
        : t("settings.sync.actions.connectGoogle");
    const connectDisabled = isBusy || (isConnecting && !showReconnect);
    const modeLabel = status.mode === "syncing"
        ? t("settings.sync.status.syncing")
        : status.mode === "connecting"
            ? t("settings.sync.status.connecting")
            : status.mode === "error"
                ? t("settings.sync.status.error")
                : t("settings.sync.status.idle");

    return (
        <div className="space-y-6 max-w-2xl content-visibility-auto contain-intrinsic-size-[1px_500px]">
            <section className="p-4 bg-surface rounded-xl border border-border">
                <h3 className="text-base font-semibold text-fg mb-2">{t("settings.sync.title")}</h3>
                <p className="text-sm text-muted mb-4">{t("settings.sync.description")}</p>

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div className="text-muted">{t("settings.sync.fields.connection")}</div>
                    <div className="text-fg font-medium">
                        {showConnected ? t("settings.sync.connected") : t("settings.sync.disconnected")}
                    </div>

                    <div className="text-muted">{t("settings.sync.fields.email")}</div>
                    <div className="text-fg font-medium">{status.email ?? "-"}</div>

                    <div className="text-muted">{t("settings.sync.fields.lastSyncedAt")}</div>
                    <div className="text-fg font-medium">
                        {status.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleString() : "-"}
                    </div>

                    <div className="text-muted">{t("settings.sync.fields.mode")}</div>
                    <div className="text-fg font-medium">{modeLabel}</div>
                </div>

                {status.lastError && (
                    <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger-fg">
                        {status.lastError}
                    </div>
                )}

                <div className="flex flex-wrap gap-3">
                    {!showConnected ? (
                        <button
                            className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                            onClick={showReconnect ? onReconnectGoogle : onConnectGoogle}
                            disabled={connectDisabled}
                        >
                            {connectLabel}
                        </button>
                    ) : (
                        <>
                            <button
                                className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                                onClick={onSyncNow}
                                disabled={isBusy}
                            >
                                {t("settings.sync.actions.syncNow")}
                            </button>
                            <button
                                className="px-4 py-2 bg-element hover:bg-element-hover border border-border rounded-lg text-sm font-medium text-fg transition-colors disabled:opacity-50"
                                onClick={onDisconnect}
                                disabled={isBusy}
                            >
                                {t("settings.sync.actions.disconnect")}
                            </button>
                        </>
                    )}
                </div>

                <div className="mt-4 flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span className="text-sm text-fg">{t("settings.sync.fields.autoSync")}</span>
                    <button
                        onClick={() => onToggleAutoSync(!status.autoSync)}
                        disabled={isBusy || !showConnected}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${status.autoSync ? "bg-accent" : "bg-border"
                            } ${isBusy || !showConnected ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                        <span
                            className={`${status.autoSync ? "translate-x-6" : "translate-x-1"
                                } inline-block h-4 w-4 transform rounded-full bg-surface shadow-sm transition-transform`}
                        />
                    </button>
                </div>

                <div className="mt-4 text-xs text-muted">
                    {t("settings.sync.conflicts", {
                        total: status.conflicts.total,
                        chapters: status.conflicts.chapters,
                        memos: status.conflicts.memos,
                    })}
                </div>
            </section>
        </div>
    );
});
