import { useEffect, useState } from "react";
import { APP_NAME } from "../../../../shared/constants";

interface WindowBarProps {
  title?: string;
}

export default function WindowBar({ title = APP_NAME }: WindowBarProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const isMacOS = navigator.platform.toLowerCase().includes("mac");
    if (!isMacOS) return;

    void (async () => {
      const response = await window.api.settings.getTitleBarMode();
      if (!response.success || !response.data) return;
      const mode = (response.data as { mode?: "hidden" | "visible" }).mode;
      setIsVisible(mode !== "visible");
    })();
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="h-10 w-full flex items-center justify-center bg-transparent select-none relative z-50"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <span className="text-[13px] font-medium text-muted opacity-80">{title}</span>
    </div>
  );
}
