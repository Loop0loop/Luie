import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { WifiOff, X } from "lucide-react";

export function OfflineBanner() {
    const { t } = useTranslation();
    const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        let mounted = true;

        const handleOnline = () => {
            if (!mounted) return;
            setIsOffline(false);
            setDismissed(false);
        };
        const handleOffline = () => {
            if (!mounted) return;
            setIsOffline(true);
            setDismissed(false);
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            mounted = false;
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    if (!isOffline || dismissed) return null;

    // NOTE: 상단 전체 폭 배너에서 좌하단 팝업으로 바꿨다. 배너는 레이아웃을 밀어 집필
    // 화면을 흔들고, 존재를 색으로 알리려면 표면 전체를 물들여야 한다.
    //
    // 결정: 이 팝업은 의미색(semantic color)을 쓰지 않고 **theme 표면 token만** 쓴다.
    // 되돌리기 전에 아래 근거를 확인할 것.
    // 1. amber(`--warning-fg`)를 썼더니 light와 sepia 값이 둘 다 갈색 계열이어서,
    //    theme을 바꿔도 계속 "sepia 톤"으로 읽혔다. 의미색이 theme 구분을 전달하지
    //    못하면 의미색을 쓸 이유가 없다.
    // 2. 차가운 색(slate 등)으로 구분을 만드는 방향은 이 제품의 기존 결정과 반대다.
    //    sepia에서 `--editor-selection`을 파란색에서 brass로 바꾼 이력이 있다
    //    (global.tokens.css, "선택 영역만 파랗게 떴다"). 종이 theme에 차가운 색을
    //    넣으려면 "이건 종이가 아니라 시스템 chrome이다"라는 별도 근거가 필요하다.
    // 3. 오프라인은 경고가 아니라 상태다. 의미는 `WifiOff` 아이콘과 문구가 전달하므로
    //    색이 없어도 정보가 손실되지 않는다(색만으로 상태를 전달하지 않는다는 규칙과도
    //    같은 방향).
    // 그래서 컨테이너는 부유 표면 `bg-panel`, 아이콘 칩은 파인 면 `bg-element`,
    // 글자는 `text-fg`/`text-muted`를 쓴다. 세 theme 어디서도 톤이 어긋날 여지가 없다.
    //
    // 위치가 좌하단인 이유: 우하단은 UpdaterNotification(bottom-4)·
    // FloatingAnalysisPanel(bottom-6)·AnalysisSection(bottom-24)이 이미 점유해 겹친다.
    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed bottom-4 left-4 z-toast w-90 max-w-[calc(100vw-2rem)] overflow-hidden rounded-panel border border-border bg-panel shadow-panel"
        >
            <div className="flex items-start gap-3 p-3.5">
                <div className="shrink-0 rounded-full bg-element p-1.5 text-muted">
                    <WifiOff className="h-4 w-4" />
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-semibold text-fg">
                        {t("workspace.offline.title", "You are navigating offline")}
                    </span>
                    <span className="text-xs text-muted">
                        {t("workspace.offline.desc", "Changes will be saved locally and synced automatically when network connects.")}
                    </span>
                </div>
                <button
                    onClick={() => setDismissed(true)}
                    className="shrink-0 rounded-control p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t("common.dismiss", "Dismiss")}
                    title={t("common.dismiss", "Dismiss")}
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
