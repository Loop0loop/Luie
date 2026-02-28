import { useTranslation } from "react-i18next";
import { AlertCircle, FileCheck, X } from "lucide-react";
import { useDataRecoveryStore } from "@renderer/features/workspace/stores/useDataRecoveryStore";
import { useEffect } from "react";
import { useToast } from "@shared/ui/ToastContext";

export default function DataRecoveryBanner() {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { hasRecovered, recoveryReason, dismissRecovery } = useDataRecoveryStore();

    useEffect(() => {
        if (hasRecovered) {
            showToast(t("project.toast.recoveredFromDb", "Project was successfully recovered from safety snapshot."), "info");
        }
    }, [hasRecovered, showToast, t]);

    if (!hasRecovered) return null;

    return (
        <div className="w-full bg-accent/15 border-b border-accent/20 px-4 py-3 flex items-center justify-between shadow-sm relative z-50">
            <div className="flex items-center gap-3">
                <div className="p-1.5 bg-accent/20 rounded-full">
                    {recoveryReason === "corrupt" ? (
                        <AlertCircle className="w-4 h-4 text-accent" />
                    ) : (
                        <FileCheck className="w-4 h-4 text-accent" />
                    )}
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-fg">
                        {t("workspace.recovery.bannerTitle", "Unsaved changes were recovered")}
                    </span>
                    <span className="text-xs text-muted">
                        {recoveryReason === "corrupt"
                            ? t("workspace.recovery.corruptDesc", "The original file was corrupted. Luie used the latest backup.")
                            : t("workspace.recovery.defaultDesc", "Luie safely restored your latest work after an unexpected exit.")}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={dismissRecovery}
                    className="text-xs font-medium px-3 py-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-fg"
                >
                    {t("workspace.recovery.dismiss", "Dismiss")}
                </button>
                <button
                    onClick={dismissRecovery}
                    className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-muted hover:text-fg"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
