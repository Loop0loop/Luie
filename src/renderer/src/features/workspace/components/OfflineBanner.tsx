import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { WifiOff, X } from "lucide-react";

export function OfflineBanner() {
    const { t } = useTranslation();
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            setDismissed(false); // Reset dismissal on reconnect
        };
        const handleOffline = () => {
            setIsOffline(true);
            setDismissed(false);
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    if (!isOffline || dismissed) return null;

    return (
        <div className="w-full bg-warning/15 border-b border-warning/30 px-4 py-2 flex items-center justify-between shadow-sm relative z-[100] animate-in slide-in-from-top-2 fade-in">
            <div className="flex items-center gap-3">
                <div className="p-1.5 bg-warning/20 rounded-full text-warning-fg">
                    <WifiOff className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-fg">
                        {t("workspace.offline.title", "You are navigating offline")}
                    </span>
                    <span className="text-xs text-muted">
                        {t("workspace.offline.desc", "Changes will be saved locally and synced automatically when network connects.")}
                    </span>
                </div>
            </div>
            <button
                onClick={() => setDismissed(true)}
                className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-muted hover:text-fg"
                title={t("common.dismiss", "Dismiss")}
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
