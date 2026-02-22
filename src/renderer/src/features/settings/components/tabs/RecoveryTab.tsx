import { memo } from "react";
import type { TFunction } from "i18next";

interface RecoveryTabProps {
    t: TFunction;
    isRecovering: boolean;
    recoveryMessage: string | null;
    onRunRecovery: (dryRun: boolean) => void;
}

export const RecoveryTab = memo(function RecoveryTab({
    t,
    isRecovering,
    recoveryMessage,
    onRunRecovery,
}: RecoveryTabProps) {
    return (
        <div className="space-y-6 max-w-2xl content-visibility-auto contain-intrinsic-size-[1px_400px]">
            <section className="p-4 bg-surface rounded-xl border border-border">
                <h3 className="text-base font-semibold text-fg mb-2">{t("settings.recovery.title")}</h3>
                <p className="text-sm text-muted mb-4">{t("settings.recovery.description")}</p>
                <div className="flex gap-3">
                    <button
                        onClick={() => onRunRecovery(true)}
                        disabled={isRecovering}
                        className="px-4 py-2 bg-element hover:bg-element-hover border border-border rounded-lg text-sm font-medium text-fg transition-colors disabled:opacity-50"
                    >
                        {t("settings.recovery.dryRun")}
                    </button>
                    <button
                        onClick={() => onRunRecovery(false)}
                        disabled={isRecovering}
                        className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                    >
                        {isRecovering ? t("settings.recovery.running") : t("settings.recovery.run")}
                    </button>
                </div>
                {recoveryMessage && (
                    <div className="mt-4 p-3 bg-app rounded-md border border-border text-sm text-fg">{recoveryMessage}</div>
                )}
            </section>
        </div>
    );
});
