import { memo, useState } from "react";
import type { TFunction } from "i18next";
import type { SyncStatus } from '@shared/types';
import { SyncConflictResolverModal } from "../SyncConflictResolverModal";

interface SyncTabProps {
    t: TFunction;
    status: SyncStatus;
    isBusy: boolean;
    onConnectGoogle: () => void;
    onReconnectGoogle: () => void;
    onDisconnect: () => void;
    onSyncNow: () => void;
    onToggleAutoSync: (enabled: boolean) => void;
    onResolveConflict: (input: {
        type: "chapter" | "memo";
        id: string;
        resolution: "local" | "remote";
    }) => Promise<void>;
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
    onResolveConflict,
}: SyncTabProps) {
    const [isResolving, setIsResolving] = useState(false);
    const showConnected = status.connected && status.health !== "disconnected";
    const isConnecting = status.mode === "connecting";
    const isDegraded = status.health === "degraded";
    const showReconnect = isDegraded || (!showConnected && (Boolean(status.lastError) || isConnecting));
    const showAuthAction = !showConnected || isDegraded;
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
    const healthLabel = status.health === "connected"
        ? t("settings.sync.health.connected", { defaultValue: "Connected" })
        : status.health === "degraded"
            ? t("settings.sync.health.degraded", { defaultValue: "Degraded" })
            : t("settings.sync.health.disconnected", { defaultValue: "Disconnected" });

    return (
        <div className="space-y-6 max-w-2xl content-visibility-auto contain-intrinsic-size-[1px_500px]">
            <section className="p-4 bg-surface rounded-xl border border-border">
                <h3 className="text-base font-semibold text-fg mb-2">{t("settings.sync.title")}</h3>
                <p className="text-sm text-muted mb-4">{t("settings.sync.description")}</p>

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div className="text-muted">{t("settings.sync.fields.connection")}</div>
                    <div className="text-fg font-medium">
                        {healthLabel}
                    </div>

                    <div className="text-muted">{t("settings.sync.fields.email")}</div>
                    <div className="text-fg font-medium">{status.email ?? "-"}</div>

                    <div className="text-muted">{t("settings.sync.fields.lastSyncedAt")}</div>
                    <div className="text-fg font-medium">
                        {status.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleString() : "-"}
                    </div>

                    <div className="text-muted">{t("settings.sync.fields.mode")}</div>
                    <div className="text-fg font-medium">{modeLabel}</div>

                    <div className="text-muted">{t("settings.sync.fields.lastRun", { defaultValue: "Last run" })}</div>
                    <div className="text-fg font-medium">
                        {status.lastRun
                            ? `${new Date(status.lastRun.at).toLocaleString()} · ↑${status.lastRun.pushed} ↓${status.lastRun.pulled} · C${status.lastRun.conflicts}`
                            : "-"}
                    </div>
                </div>

                {status.degradedReason && (
                    <div className="mb-4 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-fg">
                        {status.degradedReason}
                    </div>
                )}
                {status.lastError && (
                    <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger-fg">
                        {status.lastError}
                    </div>
                )}

                <div className="flex flex-wrap gap-3">
                    {showAuthAction ? (
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
                        disabled={isBusy || !status.connected}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${status.autoSync ? "bg-accent" : "bg-border"
                            } ${isBusy || !status.connected ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                        <span
                            className={`${status.autoSync ? "translate-x-6" : "translate-x-1"
                                } inline-block h-4 w-4 transform rounded-full bg-surface shadow-sm transition-transform`}
                        />
                    </button>
                </div>

                <div className="mt-4 flex items-center justify-between bg-warning/10 border border-warning/30 rounded-lg p-3">
                    <div className="text-sm text-warning-fg">
                        {t("settings.sync.conflicts", {
                            total: status.conflicts.total,
                            chapters: status.conflicts.chapters,
                            memos: status.conflicts.memos,
                        })}
                    </div>
                    {status.conflicts.total > 0 && (
                        <button
                            className="px-3 py-1.5 bg-warning hover:bg-warning/90 text-warning-fg text-xs font-semibold rounded-md shadow-sm transition-colors disabled:opacity-50"
                            onClick={() => setIsResolving(true)}
                            disabled={isBusy}
                        >
                            {t("settings.sync.actions.resolveConflicts", "Resolve Conflicts")}
                        </button>
                    )}
                </div>

                {isResolving && (
                    <SyncConflictResolverModal
                        conflicts={status.conflicts}
                        onClose={() => setIsResolving(false)}
                        onRefresh={onSyncNow}
                        onResolve={onResolveConflict}
                        isBusy={isBusy}
                    />
                )}
            </section>
        </div>
    );
});
