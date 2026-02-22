import { APP_NAME } from "@shared/constants";

interface WindowBarProps {
  title?: string;
}

export default function WindowBar({ title = APP_NAME }: WindowBarProps) {
  return (
    <div
      className="h-10 w-full flex items-center justify-center bg-transparent select-none relative z-50"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <span className="text-[13px] font-medium text-muted opacity-80">{title}</span>
    </div>
  );
}
