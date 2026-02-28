import { useEffect, useState } from "react";

/**
 * Hook that tracks online/offline status using the browser's Network Information API.
 * Uses `navigator.onLine` as the initial state and listens to online/offline events.
 */
export function useNetworkStatus(): { isOnline: boolean } {
    const [isOnline, setIsOnline] = useState(() => navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    return { isOnline };
}
