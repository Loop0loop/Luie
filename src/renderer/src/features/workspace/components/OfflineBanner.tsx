import { useTranslation } from "react-i18next";
import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@renderer/features/workspace/hooks/useNetworkStatus";

/**
 * Global offline indicator banner.
 * Renders a thin top bar when the user has no internet connectivity.
 * Informs the user that sync and AI features are paused — no silent degradation.
 */
export default function OfflineBanner() {
    const { t } = useTranslation();
    const { isOnline } = useNetworkStatus();

    if (isOnline) return null;

    return (
        <div
            role="alert"
            aria-live="polite"
            className="w-full bg-warning/15 border-b border-warning/25 px-4 py-2 flex items-center gap-2.5 z-50"
        >
            <WifiOff className="w-3.5 h-3.5 text-warning shrink-0" />
            <span className="text-xs font-medium text-warning-fg">
                {t("workspace.offline.banner", "인터넷 연결 없음 — 동기화 및 AI 기능이 일시 중단됩니다.")}
            </span>
        </div>
    );
}
